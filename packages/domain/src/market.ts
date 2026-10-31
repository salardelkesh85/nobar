// Deterministic marketplace rules from docs/02-domain-model.md (§5.1 freshness, §7 pricing, §8.2 comparison,
// §10 delivery, §9 cart groups). The same code runs in the browser (demo data) and in the API (database rows).
import { FA_STOPWORDS, jalaliMonth, searchKey, tehranDaysBetween, tokenizeFa } from "@nobar/fa";
import { cityById, distanceKm, provinceOfCity } from "./geo";
import {
  type CompareBadge,
  METHOD_FA,
  minPricePerKg,
  type NotDeliverableReason,
  packageGrams,
  type Preset,
  pricePerKg,
  type PricePosition,
  shippingCost,
  type SortKey,
} from "./pricing";
import type { Category, FreshnessBadge, Listing, ListingPackage, ProduceType, ShippingMethodCode, Shop } from "./types";

export interface Freshness {
  badge: FreshnessBadge;
  ageDays: number;
  shelfDays: number;
  ratio: number;
  daysLeft: number;
  sellable: boolean;
}

export function harvestPhrase(f: Freshness): string {
  if (f.badge === "PREORDER") return "پیش‌فروش";
  if (f.ageDays === 0) return "امروز برداشت شده";
  if (f.ageDays === 1) return "دیروز برداشت شده";
  return `${f.ageDays.toLocaleString("fa-IR")} روز پیش برداشت شده`;
}

export interface MarketStat {
  produceTypeId: string;
  count: number;
  p25: number;
  median: number;
  p75: number;
}

export interface DeliveryOption {
  method: ShippingMethodCode;
  label: string;
  costRial: number;
  etaMinDays: number;
  etaMaxDays: number;
  etaFrom: string;
  etaTo: string;
  freshOnArrivalDays: number;
}

export interface DeliveryQuote {
  deliverable: boolean;
  reason?: NotDeliverableReason;
  options: DeliveryOption[];
  best?: DeliveryOption;
}

export interface Offer {
  listing: Listing;
  shop: Shop;
  pkg: ListingPackage;
  count: number;
  totalGrams: number;
  itemsRial: number;
  shippingRial: number;
  landedRial: number;
  landedPerKgRial: number;
  delivery: DeliveryOption;
  freshness: Freshness;
  rating: number;
  score: number;
  badges: CompareBadge[];
}

export interface Excluded {
  listing: Listing;
  shop: Shop;
  reason: NotDeliverableReason;
}

export const isOffer = (x: Offer | Excluded): x is Offer => "delivery" in x;

export interface Comparison {
  offers: Offer[];
  excluded: Excluded[];
  preset: Preset;
  targetGrams: number;
  destCityId: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  produceType?: string;
  originProvince?: string;
  organic?: boolean;
  freshOnly?: boolean;
  nobarOnly?: boolean;
  shopId?: string;
  sort?: SortKey;
  dest: string;
}

export interface SearchHit {
  listing: Listing;
  shop: Shop;
  type: ProduceType;
  freshness: Freshness;
  offer: Offer;
  relevance: number;
}

export interface SearchResult {
  hits: SearchHit[];
  notDeliverable: Excluded[];
  total: number;
}

export interface CartLine {
  listing: Listing;
  pkg: ListingPackage;
  qty: number;
}

export interface GroupQuote {
  shop: Shop;
  lines: CartLine[];
  itemsRial: number;
  grams: number;
  options: DeliveryOption[];
  blocked: Array<{ line: CartLine; reason: NotDeliverableReason }>;
}

export interface MarketData {
  categories: readonly Category[];
  types: readonly ProduceType[];
  shops: readonly Shop[];
  listings: readonly Listing[];
}

// ---------- constants

const SUPPORTS_COLD: Record<ShippingMethodCode, boolean> = { SELLER_LOCAL: true, POST: false, TIPAX: false, FREIGHT: false };

const WEIGHTS: Record<Preset, { price: number; fresh: number; rating: number; eta: number }> = {
  balanced: { price: 0.35, fresh: 0.3, rating: 0.2, eta: 0.15 },
  budget: { price: 0.6, fresh: 0.15, rating: 0.15, eta: 0.1 },
  freshest: { price: 0.2, fresh: 0.5, rating: 0.2, eta: 0.1 },
  fastest: { price: 0.2, fresh: 0.2, rating: 0.1, eta: 0.5 },
};

function transitDays(method: ShippingMethodCode, km: number, sameCity: boolean): [number, number] | null {
  if (method === "SELLER_LOCAL") return sameCity ? [0, 0] : null;
  const band = km < 250 ? 0 : km < 700 ? 1 : 2;
  const table: Record<Exclude<ShippingMethodCode, "SELLER_LOCAL">, Array<[number, number]>> = {
    POST: [[2, 3], [3, 4], [4, 6]],
    TIPAX: [[1, 1], [1, 2], [2, 3]],
    FREIGHT: [[1, 2], [2, 3], [3, 4]],
  };
  return table[method][band]!;
}

const tehranWeekday = (d: Date): number => {
  // 0 = Saturday … 6 = Friday (docs/02 §4)
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(d);
  return ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(wd);
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Days from today until dispatch: today + handling, moved past Fridays (shops do not ship on Friday). */
function dispatchOffset(shop: Shop, listing: Listing, now: Date): number {
  let offset = shop.handlingDays;
  if (listing.isPreorder && listing.preorderDispatchFrom) offset = Math.max(offset, tehranDaysBetween(now, listing.preorderDispatchFrom));
  while (tehranWeekday(addDays(now, offset)) === 6) offset++;
  return offset;
}

const quantile = (sorted: number[], q: number): number => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo));
};

/** Best package mix for a target weight: one package size, enough packages to reach the target, cheapest items cost. */
function choosePackage(l: Listing, targetGrams: number): { pkg: ListingPackage; count: number } {
  let best: { pkg: ListingPackage; count: number; cost: number; grams: number } | null = null;
  for (const p of l.packages) {
    const g = packageGrams(p);
    const count = Math.max(1, Math.ceil(targetGrams / g));
    const cost = count * p.priceRial;
    if (!best || cost < best.cost || (cost === best.cost && count * g < best.grams)) best = { pkg: p, count, cost, grams: count * g };
  }
  return { pkg: best!.pkg, count: best!.count };
}

export function queryTokens(q: string): string[] {
  return tokenizeFa(q).filter((t) => !FA_STOPWORDS.has(t) && t.length > 1);
}

/**
 * Binds the rules to one snapshot of catalog data and a clock.
 * Lookups are indexed once; the functions never mutate the data.
 */
export function createMarket(data: MarketData, clock: () => Date = () => new Date()) {
  const typeById = new Map(data.types.map((t) => [t.id, t]));
  const shopById = new Map(data.shops.map((s) => [s.id, s]));
  const listingById = new Map(data.listings.map((l) => [l.id, l]));
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
  const platformMean = data.shops.length ? data.shops.reduce((s, x) => s + x.ratingAvg, 0) / data.shops.length : 0;

  const mustType = (id: string): ProduceType => {
    const t = typeById.get(id);
    if (!t) throw new Error(`Unknown produce type ${id}`);
    return t;
  };
  const mustShop = (id: string): Shop => {
    const s = shopById.get(id);
    if (!s) throw new Error(`Unknown shop ${id}`);
    return s;
  };

  // ---------- freshness (§5.1)

  function freshnessOf(listing: Listing, now: Date = clock()): Freshness {
    const pt = mustType(listing.produceTypeId);
    const shelf = pt.shelfLifeDays;
    if (listing.isPreorder) return { badge: "PREORDER", ageDays: 0, shelfDays: shelf, ratio: 1, daysLeft: shelf, sellable: true };
    const age = Math.max(0, tehranDaysBetween(listing.harvestedAt, now));
    const ratio = Math.max(0, 1 - age / shelf);
    const sellable = shelf - age >= pt.minShelfDaysOnArrival + 1;
    const badge: FreshnessBadge = !sellable ? "NOT_FRESH" : age <= 1 ? "FRESH_PICKED" : ratio >= 0.6 ? "FRESH" : "GOOD";
    return { badge, ageDays: age, shelfDays: shelf, ratio, daysLeft: shelf - age, sellable };
  }

  // ---------- market statistics (§7)

  /** Market statistics; fewer than 5 listings → no statistic. */
  function marketStat(produceTypeId: string): MarketStat | null {
    const per = data.listings
      .filter((l) => l.produceTypeId === produceTypeId && l.status === "PUBLISHED")
      .map(minPricePerKg)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    if (per.length < 5) return null;
    return { produceTypeId, count: per.length, p25: quantile(per, 0.25), median: quantile(per, 0.5), p75: quantile(per, 0.75) };
  }

  function pricePosition(l: Listing): PricePosition {
    const s = marketStat(l.produceTypeId);
    const v = minPricePerKg(l);
    if (!s || v === null) return "UNKNOWN";
    return v < s.p25 ? "BELOW" : v > s.p75 ? "ABOVE" : "FAIR";
  }

  // ---------- delivery (§10)

  function quoteDelivery(listing: Listing, destCityId: string, grams?: number, itemsRial?: number, now: Date = clock()): DeliveryQuote {
    const shop = mustShop(listing.shopId);
    const pt = mustType(listing.produceTypeId);
    const origin = cityById(shop.cityId);
    const dest = cityById(destCityId);
    const fresh = freshnessOf(listing, now);
    if (!origin || !dest) return { deliverable: false, reason: "NOT_DELIVERABLE", options: [] };
    if (listing.stockBase <= 0) return { deliverable: false, reason: "OUT_OF_STOCK", options: [] };
    const first = listing.packages[0]!;
    const g = grams ?? packageGrams(first);
    const items = itemsRial ?? first.priceRial;
    const sameCity = origin.id === dest.id;
    const km = distanceKm(origin, dest);
    const dispatch = dispatchOffset(shop, listing, now);
    const options: DeliveryOption[] = [];
    let sawFreshFail = false;
    let sawHeavy = false;
    for (const rate of shop.shipping) {
      const transit = transitDays(rate.method, km, sameCity);
      if (!transit) continue;
      if (pt.storage === "COLD" && !SUPPORTS_COLD[rate.method]) continue;
      const etaMax = dispatch + transit[1];
      const ageAtArrival = listing.isPreorder ? transit[1] : fresh.ageDays + etaMax;
      const freshOnArrival = pt.shelfLifeDays - ageAtArrival;
      if (freshOnArrival < pt.minShelfDaysOnArrival) {
        sawFreshFail = true;
        continue;
      }
      const cost = shippingCost(shop, rate.method, g, items);
      if (cost === null) {
        sawHeavy = true;
        continue;
      }
      options.push({
        method: rate.method,
        label: METHOD_FA[rate.method],
        costRial: cost,
        etaMinDays: dispatch + transit[0],
        etaMaxDays: etaMax,
        etaFrom: addDays(now, dispatch + transit[0]).toISOString(),
        etaTo: addDays(now, etaMax).toISOString(),
        freshOnArrivalDays: freshOnArrival,
      });
    }
    options.sort((a, b) => a.costRial - b.costRial || a.etaMaxDays - b.etaMaxDays);
    if (options.length) return { deliverable: true, options, best: options[0]! };
    const reason: NotDeliverableReason = sawFreshFail ? "NOT_FRESH_ON_ARRIVAL" : sawHeavy ? "TOO_HEAVY" : "NOT_DELIVERABLE";
    return { deliverable: false, reason, options: [] };
  }

  // ---------- landed price & comparison (§8.2)

  const ratingBayes = (shop: Shop): number => (10 * platformMean + shop.ratingCount * shop.ratingAvg) / (10 + shop.ratingCount);

  function landedOffer(l: Listing, destCityId: string, targetGrams: number, now: Date = clock()): Offer | Excluded {
    const shop = mustShop(l.shopId);
    const { pkg, count } = choosePackage(l, targetGrams);
    const totalGrams = packageGrams(pkg) * count;
    const itemsRial = pkg.priceRial * count;
    const q = quoteDelivery(l, destCityId, totalGrams, itemsRial, now);
    if (!q.best) return { listing: l, shop, reason: q.reason ?? "NOT_DELIVERABLE" };
    const landedRial = itemsRial + q.best.costRial;
    return {
      listing: l,
      shop,
      pkg,
      count,
      totalGrams,
      itemsRial,
      shippingRial: q.best.costRial,
      landedRial,
      landedPerKgRial: pricePerKg(landedRial, totalGrams),
      delivery: q.best,
      freshness: freshnessOf(l, now),
      rating: ratingBayes(shop),
      score: 0,
      badges: [],
    };
  }

  function compare(listingIds: string[], destCityId: string, targetGrams = 5000, preset: Preset = "balanced"): Comparison {
    const now = clock();
    const results = listingIds
      .map((id) => listingById.get(id))
      .filter((l): l is Listing => !!l)
      .map((l) => landedOffer(l, destCityId, targetGrams, now));
    const offers = results.filter(isOffer);
    const excluded = results.filter((r): r is Excluded => !isOffer(r));
    const norm = (vals: number[], invert: boolean) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return vals.map((v) => (max === min ? 1 : invert ? (max - v) / (max - min) : (v - min) / (max - min)));
    };
    if (offers.length) {
      const w = WEIGHTS[preset];
      const p = norm(offers.map((o) => o.landedPerKgRial), true);
      const f = norm(offers.map((o) => o.delivery.freshOnArrivalDays), false);
      const r = norm(offers.map((o) => o.rating), false);
      const e = norm(offers.map((o) => o.delivery.etaMaxDays), true);
      offers.forEach((o, i) => {
        o.score = w.price * p[i]! + w.fresh * f[i]! + w.rating * r[i]! + w.eta * e[i]!;
      });
      offers.sort((a, b) => b.score - a.score || b.shop.ratingCount - a.shop.ratingCount || a.listing.id.localeCompare(b.listing.id));
      const pick = (key: (o: Offer) => number, dir: 1 | -1) => offers.reduce((best, o) => (dir * key(o) < dir * key(best) ? o : best), offers[0]!);
      if (offers.length > 1) {
        pick((o) => o.landedPerKgRial, 1).badges.push("CHEAPEST_LANDED");
        pick((o) => o.delivery.freshOnArrivalDays, -1).badges.push("FRESHEST");
        pick((o) => o.delivery.etaMaxDays, 1).badges.push("FASTEST");
        offers[0]!.badges.unshift("BEST_OVERALL");
      }
    }
    return { offers, excluded, preset, targetGrams, destCityId };
  }

  /** Top deliverable candidates of a produce type for the destination, cheapest landed first. */
  function candidatesForType(produceTypeId: string, destCityId: string, targetGrams = 5000, limit = 4): string[] {
    const now = clock();
    return data.listings
      .filter((l) => l.produceTypeId === produceTypeId && l.status === "PUBLISHED")
      .map((l) => landedOffer(l, destCityId, targetGrams, now))
      .filter(isOffer)
      .sort((a, b) => a.landedPerKgRial - b.landedPerKgRial)
      .slice(0, limit)
      .map((o) => o.listing.id);
  }

  // ---------- seasons & nobar

  const currentMonth = (): number => jalaliMonth(clock());
  const inSeason = (pt: ProduceType, month = currentMonth()): boolean => pt.months.includes(month);
  const isPeak = (pt: ProduceType, month = currentMonth()): boolean => pt.peakMonths.includes(month);
  const isNobar = (l: Listing, now: Date = clock()): boolean => !!l.nobarUntil && new Date(l.nobarUntil) > now;

  // ---------- search (Persian-aware; OpenSearch can replace it behind the same API)

  function relevance(l: Listing, tokens: string[]): number {
    if (!tokens.length) return 1;
    const pt = mustType(l.produceTypeId);
    const shop = mustShop(l.shopId);
    const fields: Array<[string[], number]> = [
      [[pt.name, ...pt.aliases], 3],
      [[l.title], 2],
      [[l.variety ?? "", ...l.tags, l.description], 1.2],
      [[shop.name, cityById(l.originCityId)?.name ?? "", provinceOfCity(l.originCityId)?.name ?? "", categoryName.get(pt.categoryId) ?? ""], 1],
    ];
    let score = 0;
    let matched = 0;
    for (const t of tokens) {
      const tk = searchKey(t);
      let best = 0;
      for (const [texts, w] of fields) {
        for (const text of texts) {
          const words = tokenizeFa(text).map(searchKey);
          if (words.includes(tk)) best = Math.max(best, w);
          else if (tk.length >= 3 && words.some((x) => x.startsWith(tk))) best = Math.max(best, w * 0.6);
          else if (tk.length >= 3 && words.some((x) => x.length > tk.length && x.includes(tk))) best = Math.max(best, w * 0.4);
        }
      }
      if (best > 0) matched++;
      score += best;
    }
    // every meaningful token must match something
    return matched === tokens.length ? score : 0;
  }

  function search(p: SearchParams): SearchResult {
    const now = clock();
    const tokens = queryTokens(p.q ?? "");
    const hits: SearchHit[] = [];
    const notDeliverable: Excluded[] = [];
    for (const l of data.listings) {
      if (l.status !== "PUBLISHED") continue;
      const pt = mustType(l.produceTypeId);
      const shop = mustShop(l.shopId);
      if (p.category && pt.categoryId !== p.category) continue;
      if (p.produceType && pt.id !== p.produceType) continue;
      if (p.shopId && shop.id !== p.shopId) continue;
      if (p.originProvince && cityById(l.originCityId)?.provinceId !== p.originProvince) continue;
      if (p.organic && !l.isOrganic) continue;
      if (p.nobarOnly && !isNobar(l, now)) continue;
      const fr = freshnessOf(l, now);
      if (!fr.sellable) continue;
      if (p.freshOnly && fr.badge !== "FRESH_PICKED" && fr.badge !== "FRESH") continue;
      const rel = relevance(l, tokens);
      if (rel <= 0) continue;
      const offer = landedOffer(l, p.dest, packageGrams(l.packages[0]!), now);
      if (!isOffer(offer)) {
        notDeliverable.push(offer);
        continue;
      }
      hits.push({ listing: l, shop, type: pt, freshness: fr, offer, relevance: rel });
    }
    // drop incidental matches (e.g. the query only appears in a shop's name) when strong matches exist
    if (tokens.length) {
      const top = Math.max(0, ...hits.map((h) => h.relevance));
      for (let i = hits.length - 1; i >= 0; i--) if (hits[i]!.relevance < top * 0.5) hits.splice(i, 1);
    }
    const sort = p.sort ?? "relevance";
    const freshRank = (h: SearchHit) => h.offer.delivery.freshOnArrivalDays / h.freshness.shelfDays;
    hits.sort((a, b) => {
      switch (sort) {
        case "landed":
          return a.offer.landedPerKgRial - b.offer.landedPerKgRial;
        case "freshness":
          return freshRank(b) - freshRank(a);
        case "newest":
          return b.listing.publishedAt.localeCompare(a.listing.publishedAt);
        case "rating":
          return ratingBayes(b.shop) - ratingBayes(a.shop);
        default:
          return b.relevance - a.relevance || Number(isNobar(b.listing, now)) - Number(isNobar(a.listing, now)) || freshRank(b) - freshRank(a);
      }
    });
    return { hits, notDeliverable, total: hits.length };
  }

  /** Autocomplete over produce types and their aliases. */
  function suggest(q: string, limit = 6): ProduceType[] {
    const k = searchKey(q);
    if (!k) return [];
    return data.types.filter((pt) => [pt.name, ...pt.aliases].some((a) => searchKey(a).startsWith(k) || searchKey(a).includes(k))).slice(0, limit);
  }

  // ---------- cart groups (§9): one shop order per shop, shipping chosen per shop

  function quoteGroup(shop: Shop, lines: CartLine[], destCityId: string, now: Date = clock()): GroupQuote {
    const blocked: GroupQuote["blocked"] = [];
    const ok: Array<{ line: CartLine; quote: DeliveryQuote }> = [];
    for (const line of lines) {
      const grams = packageGrams(line.pkg) * line.qty;
      const q = quoteDelivery(line.listing, destCityId, grams, line.pkg.priceRial * line.qty, now);
      if (!q.deliverable) blocked.push({ line, reason: q.reason ?? "NOT_DELIVERABLE" });
      else ok.push({ line, quote: q });
    }
    const itemsRial = ok.reduce((s, x) => s + x.line.pkg.priceRial * x.line.qty, 0);
    const grams = ok.reduce((s, x) => s + packageGrams(x.line.pkg) * x.line.qty, 0);
    const options: DeliveryOption[] = [];
    if (ok.length) {
      const methods = ok[0]!.quote.options.map((o) => o.method).filter((m) => ok.every((x) => x.quote.options.some((o) => o.method === m)));
      for (const m of methods) {
        const per = ok.map((x) => x.quote.options.find((o) => o.method === m)!);
        const cost = shippingCost(shop, m, grams, itemsRial);
        if (cost === null) continue;
        const slowest = per.reduce((a, b) => (b.etaMaxDays > a.etaMaxDays ? b : a));
        options.push({
          method: m,
          label: METHOD_FA[m],
          costRial: cost,
          etaMinDays: Math.max(...per.map((o) => o.etaMinDays)),
          etaMaxDays: slowest.etaMaxDays,
          etaFrom: per.reduce((a, b) => (b.etaFrom > a.etaFrom ? b : a)).etaFrom,
          etaTo: slowest.etaTo,
          freshOnArrivalDays: Math.min(...per.map((o) => o.freshOnArrivalDays)),
        });
      }
      options.sort((a, b) => a.costRial - b.costRial || a.etaMaxDays - b.etaMaxDays);
    }
    return { shop, lines, itemsRial, grams, options, blocked };
  }

  return {
    data,
    typeById: (id: string) => typeById.get(id),
    shopById: (id: string) => shopById.get(id),
    listingById: (id: string) => listingById.get(id),
    freshnessOf,
    marketStat,
    pricePosition,
    quoteDelivery,
    ratingBayes,
    landedOffer,
    compare,
    candidatesForType,
    currentMonth,
    inSeason,
    isPeak,
    isNobar,
    search,
    suggest,
    quoteGroup,
  };
}

export type Market = ReturnType<typeof createMarket>;
