import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Logger } from "./logger";
import { toSafeNumber } from "./util";

/** Minimal SQL surface every repository uses; identical for embedded PGlite and real PostgreSQL. */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}

export interface Database extends Sql {
  readonly kind: "pglite" | "postgres";
  /** Runs `fn` in one transaction; rolls back on throw. */
  tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

const INT8 = 20;
const NUMERIC = 1700;
const DATE = 1082;

export async function createDatabase(opts: { name: string; url?: string; dataDir: string; log: Logger }): Promise<Database> {
  return opts.url ? createPostgres(opts.url, opts.log) : createPglite(opts.name, opts.dataDir, opts.log);
}

async function createPglite(name: string, dataDir: string, log: Logger): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const parsers = { [INT8]: toSafeNumber, [NUMERIC]: toSafeNumber, [DATE]: (v: string) => v };
  let dir: string | undefined;
  if (dataDir !== "memory") {
    dir = path.resolve(dataDir, name);
    mkdirSync(dir, { recursive: true });
  }
  const pg = await PGlite.create(dir ? { dataDir: dir, parsers } : { parsers });
  log.info({ db: "pglite", dir: dir ?? "memory" }, "embedded database ready");
  const wrap = (q: { query: typeof pg.query; exec: typeof pg.exec }): Sql => ({
    async query<T>(text: string, params?: unknown[]) {
      return (await q.query<T>(text, params as never[])).rows;
    },
    async exec(text: string) {
      await q.exec(text);
    },
  });
  const base = wrap(pg);
  return {
    kind: "pglite",
    ...base,
    tx: (fn) => pg.transaction((tx) => fn(wrap(tx as never))),
    async ping() {
      try {
        await pg.query("select 1");
        return true;
      } catch {
        return false;
      }
    },
    close: () => pg.close(),
  };
}

async function createPostgres(url: string, log: Logger): Promise<Database> {
  const pgMod = await import("pg");
  const { Pool, types } = pgMod.default ?? pgMod;
  types.setTypeParser(INT8, toSafeNumber);
  types.setTypeParser(NUMERIC, toSafeNumber);
  types.setTypeParser(DATE, (v: string) => v);
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
  pool.on("error", (err) => log.error({ err }, "postgres pool error"));
  const wrap = (c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Sql => ({
    async query<T>(text: string, params?: unknown[]) {
      return (await c.query(text, params)).rows as T[];
    },
    async exec(text: string) {
      await c.query(text);
    },
  });
  log.info({ db: "postgres" }, "database pool ready");
  return {
    kind: "postgres",
    ...wrap(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(wrap(client));
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    },
    async ping() {
      try {
        await pool.query("select 1");
        return true;
      } catch {
        return false;
      }
    },
    close: () => pool.end(),
  };
}
