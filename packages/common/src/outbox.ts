import type { EventEnvelope } from "@nobar/contracts";
import type { EventBus } from "./bus";
import type { Database, Sql } from "./db";
import type { Logger } from "./logger";
import { every } from "./util";

/**
 * Transactional Outbox (docs/architecture.md §6.2): call inside the same transaction as the business
 * change, so the event exists if and only if the change committed.
 */
export async function enqueueEvent(sql: Sql, ...events: EventEnvelope[]): Promise<void> {
  for (const event of events) {
    await sql.query("insert into outbox (id, type, payload) values ($1, $2, $3)", [event.id, event.type, JSON.stringify(event)]);
  }
}

/** Polls the outbox and publishes pending events in order; marks them published on success. */
export class OutboxRelay {
  private stopLoop?: () => void;
  private stopCleanup?: () => void;
  private running = false;

  constructor(
    private readonly db: Database,
    private readonly bus: EventBus,
    private readonly log: Logger,
    private readonly intervalMs = 150,
  ) {}

  start(): void {
    this.stopLoop = every(
      this.intervalMs,
      async () => {
        await this.flush();
      },
      (e) => this.log.error({ err: e }, "outbox relay failed"),
    );
    this.stopCleanup = every(
      10 * 60_000,
      async () => {
        await this.db.query("delete from outbox where published_at < now() - interval '1 day'");
      },
      (e) => this.log.warn({ err: e }, "outbox cleanup failed"),
    );
  }

  /** Publishes everything pending; also called directly by tests and the dev seeder. */
  async flush(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let published = 0;
    try {
      for (;;) {
        const n = await this.db.tx(async (sql) => {
          const rows = await sql.query<{ id: string; payload: EventEnvelope | string }>(
            "select id, payload from outbox where published_at is null order by created_at, id limit 50 for update skip locked",
          );
          for (const row of rows) {
            const event = typeof row.payload === "string" ? (JSON.parse(row.payload) as EventEnvelope) : row.payload;
            try {
              await this.bus.publish(event);
              await sql.query("update outbox set published_at = now(), attempts = attempts + 1 where id = $1", [row.id]);
            } catch (e) {
              await sql.query("update outbox set attempts = attempts + 1, last_error = $2 where id = $1", [row.id, String(e)]);
              throw e;
            }
          }
          return rows.length;
        });
        published += n;
        if (n < 50) break;
      }
    } finally {
      this.running = false;
    }
    return published;
  }

  async pending(): Promise<number> {
    const [row] = await this.db.query<{ n: number }>("select count(*)::int as n from outbox where published_at is null");
    return row?.n ?? 0;
  }

  stop(): void {
    this.stopLoop?.();
    this.stopCleanup?.();
  }
}
