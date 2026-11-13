import { Inject, Injectable } from "@nestjs/common";
import { conflict, currentTraceparent, type Database, enqueueEvent, iso, type Logger, notFound, type Sql, TOKENS, unprocessable } from "@nobar/common";
import { type AddressDto, type CheckoutDto, isUuid, makeEvent, type OrderDto, uuidv7 } from "@nobar/contracts";
import { CITIES } from "@nobar/contracts/cities";
import type { ShippingMethodCode } from "@nobar/domain";
import { CartService, type CartGroupView } from "../cart/cart.service";
import { CatalogService } from "../catalog/catalog.service";
import { UsersService } from "../identity/users.service";
import { commissionOf, PaymentService } from "../payment/payment.service";
import { loadOrders, recordEvent } from "./order.views";

const RESERVATION_TTL_MINUTES = 10;

type CheckoutRow = { id: string; user_id: string; status: CheckoutDto["status"]; payment_method: CheckoutDto["paymentMethod"]; total_rial: number; expires_at: Date; created_at: Date };

const baseUnits = (pkg: { netGrams?: number; units?: number }): number => pkg.netGrams ?? pkg.units ?? 1;
/** short human code shown to buyers and sellers (the id stays the key) */
const orderCode = (id: string) => `NB${id.replace(/-/g, "").slice(20, 28).toUpperCase()}`;

export function orderEvent(type: "order.placed" | "order.accepted" | "order.status_changed" | "order.cancelled" | "order.delivered", o: OrderDto, previous: OrderDto["status"] | null, extra: { reason?: string; cancelledBy?: "BUYER" | "SELLER" | "SYSTEM" } = {}) {
  const traceparent = currentTraceparent();
  return makeEvent(type, {
    source: "api/order",
    subject: o.id,
    cityId: o.address.cityId,
    ...(traceparent ? { traceparent } : {}),
    data: {
      orderId: o.id,
      checkoutId: o.checkoutId,
      buyerId: o.buyerId,
      sellerId: o.shopId,
      cityId: o.address.cityId,
      status: o.status,
      previousStatus: previous,
      paymentMethod: o.paymentMethod,
      itemsTotalRial: o.itemsTotalRial,
      deliveryFeeRial: o.deliveryFeeRial,
      totalRial: o.totalRial,
      items: o.items.map((i) => ({ listingId: i.listingId, packageId: i.packageId, qty: i.qty })),
      ...extra,
    },
  });
}

/**
 * Checkout: reserve stock per shop order, pay through the gateway, and on a verified payment turn
 * the reservations into sold stock and the shop orders into "awaiting acceptance" — one transaction.
 */
@Injectable()
export class OrderService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(CartService) private readonly cart: CartService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {}

  /** Order views for any condition on `o` (shared with the fulfilment service). */
  async orders(sql: Sql, where: string, params: unknown[]): Promise<OrderDto[]> {
    const market = await this.catalog.market({ stale: true });
    return loadOrders(sql, where, params, (id) => market.shopById(id)?.name ?? id);
  }

  async releaseExpired(): Promise<void> {
    await this.db.tx(async (sql) => {
      await sql.query("update ordering.stock_reservations set released_at = now() where released_at is null and expires_at <= now()", []);
      const expired = await sql.query<{ id: string }>(
        "update ordering.checkouts set status = 'FAILED', updated_at = now() where status = 'PENDING_PAYMENT' and expires_at <= now() returning id",
        [],
      );
      if (!expired.length) return;
      const orders = await sql.query<{ id: string }>(
        "update ordering.orders set status = 'CANCELLED', cancel_reason = 'پرداخت در مهلت انجام نشد', updated_at = now() where checkout_id = any($1::uuid[]) and status = 'PENDING_PAYMENT' returning id",
        [expired.map((c) => c.id)],
      );
      for (const o of orders) await recordEvent(sql, o.id, "CANCELLED", "SYSTEM", "پرداخت در مهلت انجام نشد");
    });
  }

  private async reserveGroup(sql: Sql, checkoutId: string, userId: string, address: AddressDto, paymentMethod: "GATEWAY" | "COD", group: CartGroupView, expiresAt: string, method: ShippingMethodCode | undefined) {
    const orderId = uuidv7();
    if (!group.options.length) throw conflict("CART_NOT_DELIVERABLE", "یکی از غرفه‌ها برای این شهر قابل ارسال نیست");
    // the buyer picks a method per shop on the checkout page; without a choice the cheapest one is used
    const delivery = method ? group.options.find((o) => o.method === method) : group.options[0];
    if (!delivery) throw conflict("SHIPPING_METHOD_UNAVAILABLE", `روش ارسال انتخاب‌شده برای «${group.shop.name}» در دسترس نیست`);
    await sql.query(
      `insert into ordering.orders (id, code, checkout_id, user_id, shop_id, status, payment_method, shipping_method, eta_to, address, items_total_rial, delivery_fee_rial, total_rial)
       values ($1, $2, $3, $4, $5, 'PENDING_PAYMENT', $6, $7, $8, $9, $10, $11, $12)`,
      [orderId, orderCode(orderId), checkoutId, userId, group.shop.id, paymentMethod, delivery.method, delivery.etaTo, JSON.stringify(address), group.itemsRial, delivery.costRial, group.itemsRial + delivery.costRial],
    );
    await recordEvent(sql, orderId, "PENDING_PAYMENT", "BUYER", "موجودی برای تکمیل پرداخت رزرو شد");
    for (const line of group.lines) {
      const requiredBase = baseUnits(line.pkg) * line.qty;
      const listing = await this.catalog.lockStock(sql, line.listing.id);
      if (!listing || listing.status !== "PUBLISHED") throw conflict("OUT_OF_STOCK", "یکی از محصولات دیگر موجود نیست");
      const [reserved] = await sql.query<{ quantity: number }>(
        "select coalesce(sum(quantity_base), 0)::int as quantity from ordering.stock_reservations where listing_id = $1 and released_at is null and expires_at > now()",
        [line.listing.id],
      );
      if (listing.stockBase - Number(reserved?.quantity ?? 0) < requiredBase) throw conflict("INSUFFICIENT_STOCK", `موجودی «${line.listing.title}» برای این تعداد کافی نیست`);
      await sql.query(
        "insert into ordering.stock_reservations (id, checkout_id, listing_id, package_id, quantity_base, qty_packages, expires_at) values ($1, $2, $3, $4, $5, $6, $7)",
        [uuidv7(), checkoutId, line.listing.id, line.pkg.id, requiredBase, line.qty, expiresAt],
      );
      await sql.query(
        "insert into ordering.order_items (id, order_id, listing_id, package_id, name_snapshot, package_label_snapshot, qty, unit_price_rial, line_total_rial) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [uuidv7(), orderId, line.listing.id, line.pkg.id, line.listing.title, line.pkg.label, line.qty, line.pkg.priceRial, line.pkg.priceRial * line.qty],
      );
    }
  }

  private async view(sql: Sql, c: CheckoutRow, redirectUrl: string | null = null): Promise<CheckoutDto> {
    return {
      id: c.id,
      status: c.status,
      paymentMethod: c.payment_method,
      totalRial: Number(c.total_rial),
      orders: await this.orders(sql, "o.checkout_id = $1", [c.id]),
      redirectUrl,
      expiresAt: iso(c.expires_at),
      createdAt: iso(c.created_at),
    };
  }

  async create(userId: string, addressId: string, paymentMethod: "GATEWAY" | "COD", shipping: Record<string, ShippingMethodCode> = {}): Promise<CheckoutDto> {
    // the kit's MVP pays through the gateway into escrow; cash on delivery has no rules yet (docs/domain.md Q7)
    if (paymentMethod === "COD") throw unprocessable("COD_NOT_AVAILABLE", "پرداخت در محل فعلاً فعال نیست؛ از درگاه پرداخت استفاده کنید");
    await this.releaseExpired();
    const address = await this.users.address(userId, addressId);
    const city = CITIES.find((item) => item.id === address.cityId);
    if (!city?.destination) throw conflict("CITY_NOT_AVAILABLE", "این شهر فعلاً مقصد ارسال نیست");
    const cart = await this.cart.get(userId, address.cityId);
    if (!cart.groups.length) throw conflict("CART_EMPTY", "سبد خرید خالی است");
    if (cart.hasIssues) throw conflict("CART_CHANGED", "موجودی یا امکان ارسال یکی از اقلام تغییر کرده است؛ سبد را دوباره بررسی کنید");
    const checkoutId = uuidv7();
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000).toISOString();
    await this.catalog.market();
    const result = await this.db.tx(async (sql) => {
      await sql.query(
        `insert into ordering.checkouts (id, user_id, payment_method, status, address, total_rial, expires_at)
         values ($1, $2, $3, 'PENDING_PAYMENT', $4, 0, $5)`,
        [checkoutId, userId, paymentMethod, JSON.stringify(address), expiresAt],
      );
      for (const group of cart.groups) await this.reserveGroup(sql, checkoutId, userId, address, paymentMethod, group, expiresAt, shipping[group.shop.id]);
      const [c] = await sql.query<CheckoutRow>(
        `update ordering.checkouts set total_rial = (select coalesce(sum(total_rial), 0) from ordering.orders where checkout_id = $1), updated_at = now()
         where id = $1 returning id, user_id, status, payment_method, total_rial, expires_at, created_at`,
        [checkoutId],
      );
      await sql.query("delete from ordering.cart_items where user_id = $1", [userId]);
      await sql.query("update ordering.carts set updated_at = now() where user_id = $1", [userId]);
      return this.view(sql, c!);
    });
    this.log.info({ checkoutId, totalRial: result.totalRial }, "checkout created with stock reservations");
    return result;
  }

  async get(userId: string, id: string): Promise<CheckoutDto> {
    if (!isUuid(id)) throw notFound("پرداخت");
    await this.releaseExpired();
    const [c] = await this.db.query<CheckoutRow>("select id, user_id, status, payment_method, total_rial, expires_at, created_at from ordering.checkouts where id = $1 and user_id = $2", [id, userId]);
    if (!c) throw notFound("پرداخت");
    return this.view(this.db, c);
  }

  /** Starts a gateway payment for an unpaid checkout; returns where to send the buyer. */
  async pay(userId: string, id: string): Promise<{ checkoutId: string; redirectUrl: string }> {
    if (!isUuid(id)) throw notFound("پرداخت");
    await this.releaseExpired();
    return this.db.tx(async (sql) => {
      const [c] = await sql.query<CheckoutRow>("select id, user_id, status, payment_method, total_rial, expires_at, created_at from ordering.checkouts where id = $1 and user_id = $2 for update", [id, userId]);
      if (!c) throw notFound("پرداخت");
      if (c.status !== "PENDING_PAYMENT") throw conflict("CHECKOUT_CLOSED", c.status === "PAID" ? "این سفارش قبلاً پرداخت شده است" : "مهلت پرداخت این سفارش تمام شده است؛ دوباره ثبت کنید");
      const started = await this.payments.start(sql, { checkoutId: c.id, userId, amountRial: Number(c.total_rial) });
      await sql.query("update ordering.checkouts set payment_id = $2, updated_at = now() where id = $1", [c.id, started.paymentId]);
      return { checkoutId: c.id, redirectUrl: started.redirectUrl };
    });
  }

  /**
   * Gateway callback. Duplicate callbacks are harmless (the payment settles once). A payment that
   * arrives after the checkout closed is credited to the buyer's wallet instead of being lost.
   */
  async confirmPayment(authority: string, callbackStatus: string): Promise<{ checkoutId: string; paid: boolean } | null> {
    await this.catalog.market();
    const outcome = await this.db.tx(async (sql) => {
      const settled = await this.payments.settle(sql, authority, callbackStatus);
      if (!settled) return null;
      if (settled.outcome !== "SUCCEEDED") return { checkoutId: settled.checkoutId, paid: settled.outcome === "ALREADY_SUCCEEDED" };
      const [c] = await sql.query<CheckoutRow>("select id, user_id, status, payment_method, total_rial, expires_at, created_at from ordering.checkouts where id = $1 for update", [settled.checkoutId]);
      const reservations = await sql.query<{ listing_id: string; quantity_base: number }>(
        "select listing_id, quantity_base from ordering.stock_reservations where checkout_id = $1 and released_at is null and expires_at > now()",
        [settled.checkoutId],
      );
      const [{ n: expected } = { n: 0 }] = await sql.query<{ n: number }>("select count(*)::int as n from ordering.stock_reservations where checkout_id = $1", [settled.checkoutId]);
      let usable = !!c && c.status === "PENDING_PAYMENT" && new Date(c.expires_at) > new Date() && reservations.length === expected && Number(c.total_rial) === settled.amountRial;
      if (usable) {
        for (const r of reservations) {
          const stock = await this.catalog.lockStock(sql, r.listing_id);
          if (!stock || stock.stockBase < Number(r.quantity_base)) usable = false;
        }
      }
      if (!usable) {
        await this.payments.creditWalletFromEscrow(sql, settled.userId, settled.amountRial, "بازگشت پرداخت سفارشی که دیگر قابل انجام نبود", `checkout:${settled.checkoutId}`);
        this.log.warn({ checkoutId: settled.checkoutId }, "payment arrived for a closed checkout; credited to the wallet");
        return { checkoutId: settled.checkoutId, paid: false };
      }
      for (const r of reservations) await this.catalog.takeStock(sql, r.listing_id, Number(r.quantity_base));
      await sql.query("update ordering.stock_reservations set released_at = now() where checkout_id = $1 and released_at is null", [settled.checkoutId]);
      await sql.query("update ordering.checkouts set status = 'PAID', payment_id = $2, updated_at = now() where id = $1", [settled.checkoutId, settled.paymentId]);
      await this.placeOrders(sql, settled.checkoutId);
      await enqueueEvent(
        sql,
        makeEvent("payment.succeeded", {
          source: "api/order",
          subject: settled.checkoutId,
          data: { paymentId: settled.paymentId, checkoutId: settled.checkoutId, buyerId: settled.userId, method: "GATEWAY", amountRial: settled.amountRial },
        }),
      );
      return { checkoutId: settled.checkoutId, paid: true };
    });
    this.catalog.invalidate();
    return outcome;
  }

  /** Paid: each shop order now waits for its seller, with commission and deadlines fixed from today's rules. */
  private async placeOrders(sql: Sql, checkoutId: string): Promise<void> {
    const market = await this.catalog.market({ stale: true });
    const orders = await sql.query<{ id: string; shop_id: string }>("select id, shop_id from ordering.orders where checkout_id = $1 and status = 'PENDING_PAYMENT'", [checkoutId]);
    for (const o of orders) {
      const shop = market.shopById(o.shop_id);
      const items = await sql.query<{ listing_id: string; line_total_rial: number }>("select listing_id, line_total_rial from ordering.order_items where order_id = $1", [o.id]);
      let commission = 0;
      let windowHours = 0;
      for (const i of items) {
        const type = market.typeById(market.listingById(i.listing_id)?.produceTypeId ?? "");
        commission += commissionOf(Number(i.line_total_rial), await this.payments.commissionBps(sql, o.shop_id, type?.categoryId ?? ""));
        windowHours = Math.max(windowHours, type?.complaintWindowHours ?? 24);
      }
      const slaHours = shop?.acceptanceSlaHours ?? 24;
      await sql.query(
        `update ordering.orders set status = 'AWAITING_ACCEPTANCE', commission_rial = $2, complaint_window_hours = $3,
           accept_deadline = now() + make_interval(hours => $4), version = version + 1, updated_at = now() where id = $1`,
        [o.id, commission, windowHours, slaHours],
      );
      await recordEvent(sql, o.id, "AWAITING_ACCEPTANCE", "SYSTEM", "پرداخت انجام شد؛ منتظر تأیید غرفه");
      const [view] = await this.orders(sql, "o.id = $1", [o.id]);
      await enqueueEvent(sql, orderEvent("order.placed", view!, "PENDING_PAYMENT"));
    }
  }
}
