import { Inject, Injectable } from "@nestjs/common";
import { consume, type Database, iso, type Logger, notFound, type ServiceDeps, type Sql, TOKENS } from "@nobar/common";
import { type EventEnvelope, isUuid, uuidv7 } from "@nobar/contracts";
import { formatToman } from "@nobar/fa";
import { CatalogService } from "../catalog/catalog.service";
import { SMS_PROVIDER, type SmsProvider } from "../identity/sms";
import { UsersService } from "../identity/users.service";

type OrderEventType = "order.placed" | "order.accepted" | "order.status_changed" | "order.cancelled" | "order.delivered";
interface Notice {
  to: "BUYER" | "SELLER";
  title: string;
  body: string;
  /** also send as SMS (only what needs action or moves money) */
  sms: boolean;
}

/** What each order event tells whom. Texts follow the kit's voice: short, «شما», no hype. */
export function noticesFor(event: EventEnvelope<OrderEventType>): Notice[] {
  const d = event.data;
  const code = `سفارش NB${d.orderId.replace(/-/g, "").slice(20, 28).toUpperCase()}`; // same code as order.service orderCode
  switch (event.type) {
    case "order.placed":
      return [
        { to: "SELLER", title: "سفارش تازه", body: `${code} به مبلغ ${formatToman(d.totalRial)} منتظر تأیید شماست.`, sms: true },
        { to: "BUYER", title: "پرداخت انجام شد", body: `${code} ثبت شد و منتظر تأیید غرفه است. پول شما تا تحویل نزد نوبر می‌ماند.`, sms: false },
      ];
    case "order.accepted":
      return [{ to: "BUYER", title: "غرفه سفارش را تأیید کرد", body: `${code} در حال آماده‌سازی است.`, sms: false }];
    case "order.delivered":
      return [{ to: "SELLER", title: "سفارش تحویل شد", body: `${code} تحویل خریدار شد؛ بعد از مهلت شکایت، وجه آن آزاد می‌شود.`, sms: false }];
    case "order.cancelled": {
      const refund = `مبلغ ${formatToman(d.totalRial)} به کیف پول شما برگشت.`;
      if (d.cancelledBy === "BUYER") return [{ to: "SELLER", title: "سفارش لغو شد", body: `خریدار ${code} را پیش از تأیید لغو کرد.`, sms: false }];
      if (d.status === "REJECTED") return [{ to: "BUYER", title: "غرفه سفارش را نپذیرفت", body: `${code} انجام نمی‌شود. ${refund}`, sms: true }];
      if (d.status === "EXPIRED")
        return [
          { to: "BUYER", title: "سفارش در مهلت تأیید نشد", body: `${code} انجام نمی‌شود. ${refund}`, sms: true },
          { to: "SELLER", title: "مهلت تأیید سفارش گذشت", body: `${code} چون در مهلت تأیید نشد لغو شد.`, sms: false },
        ];
      return [];
    }
    case "order.status_changed":
      if (d.status === "SHIPPED") return [{ to: "BUYER", title: "سفارش ارسال شد", body: `${code} ارسال شد. بعد از رسیدن، تحویل را در نوبر تأیید کنید.`, sms: true }];
      if (d.status === "DISPUTED") return [{ to: "SELLER", title: "شکایت تازه", body: `خریدار برای ${code} شکایت ثبت کرد؛ لطفاً پاسخ دهید.`, sms: true }];
      if (d.status === "COMPLETED") return [{ to: "SELLER", title: "وجه سفارش آزاد شد", body: `مبلغ ${code} به موجودی غرفه‌ی شما اضافه شد.`, sms: false }];
      if (d.status === "REFUNDED") return [{ to: "BUYER", title: "بازپرداخت انجام شد", body: `مبلغ ${code} به کیف پول شما برگشت.`, sms: false }];
      return [];
  }
}

/**
 * In-app notifications and SMS for order events. Consumes events from the bus (idempotent through the
 * inbox), so a slow SMS provider never holds up an order. Owns the `notification` schema.
 */
@Injectable()
export class NotificationService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {}

  async subscribe(deps: Pick<ServiceDeps, "bus" | "db" | "log">): Promise<void> {
    await consume(deps, "notification.orders", ["order.placed", "order.accepted", "order.status_changed", "order.cancelled", "order.delivered"], (event, sql) => this.apply(event, sql));
  }

  private async apply(event: EventEnvelope<OrderEventType>, sql: Sql): Promise<void> {
    const outbox: Array<{ phone: string; text: string }> = [];
    for (const n of noticesFor(event)) {
      const userId = n.to === "BUYER" ? event.data.buyerId : await this.catalog.shopOwner(event.data.sellerId, sql);
      if (!userId) continue;
      const link = n.to === "BUYER" ? `/order/?id=${event.data.orderId}` : `/orders/?id=${event.data.orderId}`;
      await sql.query("insert into notification.notifications (id, user_id, title, body, link) values ($1, $2, $3, $4, $5)", [uuidv7(), userId, n.title, n.body, link]);
      if (n.sms) outbox.push({ phone: (await this.users.get(userId, sql)).phone, text: `نوبر: ${n.body}` });
    }
    // SMS failures must not undo the in-app notice; they are logged and the notice stays
    for (const m of outbox) await this.sms.send(m.phone, m.text).catch((e: unknown) => this.log.warn({ err: e }, "notification sms failed"));
  }

  async mine(userId: string) {
    const rows = await this.db.query<{ id: string; title: string; body: string; link: string | null; read_at: Date | null; created_at: Date }>(
      "select id, title, body, link, read_at, created_at from notification.notifications where user_id = $1 order by created_at desc, id desc limit 50",
      [userId],
    );
    return {
      unread: rows.filter((r) => !r.read_at).length,
      items: rows.map((r) => ({ id: r.id, title: r.title, body: r.body, link: r.link, read: !!r.read_at, at: iso(r.created_at) })),
    };
  }

  async markRead(userId: string, id: string | "all"): Promise<void> {
    if (id === "all") {
      await this.db.query("update notification.notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
      return;
    }
    if (!isUuid(id)) throw notFound("پیام");
    const rows = await this.db.query("update notification.notifications set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning id", [id, userId]);
    if (!rows.length) throw notFound("پیام");
  }
}
