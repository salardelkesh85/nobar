import { Inject, Injectable } from "@nestjs/common";
import { conflict, type Database, iso, type Sql, TOKENS } from "@nobar/common";
import { uuidv7 } from "@nobar/contracts";
import type { ApiConfig } from "../../config";
import { ACCOUNTS, balanceOf, type LedgerLine, postTransaction } from "./ledger";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./provider";

export type SettleOutcome = "SUCCEEDED" | "FAILED" | "ALREADY_SUCCEEDED" | "ALREADY_FAILED";
export interface Settlement {
  outcome: SettleOutcome;
  paymentId: string;
  checkoutId: string;
  userId: string;
  amountRial: number;
}

export interface CommissionRule {
  id: string;
  scope: "GLOBAL" | "CATEGORY" | "SHOP";
  scopeId: string | null;
  rateBps: number;
  label: string;
}

/** round half-up to whole Rial, the same rounding as everywhere else (docs/02 §7) */
export const commissionOf = (amountRial: number, bps: number): number => Math.floor((amountRial * bps + 5_000) / 10_000);

/**
 * Payment and money: gateway payments, the double-entry ledger (escrow, wallets, seller balances),
 * commission rules and payouts. Owns the `payment` schema. Called by the order module; it never calls back.
 */
@Injectable()
export class PaymentService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  // ---------- gateway

  async start(sql: Sql, input: { checkoutId: string; userId: string; amountRial: number }): Promise<{ paymentId: string; redirectUrl: string }> {
    const { authority, redirectUrl } = await this.provider.start({
      amountRial: input.amountRial,
      description: `نوبر — پرداخت ${input.checkoutId.slice(-8)}`,
      callbackUrl: `${this.config.API_PUBLIC_URL}/v1/payments/callback`,
    });
    const id = uuidv7();
    await sql.query(
      "insert into payment.payments (id, checkout_id, user_id, amount_rial, provider, authority, status) values ($1, $2, $3, $4, $5, $6, 'INITIATED')",
      [id, input.checkoutId, input.userId, input.amountRial, this.provider.name, authority],
    );
    return { paymentId: id, redirectUrl };
  }

  /** Looks up an attempt by its gateway authority (for the test gateway page). */
  async byAuthority(authority: string): Promise<{ checkoutId: string; amountRial: number; status: string } | null> {
    const [row] = await this.db.query<{ checkout_id: string; amount_rial: number; status: string }>(
      "select checkout_id, amount_rial, status from payment.payments where authority = $1",
      [authority],
    );
    return row ? { checkoutId: row.checkout_id, amountRial: Number(row.amount_rial), status: row.status } : null;
  }

  /**
   * Verifies a gateway callback. Safe to call many times: only the first call changes anything,
   * and money is booked into escrow exactly once. Returns null for an unknown authority.
   */
  async settle(sql: Sql, authority: string, callbackStatus: string): Promise<Settlement | null> {
    const [p] = await sql.query<{ id: string; checkout_id: string; user_id: string; amount_rial: number; status: string }>(
      "select id, checkout_id, user_id, amount_rial, status from payment.payments where authority = $1 for update",
      [authority],
    );
    if (!p) return null;
    const base = { paymentId: p.id, checkoutId: p.checkout_id, userId: p.user_id, amountRial: Number(p.amount_rial) };
    if (p.status === "SUCCEEDED") return { ...base, outcome: "ALREADY_SUCCEEDED" };
    if (p.status === "FAILED") return { ...base, outcome: "ALREADY_FAILED" };
    const verified = await this.provider.verify({ authority, amountRial: base.amountRial, callbackStatus });
    if (!verified.ok) {
      await sql.query("update payment.payments set status = 'FAILED', updated_at = now() where id = $1", [p.id]);
      return { ...base, outcome: "FAILED" };
    }
    await sql.query("update payment.payments set status = 'SUCCEEDED', ref_id = $2, updated_at = now() where id = $1", [p.id, verified.refId ?? null]);
    await postTransaction(sql, "پرداخت خریدار به حساب امانی", `checkout:${p.checkout_id}`, [
      { account: ACCOUNTS.GATEWAY, direction: "D", amountRial: base.amountRial },
      { account: ACCOUNTS.ESCROW, direction: "C", amountRial: base.amountRial },
    ]);
    return { ...base, outcome: "SUCCEEDED" };
  }

  // ---------- escrow movements (all inside the caller's transaction)

  /** Money that arrived for a checkout that can no longer be fulfilled goes to the buyer's wallet. */
  async creditWalletFromEscrow(sql: Sql, userId: string, amountRial: number, memo: string, ref: string): Promise<void> {
    await postTransaction(sql, memo, ref, [
      { account: ACCOUNTS.ESCROW, direction: "D", amountRial },
      { account: ACCOUNTS.wallet(userId), direction: "C", amountRial },
    ]);
  }

  /** End of the complaint window: the seller's share becomes their balance, commission becomes revenue. */
  async releaseToSeller(sql: Sql, input: { shopId: string; amountRial: number; commissionRial: number; ref: string }): Promise<void> {
    if (input.commissionRial > input.amountRial) throw new Error("commission larger than the released amount");
    const lines: LedgerLine[] = [
      { account: ACCOUNTS.ESCROW, direction: "D", amountRial: input.amountRial },
      { account: ACCOUNTS.seller(input.shopId), direction: "C", amountRial: input.amountRial - input.commissionRial },
      { account: ACCOUNTS.COMMISSION, direction: "C", amountRial: input.commissionRial },
    ];
    await postTransaction(sql, "آزادسازی وجه سفارش برای غرفه", input.ref, lines);
  }

  // ---------- commission

  async commissionRules(): Promise<CommissionRule[]> {
    const rows = await this.db.query<{ id: string; scope: CommissionRule["scope"]; scope_id: string | null; rate_bps: number; label: string }>(
      "select id, scope, scope_id, rate_bps, label from payment.commission_rules order by scope, scope_id",
    );
    return rows.map((r) => ({ id: r.id, scope: r.scope, scopeId: r.scope_id, rateBps: r.rate_bps, label: r.label }));
  }

  /** Most specific rule: the shop's own rate, then the category's, then the global one. */
  async commissionBps(sql: Sql, shopId: string, categoryId: string): Promise<number> {
    const rows = await sql.query<{ scope: string; rate_bps: number }>(
      `select scope, rate_bps from payment.commission_rules
       where (scope = 'SHOP' and scope_id = $1) or (scope = 'CATEGORY' and scope_id = $2) or scope = 'GLOBAL'`,
      [shopId, categoryId],
    );
    const pick = (scope: string) => rows.find((r) => r.scope === scope)?.rate_bps;
    const bps = pick("SHOP") ?? pick("CATEGORY") ?? pick("GLOBAL");
    if (bps === undefined) throw conflict("COMMISSION_NOT_CONFIGURED", "نرخ کارمزد تعریف نشده است");
    return bps;
  }

  async setCommissionRule(scope: CommissionRule["scope"], scopeId: string | null, rateBps: number, label: string): Promise<void> {
    await this.db.query(
      `insert into payment.commission_rules (id, scope, scope_id, rate_bps, label) values ($1, $2, $3, $4, $5)
       on conflict (scope, (coalesce(scope_id, ''))) do update set rate_bps = excluded.rate_bps, label = excluded.label`,
      [uuidv7(), scope, scope === "GLOBAL" ? null : scopeId, rateBps, label],
    );
  }

  async hasCommissionRules(): Promise<boolean> {
    const [row] = await this.db.query<{ n: number }>("select count(*)::int as n from payment.commission_rules");
    return (row?.n ?? 0) > 0;
  }

  // ---------- balances

  async wallet(userId: string) {
    const account = ACCOUNTS.wallet(userId);
    const entries = await this.db.query<{ direction: "D" | "C"; amount_rial: number; memo: string; created_at: Date }>(
      "select direction, amount_rial, memo, created_at from payment.ledger_entries where account = $1 order by created_at desc limit 50",
      [account],
    );
    return {
      balanceRial: await balanceOf(this.db, account),
      entries: entries.map((e) => ({ amountRial: e.direction === "C" ? Number(e.amount_rial) : -Number(e.amount_rial), memo: e.memo, at: iso(e.created_at) })),
    };
  }

  async sellerBalance(shopId: string) {
    const payouts = await this.db.query<{ id: string; amount_rial: number; status: string; created_at: Date; paid_at: Date | null }>(
      "select id, amount_rial, status, created_at, paid_at from payment.payouts where shop_id = $1 order by created_at desc limit 50",
      [shopId],
    );
    return {
      balanceRial: await balanceOf(this.db, ACCOUNTS.seller(shopId)),
      payouts: payouts.map((p) => ({ id: p.id, amountRial: Number(p.amount_rial), status: p.status, createdAt: iso(p.created_at), paidAt: p.paid_at ? iso(p.paid_at) : null })),
    };
  }

  /** Totals for the admin dashboard: escrow + wallets + seller balances + commission + paid out = received. */
  async totals() {
    const rows = await this.db.query<{ account: string; balance: number }>(
      `select account, sum(case when direction = 'C' then amount_rial else -amount_rial end)::bigint as balance
       from payment.ledger_entries group by account`,
    );
    const sum = (match: (a: string) => boolean) => rows.filter((r) => match(r.account)).reduce((s, r) => s + Number(r.balance), 0);
    return {
      escrowRial: sum((a) => a === ACCOUNTS.ESCROW),
      walletsRial: sum((a) => a.startsWith("wallet:")),
      sellersRial: sum((a) => a.startsWith("seller:")),
      commissionRial: sum((a) => a === ACCOUNTS.COMMISSION),
      receivedRial: -sum((a) => a === ACCOUNTS.GATEWAY),
      paidOutRial: sum((a) => a === ACCOUNTS.PAYOUTS),
    };
  }

  // ---------- payouts

  /** Staff view: what each shop is owed now, and the payouts already made. */
  async payoutOverview() {
    const pending = await this.db.query<{ account: string; balance: number }>(
      `select account, sum(case when direction = 'C' then amount_rial else -amount_rial end)::bigint as balance
       from payment.ledger_entries where account like 'seller:%' group by account
       having sum(case when direction = 'C' then amount_rial else -amount_rial end) > 0 order by account`,
    );
    const history = await this.db.query<{ id: string; shop_id: string; amount_rial: number; status: string; created_at: Date; paid_at: Date | null }>(
      "select id, shop_id, amount_rial, status, created_at, paid_at from payment.payouts order by created_at desc, id desc limit 200",
    );
    return {
      pending: pending.map((r) => ({ shopId: r.account.slice("seller:".length), amountRial: Number(r.balance) })),
      history: history.map((p) => ({ id: p.id, shopId: p.shop_id, amountRial: Number(p.amount_rial), status: p.status, createdAt: iso(p.created_at), paidAt: p.paid_at ? iso(p.paid_at) : null })),
    };
  }

  /** Pays every positive seller balance in one batch (bank transfer itself is outside the system for now). */
  async runPayouts(adminId: string): Promise<Array<{ id: string; shopId: string; amountRial: number }>> {
    return this.db.tx(async (sql) => {
      const rows = await sql.query<{ account: string; balance: number }>(
        `select account, sum(case when direction = 'C' then amount_rial else -amount_rial end)::bigint as balance
         from payment.ledger_entries where account like 'seller:%' group by account having sum(case when direction = 'C' then amount_rial else -amount_rial end) > 0`,
      );
      const out: Array<{ id: string; shopId: string; amountRial: number }> = [];
      for (const r of rows) {
        const shopId = r.account.slice("seller:".length);
        const amountRial = Number(r.balance);
        const id = uuidv7();
        await sql.query("insert into payment.payouts (id, shop_id, amount_rial, status, created_by, paid_at) values ($1, $2, $3, 'PAID', $4, now())", [id, shopId, amountRial, adminId]);
        await postTransaction(sql, "تسویه با غرفه", `payout:${id}`, [
          { account: ACCOUNTS.seller(shopId), direction: "D", amountRial },
          { account: ACCOUNTS.PAYOUTS, direction: "C", amountRial },
        ]);
        out.push({ id, shopId, amountRial });
      }
      return out;
    });
  }
}
