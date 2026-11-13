import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { expect, it } from "vitest";
import { apiService } from "../src/app";

// A production market starts without the demo shops, but with what sellers and checkout need.

it("seeds categories, produce types and commission rates without demo data, and keeps staff edits across restarts", { timeout: 60_000 }, async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "nobar-start-"));
  const start = () =>
    startService(apiService(), { overrides: { PORT: String(39_000 + Math.floor(Math.random() * 900)), DATA_DIR: dataDir, LOG_LEVEL: "silent", NODE_ENV: "test", SEED_DEMO: "false", ORDER_TIMER_SEC: "0" } });

  let api = await start();
  try {
    expect(((await (await fetch(`${api.url}/v1/catalog/categories`)).json()) as unknown[]).length).toBe(demo.CATEGORIES.length);
    expect(((await (await fetch(`${api.url}/v1/catalog/produce-types`)).json()) as unknown[]).length).toBe(demo.PRODUCE_TYPES.length);
    expect(((await (await fetch(`${api.url}/v1/shops`)).json()) as unknown[]).length).toBe(0);
    const rules = await api.deps.db.query<{ scope: string; rate_bps: number }>("select scope, rate_bps from payment.commission_rules order by scope");
    expect(rules.find((r) => r.scope === "GLOBAL")?.rate_bps).toBe(1000);
    // staff change a number and a rate
    await api.deps.db.query("update catalog.produce_types set shelf_life_days = 99 where id = 'apple-red'");
    await api.deps.db.query("update payment.commission_rules set rate_bps = 800 where scope = 'GLOBAL'");
  } finally {
    await api.stop();
  }

  api = await start();
  try {
    const [type] = await api.deps.db.query<{ shelf_life_days: number }>("select shelf_life_days from catalog.produce_types where id = 'apple-red'");
    expect(type!.shelf_life_days).toBe(99);
    const [rule] = await api.deps.db.query<{ rate_bps: number }>("select rate_bps from payment.commission_rules where scope = 'GLOBAL'");
    expect(rule!.rate_bps).toBe(800);
    expect((await api.deps.db.query("select 1 from catalog.produce_types")).length).toBe(demo.PRODUCE_TYPES.length);
  } finally {
    await api.stop();
  }
});
