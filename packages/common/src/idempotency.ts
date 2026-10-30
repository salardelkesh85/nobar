import type { Database } from "./db";
import { badRequest, conflict, unprocessable } from "./errors";
import { sha256, stableStringify } from "./util";

export interface IdempotentResult<T> {
  body: T;
  replayed: boolean;
}

/**
 * Idempotency-Key handling (docs/architecture.md §6.4):
 * same key + same body → the stored response; same key + different body → 422;
 * same key while the first request is still running → 409.
 */
export async function idempotent<T>(db: Database, scope: string, key: string | undefined, request: unknown, run: () => Promise<T>): Promise<IdempotentResult<T>> {
  if (!key || key.length < 8 || key.length > 100) throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "هدر Idempotency-Key (۸ تا ۱۰۰ کاراکتر) لازم است");
  const hash = sha256(stableStringify(request));
  const claimed = await db.query(
    "insert into idempotency_keys (scope, key, request_hash, status) values ($1, $2, $3, 0) on conflict do nothing returning key",
    [scope, key, hash],
  );
  if (claimed.length === 0) {
    const [row] = await db.query<{ request_hash: string; status: number; response: T }>(
      "select request_hash, status, response from idempotency_keys where scope = $1 and key = $2",
      [scope, key],
    );
    if (!row) throw conflict("IDEMPOTENCY_RACE", "درخواست هم‌زمان؛ دوباره تلاش کنید");
    if (row.request_hash !== hash) throw unprocessable("IDEMPOTENCY_KEY_REUSED", "این Idempotency-Key برای درخواست دیگری استفاده شده است");
    if (row.status === 0) throw conflict("REQUEST_IN_PROGRESS", "درخواست قبلی هنوز در حال انجام است");
    return { body: row.response, replayed: true };
  }
  try {
    const body = await run();
    await db.query("update idempotency_keys set status = 200, response = $3 where scope = $1 and key = $2", [scope, key, JSON.stringify(body)]);
    return { body, replayed: false };
  } catch (e) {
    // failed attempts do not burn the key: the client may retry with the same key
    await db.query("delete from idempotency_keys where scope = $1 and key = $2 and status = 0", [scope, key]);
    throw e;
  }
}
