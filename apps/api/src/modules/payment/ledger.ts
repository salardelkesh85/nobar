import { type Sql } from "@nobar/common";
import { uuidv7 } from "@nobar/contracts";

/**
 * Ledger accounts. Escrow, wallets and seller balances are what Nobar owes someone, so their
 * balance is credits minus debits.
 */
export const ACCOUNTS = {
  /** money received through the payment gateway */
  GATEWAY: "gateway",
  /** buyers' money held until the complaint window ends (حساب امانی) */
  ESCROW: "escrow",
  COMMISSION: "platform:commission",
  /** money sent to sellers' bank accounts */
  PAYOUTS: "payouts",
  wallet: (userId: string) => `wallet:${userId}`,
  seller: (shopId: string) => `seller:${shopId}`,
} as const;

export interface LedgerLine {
  account: string;
  direction: "D" | "C";
  amountRial: number;
}

/** Posts one balanced transaction; zero-amount lines are dropped. Returns the transaction id. */
export async function postTransaction(sql: Sql, memo: string, ref: string, lines: LedgerLine[]): Promise<string> {
  const used = lines.filter((l) => l.amountRial !== 0);
  for (const l of used) {
    if (!Number.isSafeInteger(l.amountRial) || l.amountRial < 0) throw new Error(`Ledger amount must be a non-negative integer Rial: ${l.amountRial}`);
  }
  const debit = used.filter((l) => l.direction === "D").reduce((s, l) => s + l.amountRial, 0);
  const credit = used.filter((l) => l.direction === "C").reduce((s, l) => s + l.amountRial, 0);
  if (debit !== credit) throw new Error(`Unbalanced ledger transaction "${memo}": debit ${debit} ≠ credit ${credit}`);
  const txnId = uuidv7();
  for (const l of used) {
    await sql.query("insert into payment.ledger_entries (id, txn_id, account, direction, amount_rial, memo, ref) values ($1, $2, $3, $4, $5, $6, $7)", [
      uuidv7(),
      txnId,
      l.account,
      l.direction,
      l.amountRial,
      memo,
      ref,
    ]);
  }
  return txnId;
}

/** Credits minus debits of one account. */
export async function balanceOf(sql: Sql, account: string): Promise<number> {
  const [row] = await sql.query<{ balance: number }>(
    "select coalesce(sum(case when direction = 'C' then amount_rial else -amount_rial end), 0)::bigint as balance from payment.ledger_entries where account = $1",
    [account],
  );
  return Number(row?.balance ?? 0);
}
