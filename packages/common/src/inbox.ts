import type { EventEnvelope } from "@nobar/contracts";
import type { Database, Sql } from "./db";

/**
 * Idempotent consumer (Inbox pattern): the event id is recorded in the same transaction as the
 * state change, so a redelivered event is skipped instead of being applied twice.
 * Returns false when the event had already been processed.
 */
export async function consumeOnce(db: Database, consumer: string, event: EventEnvelope, apply: (sql: Sql) => Promise<void>): Promise<boolean> {
  return db.tx(async (sql) => {
    const inserted = await sql.query(
      "insert into inbox (event_id, consumer) values ($1, $2) on conflict do nothing returning event_id",
      [event.id, consumer],
    );
    if (inserted.length === 0) return false;
    await apply(sql);
    return true;
  });
}
