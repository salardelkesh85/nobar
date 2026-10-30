import { describe, expect, it } from "vitest";
import { NOW, daysAgo } from "./clock";
import { listingById, LISTINGS } from "./listings";
import {
  compare,
  freshnessOf,
  isOffer,
  landedOffer,
  marketStat,
  pricePerKg,
  quoteDelivery,
  quoteGroup,
  ratingBayes,
  search,
} from "./rules";
import { shopById, SHOPS } from "./shops";
import type { Listing } from "./types";

const l = (id: string): Listing => {
  const x = listingById(id);
  if (!x) throw new Error(id);
  return x;
};
const harvested = (id: string, days: number): Listing => ({ ...l(id), harvestedAt: daysAgo(days, 7) });

describe("freshness (docs/02 §5.1)", () => {
  it("is FRESH_PICKED up to one day after harvest", () => {
    expect(freshnessOf(harvested("l201", 0)).badge).toBe("FRESH_PICKED");
    expect(freshnessOf(harvested("l201", 1)).badge).toBe("FRESH_PICKED");
  });

  it("is FRESH while at least 60% of shelf life is left, then GOOD", () => {
    // apples: 30-day shelf life
    expect(freshnessOf(harvested("l101", 12)).badge).toBe("FRESH"); // ratio 0.6
    expect(freshnessOf(harvested("l101", 13)).badge).toBe("GOOD");
  });

  it("stops being sellable when fewer than min-arrival + 1 days remain", () => {
    // grapes: 8-day shelf, min 2 days on arrival → sellable while 8 - age >= 3
    expect(freshnessOf(harvested("l201", 5)).sellable).toBe(true);
    expect(freshnessOf(harvested("l201", 6)).badge).toBe("NOT_FRESH");
  });

  it("shows PREORDER instead of a badge for pre-orders", () => {
    expect(freshnessOf(l("l602")).badge).toBe("PREORDER");
  });
});

describe("price per kg (docs/02 §7)", () => {
  it("is integer Rial rounded half-up", () => {
    expect(pricePerKg(4_200_000, 5_000)).toBe(840_000);
    expect(pricePerKg(1_000, 3_000)).toBe(333); // 333.33 → 333
    expect(pricePerKg(2_000, 3_000)).toBe(667); // 666.67 → 667
    expect(pricePerKg(1_500, 3_000)).toBe(500);
    expect(Number.isInteger(pricePerKg(999_999, 7_000))).toBe(true);
  });

  it("has no market statistic below 5 listings", () => {
    expect(marketStat("kiwi")).toBeNull();
    const s = marketStat("pomegranate");
    expect(s).not.toBeNull();
    expect(s!.p25).toBeLessThanOrEqual(s!.median);
    expect(s!.median).toBeLessThanOrEqual(s!.p75);
  });
});

describe("delivery eligibility (docs/02 §10)", () => {
  it("offers same-city seller delivery only inside the shop's city", () => {
    const herbs = l("l401"); // urmia shop, SELLER_LOCAL only
    expect(quoteDelivery(herbs, "urmia").deliverable).toBe(true);
    expect(quoteDelivery(herbs, "tehran").deliverable).toBe(false);
  });

  it("excludes produce that would not arrive fresh", () => {
    const q = quoteDelivery(harvested("l201", 4), "mashhad"); // grapes, far away
    expect(q.deliverable).toBe(false);
    expect(q.reason).toBe("NOT_FRESH_ON_ARRIVAL");
  });

  it("returns the cheapest eligible method first", () => {
    const q = quoteDelivery(l("l501"), "tehran");
    expect(q.deliverable).toBe(true);
    const costs = q.options.map((o) => o.costRial);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    for (const o of q.options) expect(o.freshOnArrivalDays).toBeGreaterThanOrEqual(2);
  });

  it("applies free shipping above the shop's threshold", () => {
    const shop = shopById("s5")!;
    const tipax = shop.shipping.find((r) => r.method === "TIPAX")!;
    const lines = [{ listing: l("l501"), pkg: l("l501").packages[0]!, qty: 6 }]; // 6 × 5 kg × 590,000 Toman, within Tipax's 30 kg
    const g = quoteGroup(shop, lines, "tehran");
    expect(g.itemsRial).toBeGreaterThanOrEqual(tipax.freeOverRial!);
    expect(g.options.find((o) => o.method === "TIPAX")?.costRial).toBe(0);
  });
});

describe("comparison engine (docs/02 §8.2)", () => {
  const ids = LISTINGS.filter((x) => x.produceTypeId === "pomegranate").map((x) => x.id);

  it("ranks deliverable offers and gives each badge to exactly one offer", () => {
    const c = compare(ids, "tehran", 5_000, "balanced");
    expect(c.offers.length).toBeGreaterThanOrEqual(2);
    expect(c.offers[0]!.badges[0]).toBe("BEST_OVERALL");
    for (const b of ["BEST_OVERALL", "CHEAPEST_LANDED", "FRESHEST", "FASTEST"] as const) {
      expect(c.offers.filter((o) => o.badges.includes(b))).toHaveLength(1);
    }
    const scores = c.offers.map((o) => o.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("lists not-deliverable offers separately with a reason", () => {
    const c = compare(ids, "tehran");
    expect(c.excluded.map((x) => x.listing.id)).toContain("l405"); // urmia shop, local delivery only
  });

  it("is deterministic", () => {
    expect(compare(ids, "isfahan", 3_000, "budget").offers.map((o) => o.listing.id)).toEqual(
      compare(ids, "isfahan", 3_000, "budget").offers.map((o) => o.listing.id),
    );
  });

  it("puts the cheapest landed offer first in the budget preset", () => {
    const c = compare(ids, "tehran", 5_000, "budget");
    const cheapest = Math.min(...c.offers.map((o) => o.landedPerKgRial));
    expect(c.offers[0]!.landedPerKgRial).toBe(cheapest);
  });

  it("computes landed price per kg from items + shipping", () => {
    const o = landedOffer(l("l501"), "tehran", 5_000);
    expect(isOffer(o)).toBe(true);
    if (isOffer(o)) expect(o.landedPerKgRial).toBe(pricePerKg(o.itemsRial + o.shippingRial, o.totalGrams));
  });

  it("pulls small shops toward the platform mean (Bayesian rating)", () => {
    const small = SHOPS.find((s) => s.ratingCount < 50)!;
    expect(Math.abs(ratingBayes(small) - small.ratingAvg)).toBeGreaterThan(0);
  });
});

describe("Persian search", () => {
  const titles = (q: string) => search({ dest: "tehran", q }).hits.map((h) => h.type.id);

  it("matches Arabic yeh and kaf", () => {
    expect(titles("سيب")).toContain("apple-red");
  });

  it("finds tomatoes for «گوجه» but not greengage", () => {
    const r = titles("گوجه");
    expect(r).toContain("tomato");
    expect(r).not.toContain("greengage");
  });

  it("never returns a listing that cannot reach the destination", () => {
    for (const h of search({ dest: "tehran" }).hits) expect(quoteDelivery(h.listing, "tehran").deliverable).toBe(true);
  });

  it("keeps the demo clock stable", () => {
    expect(NOW.getTime() % 600_000).toBe(0);
  });

  it("dates demo harvests on the Tehran calendar day, also just after midnight", () => {
    const tehranDay = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date(d));
    expect(tehranDay(daysAgo(0))).toBe(tehranDay(NOW));
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", hour12: false }).format(new Date(daysAgo(0, 7)))).toBe("07");
  });
});
