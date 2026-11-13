import { writeFileSync } from "node:fs";
import path from "node:path";
import * as demo from "@nobar/demo";
import { createMarket, type Listing, type Shop } from "@nobar/domain";
import { describe, expect, it } from "vitest";

// Search latency on a catalog of 100,000 listings (roadmap Phase 1 exit criterion: p95 < 300 ms).
// The demo catalog is copied into 2,000 shops × 50 listings; the rules and the search code are the
// production ones (the API calls the same createMarket). Run: pnpm --filter @nobar/api bench

const SHOPS = 2_000;
const PER_SHOP = 50;
const RUNS = 40;

function bigCatalog() {
  const shops: Shop[] = [];
  const listings: Listing[] = [];
  const base = demo.LISTINGS.filter((l) => l.status === "PUBLISHED");
  for (let s = 0; s < SHOPS; s++) {
    const template = demo.SHOPS[s % demo.SHOPS.length]!;
    const shopId = `bs${s}`;
    shops.push({ ...template, id: shopId, slug: `${template.slug}-${s}`, status: "ACTIVE" });
    for (let i = 0; i < PER_SHOP; i++) {
      const l = base[(s * PER_SHOP + i) % base.length]!;
      listings.push({ ...l, id: `bl${s}-${i}`, slug: `${l.slug}-${s}-${i}`, shopId });
    }
  }
  return { categories: [...demo.CATEGORIES], types: [...demo.PRODUCE_TYPES], shops, listings };
}

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;

describe.skipIf(!process.env.BENCH)("search on 100k listings", () => {
  it("keeps p95 under 300 ms for text and filtered searches", { timeout: 600_000 }, () => {
    const data = bigCatalog();
    expect(data.listings).toHaveLength(SHOPS * PER_SHOP);
    const builtAt = performance.now();
    const market = createMarket(data);
    const buildMs = performance.now() - builtAt;

    const cases: Array<[string, Parameters<typeof market.search>[0]]> = [
      // [name, params, meets the 300 ms target] — browsing all 100k unfiltered is a known gap (docs/performance.md)
      ["word", { dest: "tehran", q: "سیب" }],
      ["two words", { dest: "tehran", q: "انار ساوه" }],
      ["no query (browse)", { dest: "tehran" }],
      ["category filter", { dest: "mashhad", category: "fruit" }],
      ["cheapest landed", { dest: "tabriz", q: "پرتقال", sort: "landed" }],
      ["no match", { dest: "tehran", q: "آناناس" }],
    ];
    const rows: Array<{ name: string; hits: number; p50: number; p95: number; max: number }> = [];
    for (const [name, params] of cases) {
      market.search(params); // warm-up
      const times: number[] = [];
      let hits = 0;
      for (let r = 0; r < RUNS; r++) {
        const t = performance.now();
        hits = market.search(params).total;
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      rows.push({ name, hits, p50: pct(times, 50), p95: pct(times, 95), max: times.at(-1)! });
    }

    const table = [
      `Catalog: ${data.listings.length.toLocaleString("en")} listings in ${SHOPS.toLocaleString("en")} shops; market built in ${buildMs.toFixed(0)} ms; ${RUNS} runs per query; Node ${process.version}.`,
      "",
      "| Query | Hits | p50 (ms) | p95 (ms) | max (ms) |",
      "|---|---:|---:|---:|---:|",
      ...rows.map((r) => `| ${r.name} | ${r.hits.toLocaleString("en")} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.max.toFixed(1)} |`),
    ].join("\n");
    console.log(`\n${table}\n`);
    if (process.env.BENCH_OUT) writeFileSync(path.resolve(process.env.BENCH_OUT), `${table}\n`);
    for (const r of rows) {
      if (r.name === "no query (browse)") expect(r.p95, "regression guard for the unfiltered browse").toBeLessThan(1_000);
      else expect(r.p95, r.name).toBeLessThan(300);
    }
  });
});
