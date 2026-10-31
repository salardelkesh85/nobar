import { type RunningService, startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";

let api: RunningService<ApiConfig>;

/** Response bodies typed as what CatalogService returns, so these tests also pin the HTTP contract. */
type Out<K extends keyof CatalogService> = CatalogService[K] extends (...a: never[]) => Promise<infer R> ? R : never;
interface Problem {
  status: number;
  code: string;
  detail: string;
}

async function get<T>(path: string): Promise<{ status: number; body: T }> {
  const res = await fetch(`${api.url}${path}`);
  return { status: res.status, body: (await res.json()) as T };
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(40_000 + Math.floor(Math.random() * 10_000)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", SEED_DEMO: "true" },
  });
});
afterAll(async () => {
  await api?.stop();
});

describe("demo catalog import", () => {
  it("stores the whole demo catalog and reads it back unchanged", async () => {
    const m = await api.app.get(CatalogService).market();
    expect(m.data.shops).toHaveLength(demo.SHOPS.length);
    expect(m.data.listings).toHaveLength(demo.LISTINGS.length);
    expect(m.data.types).toEqual(demo.PRODUCE_TYPES);
    expect(m.data.shops).toEqual(demo.SHOPS);
    expect(m.data.listings).toEqual(demo.LISTINGS);
  });

  it("does not import twice", async () => {
    expect(await api.app.get(CatalogService).seedIfEmpty(async () => ({ categories: [], types: [], shops: [], listings: [] }))).toBe(false);
  });
});

// The API and the static site run the same @nobar/domain rules, so for the same data they must agree.
describe("same answers as the storefront", () => {
  it("search", async () => {
    for (const [q, dest] of [["انار", "tehran"], ["سيب", "urmia"], ["گوجه", "mashhad"], ["", "miandoab"]] as const) {
      const r = await get<Out<"search">>(`/v1/search?dest=${dest}&q=${encodeURIComponent(q)}`);
      const local = demo.search({ dest, q });
      expect(r.body.total).toBe(local.total);
      expect(r.body.hits.map((h: { listing: { id: string } }) => h.listing.id)).toEqual(local.hits.map((h) => h.listing.id));
      expect(r.body.hits.map((h: { offer: { landedRial: number } }) => h.offer.landedRial)).toEqual(local.hits.map((h) => h.offer.landedRial));
    }
  });

  it("search filters and sorting", async () => {
    const r = await get<Out<"search">>("/v1/search?dest=tehran&category=fruit&organic=true&sort=landed");
    const local = demo.search({ dest: "tehran", category: "fruit", organic: true, sort: "landed" });
    expect(r.body.hits.map((h: { listing: { id: string } }) => h.listing.id)).toEqual(local.hits.map((h) => h.listing.id));
  });

  it("comparison", async () => {
    const ids = demo.LISTINGS.filter((l) => l.produceTypeId === "pomegranate")
      .map((l) => l.id)
      .slice(0, 4);
    const r = await get<Out<"compare">>(`/v1/compare?dest=tehran&ids=${ids.join(",")}&grams=5000&preset=budget`);
    const local = demo.compare(ids, "tehran", 5000, "budget");
    expect(r.body.offers.map((o) => o.listingId)).toEqual(local.offers.map((o) => o.listing.id));
    expect(r.body.offers.map((o) => o.badges)).toEqual(local.offers.map((o) => o.badges));
    expect(r.body.excluded.map((x) => x.listingId)).toEqual(local.excluded.map((x) => x.listing.id));
  });

  it("listing detail with delivery to the destination", async () => {
    const l = demo.LISTINGS.find((x) => x.status === "PUBLISHED")!;
    const r = await get<Out<"listing">>(`/v1/listings/${encodeURIComponent(l.slug)}?dest=isfahan`);
    expect(r.status).toBe(200);
    expect(r.body.listing.id).toBe(l.id);
    expect(r.body.freshness.badge).toBe(demo.freshnessOf(l).badge);
    expect(r.body.delivery.deliverable).toBe(demo.quoteDelivery(l, "isfahan").deliverable);
    expect(r.body.delivery.options.map((o) => o.costRial)).toEqual(demo.quoteDelivery(l, "isfahan").options.map((o) => o.costRial));
  });
});

describe("catalog endpoints", () => {
  it("lists categories, produce types and active shops", async () => {
    expect((await get<Out<"categories">>("/v1/catalog/categories")).body.map((c) => c.id)).toEqual(demo.CATEGORIES.map((c) => c.id));
    const types = (await get<Out<"produceTypes">>("/v1/catalog/produce-types")).body;
    expect(types).toHaveLength(demo.PRODUCE_TYPES.length);
    expect(types[0]).toHaveProperty("inSeason");
    const shops = (await get<Out<"shops">>("/v1/shops?city=urmia")).body;
    expect(shops.length).toBeGreaterThan(0);
    expect(shops.every((s) => s.cityId === "urmia" && s.status === "ACTIVE")).toBe(true);
  });

  it("shows a shop with its published listings", async () => {
    const shop = demo.SHOPS.find((s) => s.status === "ACTIVE")!;
    const r = await get<Out<"shop">>(`/v1/shops/${encodeURIComponent(shop.slug)}`);
    expect(r.body.shop.id).toBe(shop.id);
    expect(r.body.listings.every((l) => l.shopId === shop.id && l.status === "PUBLISHED")).toBe(true);
  });

  it("suggests produce types for Persian prefixes", async () => {
    const r = await get<Out<"suggest">>(`/v1/suggest?q=${encodeURIComponent("انا")}`);
    expect(r.body.map((t) => t.id)).toContain("pomegranate");
  });

  it("returns candidates of a produce type, cheapest landed first", async () => {
    const r = await get<Out<"candidates">>("/v1/catalog/produce-types/pomegranate/candidates?dest=tehran");
    expect(r.body).toEqual(demo.candidatesForType("pomegranate", "tehran", 5000));
  });

  it("validates input with Persian messages", async () => {
    const bad = await get<Problem>("/v1/search?dest=atlantis");
    expect(bad.status).toBe(400);
    expect(bad.body.detail).toBe("شهر مقصد پشتیبانی نمی‌شود");
    const tooMany = await get<Problem>("/v1/compare?ids=a,b,c,d,e");
    expect(tooMany.status).toBe(400);
    expect((await get<Problem>("/v1/listings/no-such-listing")).status).toBe(404);
    expect((await get<Problem>("/v1/shops/no-such-shop")).status).toBe(404);
  });

  it("is public (no token needed)", async () => {
    expect((await get<Out<"search">>("/v1/search?dest=tehran")).status).toBe(200);
  });
});
