import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";

// docs/database/schema.sql is the whole database as plain CREATE statements, written from the migrated
// database itself so it cannot drift from the migrations. Regenerate with:
//   UPDATE_SCHEMA=1 pnpm --filter @nobar/api test schema

const FILE = path.resolve(__dirname, "../../../docs/database/schema.sql");
let api: RunningService<ApiConfig>;

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(46_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", SEED_DEMO: "false", ORDER_TIMER_SEC: "0" },
  });
});
afterAll(async () => {
  await api?.stop();
});

const SCHEMA_FA: Record<string, string> = {
  public: "زیرساخت مشترک: مایگریشن‌ها، صندوق خروجی و ورودی رویدادها، کلیدهای یکتایی درخواست",
  identity: "هویت: کاربران، کد ورود، نشست‌ها، نشانی‌ها",
  audit: "ممیزی: کارهای کارکنان و سیستم",
  catalog: "کاتالوگ: دسته‌ها، انواع محصول، غرفه‌ها، آگهی‌ها، مدارک هویتی، بررسی محتوا",
  ordering: "سبد و سفارش: سبد خرید، تسویه، رزرو موجودی، سفارش هر غرفه، شکایت",
  payment: "پرداخت: پرداخت‌ها، دفتر حسابداری دوطرفه، کمیسیون، تسویه با غرفه‌ها",
  review: "نظر و پرسش: نظر خریداران و پرسش‌های محصول",
  notification: "اعلان: اعلان‌های درون‌برنامه",
};

async function describeDatabase(): Promise<string> {
  const db = api.deps.db;
  const tables = await db.query<{ oid: number; schema: string; name: string }>(
    `select c.oid::int as oid, n.nspname as schema, c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg_%' order by c.oid`,
  );
  const columns = await db.query<{ oid: number; name: string; type: string; notnull: boolean; def: string | null }>(
    `select a.attrelid::int as oid, a.attname as name, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as notnull, pg_get_expr(d.adbin, d.adrelid) as def
     from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attnum > 0 and not a.attisdropped order by a.attrelid, a.attnum`,
  );
  const constraints = await db.query<{ oid: number; name: string; type: string; def: string; ref: number }>(
    `select conrelid::int as oid, conname as name, contype as type, pg_get_constraintdef(oid) as def, confrelid::int as ref from pg_constraint
     where conrelid <> 0 and contype in ('p', 'u', 'f', 'c') order by conrelid, array_position(array['p', 'u', 'f', 'c'], contype::text), conname`,
  );
  const indexes = await db.query<{ oid: number; def: string }>(
    `select i.indrelid::int as oid, pg_get_indexdef(i.indexrelid) as def from pg_index i
     where not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid) order by i.indrelid, i.indexrelid`,
  );

  // a table comes after the tables it references
  const known = new Set(tables.map((t) => t.oid));
  const placed = new Set<number>();
  const ordered: typeof tables = [];
  while (ordered.length < tables.length) {
    const before = ordered.length;
    for (const t of tables) {
      if (placed.has(t.oid)) continue;
      const refs = constraints.filter((c) => c.oid === t.oid && c.type === "f" && c.ref !== t.oid && known.has(c.ref));
      if (refs.every((r) => placed.has(r.ref))) {
        placed.add(t.oid);
        ordered.push(t);
      }
    }
    if (ordered.length === before) throw new Error("circular foreign keys");
  }

  const out: string[] = [
    "-- نوبر (Nobar) — طرح کامل پایگاه داده (PostgreSQL)",
    "-- این فایل از روی پایگاه داده‌ی ساخته‌شده با مایگریشن‌های برنامه تولید می‌شود (apps/api/test/schema.test.ts).",
    "-- هر ماژول برنامه یک schema جدا دارد و فقط به جدول‌های خودش دست می‌زند؛",
    "-- برای همین ارجاع بین ماژول‌ها (مثلاً user_id در سفارش) شناسه است، نه کلید خارجی.",
    "-- مبلغ‌ها عدد صحیح به ریال و زمان‌ها UTC هستند.",
    "",
  ];
  const schemas = [...new Set(ordered.map((t) => t.schema))];
  for (const s of schemas.filter((x) => x !== "public")) out.push(`CREATE SCHEMA ${s};`);
  for (const schema of schemas) {
    out.push("", "-- " + "=".repeat(76), `-- ${schema} — ${SCHEMA_FA[schema] ?? ""}`, "-- " + "=".repeat(76));
    for (const t of ordered.filter((x) => x.schema === schema)) {
      const lines = [
        ...columns.filter((c) => c.oid === t.oid).map((c) => `  ${c.name} ${c.type}${c.notnull ? " NOT NULL" : ""}${c.def === null ? "" : ` DEFAULT ${c.def}`}`),
        ...constraints.filter((c) => c.oid === t.oid).map((c) => `  CONSTRAINT ${c.name} ${c.def}`),
      ];
      out.push("", `CREATE TABLE ${schema}.${t.name} (`, lines.join(",\n"), ");");
      for (const i of indexes.filter((x) => x.oid === t.oid)) out.push(`${i.def};`);
    }
  }
  return out.join("\n") + "\n";
}

it("docs/database/schema.sql matches the migrated database and runs on an empty PostgreSQL", async () => {
  const sql = await describeDatabase();
  if (process.env.UPDATE_SCHEMA) writeFileSync(FILE, sql);
  expect(readFileSync(FILE, "utf8"), "schema.sql is out of date; run with UPDATE_SCHEMA=1").toBe(sql);

  const fresh = new PGlite();
  await fresh.exec(sql);
  const made = await fresh.query<{ n: number }>("select count(*)::int as n from pg_tables where schemaname not in ('pg_catalog', 'information_schema')");
  expect(made.rows[0]!.n).toBe((sql.match(/^CREATE TABLE /gm) ?? []).length);
  await fresh.close();
});
