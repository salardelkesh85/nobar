import type { Database } from "./db";
import type { Logger } from "./logger";

/** Migrations are TypeScript-embedded SQL so they survive bundling into a single dist file. */
export interface Migration {
  name: string;
  sql: string;
}

/** Tables every service gets: transactional outbox, consumer inbox, idempotency keys. */
export const commonMigrations: Migration[] = [
  {
    name: "common/0001_outbox_inbox_idempotency",
    sql: `
      create table if not exists outbox (
        id uuid primary key,
        type text not null,
        payload jsonb not null,
        created_at timestamptz not null default now(),
        published_at timestamptz,
        attempts int not null default 0,
        last_error text
      );
      create index if not exists outbox_unpublished on outbox (created_at) where published_at is null;

      create table if not exists inbox (
        event_id uuid not null,
        consumer text not null,
        processed_at timestamptz not null default now(),
        primary key (event_id, consumer)
      );

      create table if not exists idempotency_keys (
        scope text not null,
        key text not null,
        request_hash text not null,
        status int not null default 0,
        response jsonb,
        created_at timestamptz not null default now(),
        primary key (scope, key)
      );
    `,
  },
];

export async function migrate(db: Database, migrations: Migration[], log: Logger): Promise<void> {
  await db.exec(`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await db.query<{ name: string }>("select name from _migrations")).map((r) => r.name));
  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    await db.tx(async (sql) => {
      await sql.exec(m.sql);
      await sql.query("insert into _migrations (name) values ($1)", [m.name]);
    });
    log.info({ migration: m.name }, "migration applied");
  }
}
