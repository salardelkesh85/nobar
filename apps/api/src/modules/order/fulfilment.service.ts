import { Inject, Injectable } from "@nestjs/common";
import { badRequest, conflict, type Database, enqueueEvent, type Logger, notFound, type Sql, TOKENS } from "@nobar/common";
import { isUuid, makeEvent, type OrderDto, type OrderStatus, uuidv7 } from "@nobar/contracts";
import { CatalogService } from "../catalog/catalog.service";
import { PaymentService } from "../payment/payment.service";
import { orderEvent, OrderService } from "./order.service";
import { recordEvent } from "./order.views";

type Actor = "BUYER" | "SELLER" | "ADMIN" | "SYSTEM";
interface Row {
  id: string;
  checkout_id: string;
  user_id: string;
  shop_id: string;
  status: OrderStatus;
  shipping_method: string | null;
  items_total_rial: number;
  total_rial: number;
  commission_rial: number | null;
  refunded_rial: number;
  complaint_window_hours: number | null;
  accept_deadline: Date | null;
  complaint_ends_at: Date | null;
}
type Who = { role: "BUYER"; userId: string } | { role: "SELLER"; userId: string } | { role: "ADMIN" } | { role: "SYSTEM" };

const STATE_FA = "این سفارش در این وضعیت نیست و این کار انجام نمی‌شود";

/** Commission on what the seller keeps: proportional to the items not refunded (half-up). */
export function finalCommission(commissionRial: number, itemsRial: number, refundedRial: number): number {
  if (refundedRial <= 0 || itemsRial <= 0) return commissionRial;
  const kept = Math.max(0, itemsRial - refundedRial);
  return Math.floor((commissionRial * kept + Math.floor(itemsRial / 2)) / itemsRial);
}

/**
 * Shop-order lifecycle after payment (kit docs/02): acceptance, shipping, delivery, the complaint
 * window, disputes and settlement. Every change is status-guarded, writes a timeline row and an
 * outbox event, and moves money only through the payment module — all in one transaction.
 */
/** risk signals: at least this many orders in the window before a share means anything */
const RISK = { minOrders: 5, unfilledShare: 0.3, disputeShare: 0.2, refundShare: 0.15 };

@Injectable()
export class FulfilmentService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(OrderService) private readonly checkout: OrderService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {}

  // ---------- reads (object-level scoping)

  async buyerOrders(userId: string): Promise<OrderDto[]> {
    return this.checkout.orders(this.db, "o.user_id = $1 and o.status <> 'PENDING_PAYMENT'", [userId]);
  }

  async buyerOrder(userId: string, idOrCode: string): Promise<OrderDto> {
    const [o] = await this.checkout.orders(this.db, `o.user_id = $1 and ${isUuid(idOrCode) ? "o.id = $2::uuid" : "o.code = $2"}`, [userId, idOrCode]);
    if (!o) throw notFound("سفارش");
    return o;
  }

  async sellerShops(userId: string): Promise<string[]> {
    return this.catalog.shopIdsOwnedBy(userId);
  }

  async sellerOrders(userId: string, status?: OrderStatus): Promise<OrderDto[]> {
    const shops = await this.sellerShops(userId);
    if (!shops.length) return [];
    return this.checkout.orders(this.db, `o.shop_id = any($1::text[]) and o.status <> 'PENDING_PAYMENT'${status ? " and o.status = $2" : ""}`, status ? [shops, status] : [shops]);
  }

  async adminOrders(status?: OrderStatus): Promise<OrderDto[]> {
    return this.checkout.orders(this.db, status ? "o.status = $1" : "o.status <> 'PENDING_PAYMENT'", status ? [status] : []);
  }

  /**
   * Staff view: shops whose recent orders show a pattern worth a look. Each signal is a plain rule with
   * its reason in words; nothing is done automatically — suspending a shop stays a staff decision.
   * The thresholds are starting values to tune with real data.
   */
  async shopRisk(days = 90) {
    const rows = await this.db.query<{ shop_id: string; orders: number; rejected: number; expired: number; disputed: number; refunded_rial: number; paid_rial: number }>(
      `select o.shop_id,
              count(*)::int as orders,
              count(*) filter (where o.status = 'REJECTED')::int as rejected,
              count(*) filter (where o.status = 'EXPIRED')::int as expired,
              count(d.id)::int as disputed,
              coalesce(sum(o.refunded_rial) filter (where d.id is not null), 0)::bigint as refunded_rial,
              coalesce(sum(o.total_rial), 0)::bigint as paid_rial
       from ordering.orders o left join ordering.disputes d on d.order_id = o.id
       where o.status <> 'PENDING_PAYMENT' and o.created_at > now() - make_interval(days => $1)
       group by o.shop_id`,
      [days],
    );
    const m = await this.catalog.market();
    const fa = (n: number) => n.toLocaleString("fa-IR");
    const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
    return rows
      .map((r) => {
        const reasons: string[] = [];
        let score = 0;
        const unfilled = r.rejected + r.expired;
        if (r.orders >= RISK.minOrders && unfilled / r.orders >= RISK.unfilledShare) {
          score += 40;
          reasons.push(`${fa(pct(unfilled, r.orders))}٪ سفارش‌ها رد شده یا بی‌پاسخ مانده (${fa(unfilled)} از ${fa(r.orders)})`);
        }
        if (r.orders >= RISK.minOrders && r.disputed / r.orders >= RISK.disputeShare) {
          score += 40;
          reasons.push(`برای ${fa(pct(r.disputed, r.orders))}٪ سفارش‌ها شکایت ثبت شده (${fa(r.disputed)} از ${fa(r.orders)})`);
        }
        if (Number(r.paid_rial) > 0 && Number(r.refunded_rial) / Number(r.paid_rial) >= RISK.refundShare) {
          score += 20;
          reasons.push(`${fa(pct(Number(r.refunded_rial), Number(r.paid_rial)))}٪ مبلغ سفارش‌ها پس از شکایت برگشت خورده`);
        }
        return { shopId: r.shop_id, shopName: m.shopById(r.shop_id)?.name ?? r.shop_id, windowDays: days, orders: r.orders, rejected: r.rejected, expired: r.expired, disputed: r.disputed, refundedRial: Number(r.refunded_rial), score, reasons };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId));
  }

  // ---------- helpers

  private async lock(sql: Sql, id: string, who: Who): Promise<Row> {
    if (!isUuid(id)) throw notFound("سفارش");
    const [o] = await sql.query<Row>("select * from ordering.orders where id = $1 for update", [id]);
    if (!o) throw notFound("سفارش");
    if (who.role === "BUYER" && o.user_id !== who.userId) throw notFound("سفارش");
    if (who.role === "SELLER" && !(await this.catalog.shopIdsOwnedBy(who.userId, sql)).includes(o.shop_id)) throw notFound("سفارش");
    return o;
  }

  private ensure(o: Row, ...allowed: OrderStatus[]): void {
    if (!allowed.includes(o.status)) throw conflict("ORDER_STATE", STATE_FA, { status: o.status });
  }

  private async move(sql: Sql, o: Row, to: OrderStatus, actor: Actor, note: string | null, set = "", params: unknown[] = []): Promise<OrderDto> {
    const rows = await sql.query(
      `update ordering.orders set status = $2, version = version + 1, updated_at = now()${set ? `, ${set}` : ""} where id = $1 and status = $3 returning id`,
      [o.id, to, o.status, ...params],
    );
    if (!rows.length) throw conflict("ORDER_STATE", STATE_FA);
    await recordEvent(sql, o.id, to, actor, note);
    const [view] = await this.checkout.orders(sql, "o.id = $1", [o.id]);
    const type = to === "ACCEPTED" ? "order.accepted" : to === "DELIVERED" ? "order.delivered" : ["CANCELLED", "REJECTED", "EXPIRED"].includes(to) ? "order.cancelled" : "order.status_changed";
    const cancelledBy = actor === "BUYER" ? "BUYER" : actor === "SELLER" ? "SELLER" : "SYSTEM";
    await enqueueEvent(sql, orderEvent(type, view!, o.status, type === "order.cancelled" ? { cancelledBy, ...(note ? { reason: note } : {}) } : {}));
    return view!;
  }

  /** Buyer's money back to their wallet (from escrow). */
  private async refund(sql: Sql, o: Row, amountRial: number, reason: string): Promise<void> {
    if (amountRial <= 0) return;
    if (amountRial > Number(o.total_rial) - Number(o.refunded_rial)) throw badRequest("REFUND_TOO_LARGE", "مبلغ بازپرداخت از مبلغ باقی‌مانده‌ی سفارش بیشتر است");
    await this.payments.creditWalletFromEscrow(sql, o.user_id, amountRial, `بازپرداخت سفارش: ${reason}`, `order:${o.id}`);
    await sql.query("update ordering.orders set refunded_rial = refunded_rial + $2 where id = $1", [o.id, amountRial]);
    o.refunded_rial = Number(o.refunded_rial) + amountRial;
    const [c] = await sql.query<{ payment_id: string | null }>("select payment_id from ordering.checkouts where id = $1", [o.checkout_id]);
    await enqueueEvent(sql, makeEvent("payment.refunded", { source: "api/order", subject: o.id, data: { refundId: uuidv7(), paymentId: c?.payment_id ?? "", orderId: o.id, amountRial, reason } }));
  }

  /** Not shipped after all: the sold quantity goes back on sale. */
  private async restock(sql: Sql, o: Row): Promise<void> {
    const rows = await sql.query<{ listing_id: string; quantity_base: number }>(
      `select r.listing_id, r.quantity_base from ordering.stock_reservations r
       join ordering.order_items i on i.listing_id = r.listing_id and i.package_id = r.package_id
       where i.order_id = $1 and r.checkout_id = $2`,
      [o.id, o.checkout_id],
    );
    for (const r of rows) await this.catalog.returnStock(sql, r.listing_id, Number(r.quantity_base));
  }

  /** Settlement: what is left in escrow goes to the seller, minus commission. */
  private async complete(sql: Sql, o: Row, actor: Actor, note: string): Promise<OrderDto> {
    const release = Number(o.total_rial) - Number(o.refunded_rial);
    const commission = Math.min(release, finalCommission(Number(o.commission_rial ?? 0), Number(o.items_total_rial), Number(o.refunded_rial)));
    if (release > 0) await this.payments.releaseToSeller(sql, { shopId: o.shop_id, amountRial: release, commissionRial: commission, ref: `order:${o.id}` });
    return this.move(sql, o, release > 0 ? "COMPLETED" : "REFUNDED", actor, note, "commission_rial = $4", [commission]);
  }

  private async run<T>(fn: (sql: Sql) => Promise<T>, restocked = false): Promise<T> {
    await this.catalog.market(); // loaded before the transaction; inside it only the snapshot is used
    const out = await this.db.tx(fn);
    if (restocked) this.catalog.invalidate();
    return out;
  }

  // ---------- seller

  accept(userId: string, id: string): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "SELLER", userId });
      this.ensure(o, "AWAITING_ACCEPTANCE");
      if (o.accept_deadline && new Date(o.accept_deadline) <= new Date()) throw conflict("ACCEPT_DEADLINE_PASSED", "مهلت تأیید این سفارش تمام شده است");
      return this.move(sql, o, "ACCEPTED", "SELLER", "غرفه سفارش را تأیید کرد");
    });
  }

  reject(userId: string, id: string, reason: string): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "SELLER", userId });
      this.ensure(o, "AWAITING_ACCEPTANCE");
      await this.refund(sql, o, Number(o.total_rial), "رد سفارش توسط غرفه");
      await this.restock(sql, o);
      return this.move(sql, o, "REJECTED", "SELLER", reason, "cancel_reason = $4", [reason]);
    }, true);
  }

  ship(userId: string, id: string, trackingCode: string | undefined): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "SELLER", userId });
      this.ensure(o, "ACCEPTED");
      // local courier needs no code; post, Tipax and freight give the buyer a tracking code (kit: manual tracking codes)
      if (o.shipping_method !== "SELLER_LOCAL" && !trackingCode) throw badRequest("TRACKING_CODE_REQUIRED", "کد رهگیری مرسوله را وارد کنید");
      return this.move(sql, o, "SHIPPED", "SELLER", trackingCode ? `کد رهگیری: ${trackingCode}` : "با پیک غرفه ارسال شد", "tracking_code = $4, shipped_at = now()", [trackingCode ?? null]);
    });
  }

  answerDispute(userId: string, id: string, response: string, offerRial?: number): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "SELLER", userId });
      this.ensure(o, "DISPUTED");
      if (offerRial !== undefined && offerRial > Number(o.total_rial)) throw badRequest("OFFER_TOO_LARGE", "پیشنهاد از مبلغ سفارش بیشتر است");
      const rows = await sql.query(
        "update ordering.disputes set seller_response = $2, seller_offer_rial = $3, status = 'AWAITING_STAFF' where order_id = $1 and status = 'AWAITING_SELLER' returning id",
        [o.id, response, offerRial ?? null],
      );
      if (!rows.length) throw conflict("DISPUTE_STATE", "به این شکایت قبلاً پاسخ داده شده است");
      await recordEvent(sql, o.id, "DISPUTED", "SELLER", "غرفه به شکایت پاسخ داد");
      const [view] = await this.checkout.orders(sql, "o.id = $1", [o.id]);
      return view!;
    });
  }

  // ---------- buyer

  cancel(userId: string, id: string): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "BUYER", userId });
      this.ensure(o, "AWAITING_ACCEPTANCE");
      await this.refund(sql, o, Number(o.total_rial), "لغو پیش از تأیید غرفه");
      await this.restock(sql, o);
      return this.move(sql, o, "CANCELLED", "BUYER", "خریدار پیش از تأیید غرفه لغو کرد", "cancel_reason = $4", ["لغو توسط خریدار"]);
    }, true);
  }

  confirmDelivered(who: { role: "BUYER"; userId: string } | { role: "ADMIN" }, id: string): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, who);
      this.ensure(o, "SHIPPED");
      const hours = o.complaint_window_hours ?? 24;
      return this.move(sql, o, "DELIVERED", who.role, who.role === "BUYER" ? "خریدار تحویل را تأیید کرد" : "تحویل توسط پشتیبانی ثبت شد", "delivered_at = now(), complaint_ends_at = now() + make_interval(hours => $4)", [hours]);
    });
  }

  openDispute(userId: string, id: string, input: { reason: string; description: string; requested: "FULL_REFUND" | "PARTIAL_REFUND"; requestedRial?: number | undefined }): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "BUYER", userId });
      this.ensure(o, "SHIPPED", "DELIVERED");
      if (o.status === "DELIVERED" && o.complaint_ends_at && new Date(o.complaint_ends_at) <= new Date()) throw conflict("COMPLAINT_WINDOW_CLOSED", "مهلت ثبت شکایت برای این سفارش تمام شده است");
      const left = Number(o.total_rial) - Number(o.refunded_rial);
      const requestedRial = input.requested === "FULL_REFUND" ? left : input.requestedRial;
      if (!requestedRial || requestedRial > left) throw badRequest("REQUESTED_AMOUNT", "مبلغ درخواستی را درست وارد کنید (حداکثر مبلغ سفارش)");
      await sql.query(
        "insert into ordering.disputes (id, order_id, reason, description, requested, requested_rial, status) values ($1, $2, $3, $4, $5, $6, 'AWAITING_SELLER')",
        [uuidv7(), o.id, input.reason, input.description, input.requested, requestedRial],
      );
      return this.move(sql, o, "DISPUTED", "BUYER", "خریدار شکایت ثبت کرد");
    });
  }

  // ---------- staff

  resolveDispute(id: string, refundRial: number, note: string): Promise<OrderDto> {
    return this.run(async (sql) => {
      const o = await this.lock(sql, id, { role: "ADMIN" });
      this.ensure(o, "DISPUTED");
      await this.refund(sql, o, refundRial, "تصمیم پشتیبانی درباره‌ی شکایت");
      await sql.query("update ordering.disputes set status = $2, refund_rial = $3, resolution_note = $4, resolved_at = now() where order_id = $1", [o.id, refundRial > 0 ? "RESOLVED" : "REJECTED", refundRial, note]);
      return this.complete(sql, o, "ADMIN", note);
    });
  }

  // ---------- timers

  /** Unaccepted orders expire (full refund, stock back); delivered orders settle after the complaint window. */
  async tick(): Promise<{ expired: number; completed: number }> {
    await this.checkout.releaseExpired();
    const due = await this.db.query<{ id: string; status: OrderStatus }>(
      `select id, status from ordering.orders
       where (status = 'AWAITING_ACCEPTANCE' and accept_deadline <= now()) or (status = 'DELIVERED' and complaint_ends_at <= now())
       order by updated_at limit 200`,
    );
    let expired = 0;
    let completed = 0;
    for (const d of due) {
      try {
        await this.run(async (sql) => {
          const o = await this.lock(sql, d.id, { role: "SYSTEM" });
          if (o.status === "AWAITING_ACCEPTANCE" && o.accept_deadline && new Date(o.accept_deadline) <= new Date()) {
            await this.refund(sql, o, Number(o.total_rial), "غرفه در مهلت تأیید نکرد");
            await this.restock(sql, o);
            await this.move(sql, o, "EXPIRED", "SYSTEM", "غرفه در مهلت تأیید نکرد", "cancel_reason = $4", ["مهلت تأیید غرفه گذشت"]);
            expired++;
          } else if (o.status === "DELIVERED" && o.complaint_ends_at && new Date(o.complaint_ends_at) <= new Date()) {
            await this.complete(sql, o, "SYSTEM", "مهلت شکایت تمام شد؛ وجه برای غرفه آزاد شد");
            completed++;
          }
        }, true);
      } catch (e) {
        this.log.error({ err: e, orderId: d.id }, "order timer failed");
      }
    }
    return { expired, completed };
  }
}
