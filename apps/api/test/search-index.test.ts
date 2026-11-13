import * as demo from "@nobar/demo";
import { createMarket, type Listing, type Shop } from "@nobar/domain";
import { describe, expect, it } from "vitest";

// The word index must return exactly what scanning every listing returns: same hits, same order.

function catalog(copies: number) {
  const shops: Shop[] = [];
  const listings: Listing[] = [];
  for (let c = 0; c < copies; c++) {
    for (const s of demo.SHOPS) shops.push({ ...s, id: `${s.id}-${c}`, slug: `${s.slug}-${c}` });
    for (const l of demo.LISTINGS) listings.push({ ...l, id: `${l.id}-${c}`, slug: `${l.slug}-${c}`, shopId: `${l.shopId}-${c}` });
  }
  return { categories: [...demo.CATEGORIES], types: [...demo.PRODUCE_TYPES], shops, listings };
}

const queries = [
  ...demo.PRODUCE_TYPES.flatMap((t) => [t.name, ...t.aliases]),
  ...demo.SHOPS.map((s) => s.name),
  ...demo.CITIES.slice(0, 12).map((c) => c.name),
  "سیب ترش", "انار ساوه", "پرتقال آبگیری", "ارگانیک", "سیب", "سی", "یب", "قرمز", "آناناس", "ترد شیرین", "  ", "میوه", "کیلو",
];

describe("search word index", () => {
  it("matches the full scan for every query, destination, filter and sort", () => {
    const now = new Date();
    const data = catalog(3);
    const indexed = createMarket(data, () => now);
    const scanned = createMarket(data, () => now, { wordIndex: false });
    let compared = 0;
    for (const dest of ["tehran", "tabriz", "miandoab", "mashhad"]) {
      for (const q of queries) {
        for (const extra of [{}, { sort: "landed" as const }, { category: "fruit" }, { organic: true }]) {
          const params = { dest, q, ...extra };
          const a = indexed.search(params);
          const b = scanned.search(params);
          expect(a.hits.map((h) => h.listing.id), JSON.stringify(params)).toEqual(b.hits.map((h) => h.listing.id));
          expect(a.notDeliverable.map((x) => x.listing.id)).toEqual(b.notDeliverable.map((x) => x.listing.id));
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(500);
  });
});
