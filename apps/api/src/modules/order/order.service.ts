import { Inject, Injectable } from "@nestjs/common";
import { conflict, type Database, type Logger, notFound, type Sql, TOKENS } from "@nobar/common";
import { type AddressDto, type CheckoutDto, type OrderDto, uuidv7 } from "@nobar/contracts";
import { CITIES } from "@nobar/contracts/cities";
import { CartService, type CartGroupView, type CartView } from "../cart/cart.service";
import { CatalogService } from "../catalog/catalog.service";
import { UsersService } from "../identity/users.service";

const RESERVATION_TTL_MINUTES = 10;
type StoredOrder = Omit<OrderDto, "address"> & { address: AddressDto };
type CheckoutResponse = Omit<CheckoutDto, "orders"> & { orders: StoredOrder[] };

const isoNow = () => new Date().toISOString();

/** Checkout reservation boundary. Payment confirmation is deliberately a separate next step. */
@Injectable()
export class OrderService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(CartService) private readonly cart: CartService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {}

  async releaseExpired(): Promise<void> {
    await this.db.tx(async (sql) => {
      await sql.query("update ordering.stock_reservations set released_at = now() where released_at is null and expires_at <= now()", []);
      await sql.query("update ordering.checkouts set status = 'FAILED', updated_at = now() where status = 'PENDING_PAYMENT' and expires_at <= now()", []);
    });
  }

  private baseUnits(pkg: { netGrams?: number; units?: number }): number {
    return pkg.netGrams ?? pkg.units ?? 1;
  }

  private async reserveGroup(sql: Sql, checkoutId: string, userId: string, address: AddressDto, paymentMethod: "GATEWAY" | "COD", group: CartGroupView, expiresAt: string): Promise<StoredOrder> {
    const orderId = uuidv7();
    const createdAt = isoNow();
    const delivery = group.options[0];
    if (!delivery) throw conflict("CART_NOT_DELIVERABLE", "یکی از غرفه‌ها برای این شهر قابل ارسال نیست");
    const market = await this.catalog.market();
    const items = group.lines.map((line) => ({
      productId: line.listing.id,
      name: line.listing.title,
      emoji: market.typeById(line.listing.produceTypeId)?.emoji ?? "",
      unit: market.typeById(line.listing.produceTypeId)?.unitKind === "BUNCH" ? "BUNDLE" as const : market.typeById(line.listing.produceTypeId)?.unitKind === "COUNT" ? "PIECE" as const : "KG" as const,
      qty: line.qty,
      unitPriceRial: line.pkg.priceRial,
      lineTotalRial: line.pkg.priceRial * line.qty,
    }));
    await sql.query(
      `insert into ordering.orders (id, checkout_id, user_id, shop_id, status, payment_method, address, items_total_rial, delivery_fee_rial, total_rial)
       values ($1, $2, $3, $4, 'PENDING_PAYMENT', $5, $6, $7, $8, $9)`,
      [orderId, checkoutId, userId, group.shop.id, paymentMethod, JSON.stringify(address), group.itemsRial, delivery.costRial, group.itemsRial + delivery.costRial],
    );
    for (const line of group.lines) {
      const requiredBase = this.baseUnits(line.pkg) * line.qty;
      const [listing] = await sql.query<{ stock_base: number; status: string }>("select stock_base, status from catalog.listings where id = $1 for update", [line.listing.id]);
      if (!listing || listing.status !== "PUBLISHED") throw conflict("OUT_OF_STOCK", "یکی از محصولات دیگر موجود نیست");
      const [reserved] = await sql.query<{ quantity: number }>(
        "select coalesce(sum(quantity_base), 0)::int as quantity from ordering.stock_reservations where listing_id = $1 and released_at is null and expires_at > now()",
        [line.listing.id],
      );
      if (Number(listing.stock_base) - Number(reserved?.quantity ?? 0) < requiredBase) throw conflict("INSUFFICIENT_STOCK", `موجودی «${line.listing.title}» برای این تعداد کافی نیست`);
      await sql.query(
        "insert into ordering.stock_reservations (id, checkout_id, listing_id, package_id, quantity_base, qty_packages, expires_at) values ($1, $2, $3, $4, $5, $6, $7)",
        [uuidv7(), checkoutId, line.listing.id, line.pkg.id, requiredBase, line.qty, expiresAt],
      );
      await sql.query(
        "insert into ordering.order_items (id, order_id, listing_id, package_id, name_snapshot, package_label_snapshot, qty, unit_price_rial, line_total_rial) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [uuidv7(), orderId, line.listing.id, line.pkg.id, line.listing.title, line.pkg.label, line.qty, line.pkg.priceRial, line.pkg.priceRial * line.qty],
      );
    }
    return {
      id: orderId,
      checkoutId,
      buyerId: userId,
      sellerId: group.shop.id,
      sellerName: group.shop.name,
      cityId: address.cityId,
      status: "PENDING_PAYMENT",
      paymentMethod,
      itemsTotalRial: group.itemsRial,
      deliveryFeeRial: delivery.costRial,
      totalRial: group.itemsRial + delivery.costRial,
      address,
      items,
      timeline: [{ status: "PENDING_PAYMENT", at: createdAt, note: "موجودی برای تکمیل پرداخت رزرو شد" }],
      sellerAcceptDeadline: null,
      cancelReason: null,
      createdAt,
      updatedAt: createdAt,
    };
  }

  async create(userId: string, addressId: string, paymentMethod: "GATEWAY" | "COD"): Promise<CheckoutResponse> {
    await this.releaseExpired();
    const address = await this.users.address(userId, addressId);
    const city = CITIES.find((item) => item.id === address.cityId);
    if (!city?.destination) throw conflict("CITY_NOT_AVAILABLE", "این شهر فعلاً مقصد ارسال نیست");
    const cart = await this.cart.get(userId, address.cityId);
    if (!cart.groups.length) throw conflict("CART_EMPTY", "سبد خرید خالی است");
    if (cart.hasIssues) throw conflict("CART_CHANGED", "موجودی یا امکان ارسال یکی از اقلام تغییر کرده است؛ سبد را دوباره بررسی کنید");
    const checkoutId = uuidv7();
    const createdAt = isoNow();
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000).toISOString();
    const response = await this.db.tx(async (sql) => {
      const orders: StoredOrder[] = [];
      await sql.query(
        `insert into ordering.checkouts (id, user_id, payment_method, status, address, total_rial, expires_at)
         values ($1, $2, $3, 'PENDING_PAYMENT', $4, 0, $5)`,
        [checkoutId, userId, paymentMethod, JSON.stringify(address), expiresAt],
      );
      for (const group of cart.groups) orders.push(await this.reserveGroup(sql, checkoutId, userId, address, paymentMethod, group, expiresAt));
      const totalRial = orders.reduce((sum, order) => sum + order.totalRial, 0);
      const result: CheckoutResponse = { id: checkoutId, status: "PENDING_PAYMENT", paymentMethod, totalRial, orders, redirectUrl: null, createdAt };
      await sql.query("update ordering.checkouts set total_rial = $2, response = $3, updated_at = now() where id = $1", [checkoutId, totalRial, JSON.stringify(result)]);
      await sql.query("delete from ordering.cart_items where user_id = $1", [userId]);
      await sql.query("update ordering.carts set updated_at = now() where user_id = $1", [userId]);
      return result;
    });
    this.log.info({ userId, checkoutId, totalRial: response.totalRial }, "checkout created with stock reservations");
    return response;
  }

  async get(userId: string, id: string): Promise<CheckoutResponse> {
    await this.releaseExpired();
    const [row] = await this.db.query<{ status: CheckoutResponse["status"]; response: CheckoutResponse | null }>("select status, response from ordering.checkouts where id = $1 and user_id = $2", [id, userId]);
    if (!row?.response) throw notFound("checkout");
    return { ...row.response, status: row.status };
  }
}
