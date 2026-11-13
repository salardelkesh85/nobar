import { cityName } from "@nobar/contracts/cities";
import { COMPARE_BADGE_FA, harvestPhrase, isOffer, type CartLine, type Market, type Offer } from "@nobar/domain";
import { searchKey } from "@nobar/fa";
import { z } from "zod";
import type { CartView } from "../cart/cart.service";
import { sanitizeUntrusted } from "./guardrails";
import type { ToolSpec } from "./llm";

// The assistant's only way to learn facts. Tools read the same catalog rules the store uses (through the
// catalog and cart modules' services, never SQL), always for the signed-in buyer and their destination.
// There is no tool that places an order, pays, or changes the cart: a basket is only ever proposed.

export interface ProposalItem {
  listingId: string;
  packageId: string;
  qty: number;
  title: string;
  label: string;
  lineRial: number;
}
export interface PricedBasket {
  summary: string;
  items: ProposalItem[];
  itemsRial: number;
  shippingRial: number;
  totalRial: number;
}

export interface ToolContext {
  userId: string;
  dest: string;
  market: Market;
  cart: () => Promise<CartView>;
  /** stores a proposal for the buyer to confirm and returns its id */
  saveProposal: (basket: PricedBasket) => Promise<string>;
}

export interface Tool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  run(ctx: ToolContext, args: z.infer<S>): Promise<unknown>;
}
const tool = <S extends z.ZodType>(t: Tool<S>): Tool<S> => t;

const offerSummary = (m: Market, o: Offer) => ({
  listingId: o.listing.id,
  title: o.listing.title,
  shop: o.shop.name,
  originCity: cityName(o.listing.originCityId),
  grade: o.listing.grade,
  organic: o.listing.isOrganic,
  harvest: harvestPhrase(o.freshness),
  freshDaysOnArrival: o.delivery.freshOnArrivalDays,
  arrivesWithinDays: o.delivery.etaMaxDays,
  landedPerKgRial: o.landedPerKgRial,
  shopRating: Math.round(m.ratingBayes(o.shop) * 10) / 10,
  packages: o.listing.packages.map((p) => ({ packageId: p.id, label: p.label, priceRial: p.priceRial })),
});

/** Prices a set of lines exactly as the cart would: items plus the cheapest delivery of each shop. */
export function priceBasket(m: Market, lines: CartLine[], dest: string, summary: string): PricedBasket | { error: string } {
  const byShop = new Map<string, CartLine[]>();
  for (const l of lines) byShop.set(l.listing.shopId, [...(byShop.get(l.listing.shopId) ?? []), l]);
  let itemsRial = 0;
  let shippingRial = 0;
  for (const [shopId, shopLines] of byShop) {
    const g = m.quoteGroup(m.shopById(shopId)!, shopLines, dest);
    if (g.blocked.length || !g.options.length) return { error: `«${(g.blocked[0]?.line ?? shopLines[0]!).listing.title}» تازه به ${cityName(dest)} نمی‌رسد` };
    itemsRial += g.itemsRial;
    shippingRial += g.options[0]!.costRial;
  }
  return {
    summary,
    items: lines.map((l) => ({ listingId: l.listing.id, packageId: l.pkg.id, qty: l.qty, title: l.listing.title, label: l.pkg.label, lineRial: l.pkg.priceRial * l.qty })),
    itemsRial,
    shippingRial,
    totalRial: itemsRial + shippingRial,
  };
}

const searchProducts = tool({
  name: "search_products",
  description: "جست‌وجوی محصولاتی که تازه به شهر خریدار می‌رسند. قیمت‌ها به ریال و تمام‌شده تا درِ خانه است.",
  schema: z.object({
    query: z.string().trim().max(100).optional().describe("نام محصول یا ویژگی، مثل «سیب ترش»"),
    organicOnly: z.boolean().optional(),
    sort: z.enum(["relevance", "landed", "freshness", "rating"]).optional().describe("landed = ارزان‌ترین تا درِ خانه"),
  }),
  async run(ctx, args) {
    const words = (args.query ?? "").split(/\s+/).filter(Boolean);
    // the whole query first, then shorter prefixes, then single words: buyers add words the catalog does not know
    // (a single word is tried only when it is exactly a produce name, so stray words do not match by accident)
    const names = new Set(ctx.market.data.types.flatMap((t) => [t.name, ...t.aliases]).map(searchKey));
    const attempts = words.length ? [...words.map((_, i) => words.slice(0, words.length - i).join(" ")), ...words.slice(1).filter((w) => names.has(searchKey(w)))] : [""];
    for (const q of [...new Set(attempts)]) {
      const r = ctx.market.search({ dest: ctx.dest, ...(q ? { q } : {}), ...(args.organicOnly ? { organic: true } : {}), ...(args.sort ? { sort: args.sort } : {}) });
      if (r.hits.length) return { destCity: cityName(ctx.dest), matchedQuery: q, total: r.total, results: r.hits.slice(0, 6).map((h) => offerSummary(ctx.market, h.offer)) };
    }
    return { destCity: cityName(ctx.dest), matchedQuery: args.query ?? "", total: 0, results: [] };
  },
});

const getProduct = tool({
  name: "get_product",
  description: "جزئیات یک محصول: توضیح غرفه‌دار (داده‌ی نامطمئن)، گزینه‌های ارسال به شهر خریدار، جایگاه قیمت در بازار و آمار غرفه.",
  schema: z.object({ listingId: z.string().trim().min(1).max(100) }),
  async run(ctx, args) {
    const m = ctx.market;
    const l = m.listingById(args.listingId);
    if (!l || l.status !== "PUBLISHED") return { error: "چنین محصولی پیدا نشد" };
    const shop = m.shopById(l.shopId)!;
    const delivery = m.quoteDelivery(l, ctx.dest);
    const stat = m.marketStat(l.produceTypeId);
    return {
      listingId: l.id,
      title: l.title,
      produceType: m.typeById(l.produceTypeId)?.name,
      sellerDescription: sanitizeUntrusted(l.description),
      grade: l.grade,
      organic: l.isOrganic,
      harvest: harvestPhrase(m.freshnessOf(l)),
      packages: l.packages.map((p) => ({ packageId: p.id, label: p.label, priceRial: p.priceRial })),
      deliverable: delivery.deliverable,
      delivery: delivery.options.map((o) => ({ method: o.label, costRial: o.costRial, arrivesWithinDays: o.etaMaxDays, freshDaysOnArrival: o.freshOnArrivalDays })),
      marketMedianPerKgRial: stat?.median ?? null,
      shop: { name: shop.name, city: cityName(shop.cityId), rating: Math.round(m.ratingBayes(shop) * 10) / 10, ratingCount: shop.ratingCount, cancellations90d: shop.cancellations90d },
    };
  },
});

const compareProducts = tool({
  name: "compare_products",
  description: "مقایسه‌ی پیشنهادهای غرفه‌های مختلف برای یک نوع محصول با فرمول ثابت مقایسه‌گر نوبر (قیمت تمام‌شده، تازگی، سرعت، امتیاز).",
  schema: z.object({ query: z.string().trim().min(1).max(60).describe("نام نوع محصول، مثل «انار»"), kilos: z.number().min(1).max(100).optional() }),
  async run(ctx, args) {
    const m = ctx.market;
    const type = m.suggest(args.query, 1)[0];
    if (!type) return { error: "این نوع محصول را نمی‌شناسم" };
    const grams = Math.round((args.kilos ?? 5) * 1000);
    const ids = m.candidatesForType(type.id, ctx.dest, grams);
    if (ids.length < 2) return { produceTypeId: type.id, produceType: type.name, destCity: cityName(ctx.dest), offers: [], note: "کمتر از دو پیشنهاد تازه به این شهر می‌رسد" };
    const c = m.compare(ids, ctx.dest, grams, "balanced");
    return {
      produceTypeId: type.id,
      produceType: type.name,
      destCity: cityName(ctx.dest),
      kilos: grams / 1000,
      // already ranked by the comparison formula: the first one is the best overall
      offers: c.offers.map((o) => ({ ...offerSummary(m, o), landedRial: o.landedRial, badges: o.badges.map((b) => COMPARE_BADGE_FA[b]) })),
    };
  },
});

const seasonal = tool({
  name: "get_seasonal_suggestions",
  description: "محصولاتی که این ماه در فصل خودشان هستند و در نوبر فروشنده دارند.",
  schema: z.object({}),
  async run(ctx) {
    const m = ctx.market;
    const sold = new Set(m.data.listings.filter((l) => l.status === "PUBLISHED").map((l) => l.produceTypeId));
    const now = m.data.types.filter((t) => sold.has(t.id) && m.inSeason(t));
    return { jalaliMonth: m.currentMonth(), inSeason: now.map((t) => t.name), peak: now.filter((t) => m.isPeak(t)).map((t) => t.name) };
  },
});

const getCart = tool({
  name: "get_cart",
  description: "سبد خرید فعلی خریدار (فقط خواندن).",
  schema: z.object({}),
  async run(ctx) {
    const cart = await ctx.cart();
    return {
      destCity: cityName(ctx.dest),
      itemCount: cart.itemCount,
      itemsRial: cart.itemsRial,
      deliveryRial: cart.deliveryTotalRial,
      totalRial: cart.totalRial,
      hasIssues: cart.hasIssues,
      shops: cart.groups.map((g) => ({
        shop: g.shop.name,
        lines: g.lines.map((l) => ({ listingId: l.listing.id, title: l.listing.title, package: l.pkg.label, qty: l.qty, lineRial: l.pkg.priceRial * l.qty })),
        blocked: g.blocked.map((b) => ({ title: b.line.listing.title, reason: b.reasonFa })),
      })),
    };
  },
});

const buildBasket = tool({
  name: "build_basket",
  description: "یک سبد میوه‌ی فصل برای تعداد نفرات و بودجه می‌چیند و برای تأیید خریدار پیشنهاد می‌دهد. چیزی به سبد خرید اضافه نمی‌شود.",
  schema: z.object({ budgetRial: z.number().int().min(100_000).max(1_000_000_000).optional(), people: z.number().int().min(1).max(50).optional() }),
  async run(ctx, args) {
    const m = ctx.market;
    const people = args.people ?? 4;
    const limit = args.budgetRial ?? 8_000_000;
    const offers: Offer[] = [];
    for (const l of m.data.listings) {
      const type = m.typeById(l.produceTypeId);
      if (!type || l.status !== "PUBLISHED" || !["fruit", "citrus"].includes(type.categoryId) || !m.inSeason(type) || l.grade === "PROCESSING" || l.isPreorder) continue;
      const o = m.landedOffer(l, ctx.dest, people >= 6 ? 3000 : 2000);
      if (isOffer(o)) offers.push(o);
    }
    // cheapest whole offers first, one per produce type, so the basket gets variety within the budget
    offers.sort((a, b) => a.landedRial - b.landedRial || a.listing.id.localeCompare(b.listing.id));
    const summary = `سبد میوه برای ${people.toLocaleString("fa-IR")} نفر`;
    const chosen: CartLine[] = [];
    const seen = new Set<string>();
    for (const o of offers) {
      if (seen.has(o.listing.produceTypeId) || chosen.length >= 5) continue;
      const trial = priceBasket(m, [...chosen, { listing: o.listing, pkg: o.pkg, qty: o.count }], ctx.dest, summary);
      if ("error" in trial || trial.totalRial > limit) continue;
      chosen.push({ listing: o.listing, pkg: o.pkg, qty: o.count });
      seen.add(o.listing.produceTypeId);
    }
    if (!chosen.length) return { destCity: cityName(ctx.dest), budgetRial: limit, people, error: "با این بودجه سبدی که تازه برسد پیدا نشد" };
    const basket = priceBasket(m, chosen, ctx.dest, summary) as PricedBasket;
    return { proposalId: await ctx.saveProposal(basket), destCity: cityName(ctx.dest), budgetRial: limit, budgetAssumed: args.budgetRial === undefined, people, ...basket };
  },
});

const proposeBasket = tool({
  name: "propose_basket",
  description: "سبدی از محصولات مشخص را قیمت‌گذاری و برای تأیید خریدار پیشنهاد می‌دهد. چیزی به سبد خرید اضافه نمی‌شود؛ خریدار باید در صفحه تأیید کند.",
  schema: z.object({
    summary: z.string().trim().min(2).max(80),
    items: z.array(z.object({ listingId: z.string().min(1).max(100), packageId: z.string().min(1).max(100), qty: z.number().int().min(1).max(50) })).min(1).max(10),
  }),
  async run(ctx, args) {
    const lines: CartLine[] = [];
    for (const item of args.items) {
      const listing = ctx.market.listingById(item.listingId);
      const pkg = listing?.packages.find((p) => p.id === item.packageId);
      if (!listing || listing.status !== "PUBLISHED" || !pkg) return { error: `محصول یا بسته‌ی ${item.listingId}/${item.packageId} وجود ندارد` };
      lines.push({ listing, pkg, qty: item.qty });
    }
    const basket = priceBasket(ctx.market, lines, ctx.dest, sanitizeUntrusted(args.summary, 80));
    if ("error" in basket) return basket;
    return { proposalId: await ctx.saveProposal(basket), destCity: cityName(ctx.dest), ...basket };
  },
});

export const TOOLS: Tool[] = [searchProducts, getProduct, compareProducts, seasonal, getCart, buildBasket, proposeBasket] as Tool[];

export const toolSpecs = (): ToolSpec[] =>
  TOOLS.map((t) => {
    const { $schema: _ignored, ...parameters } = z.toJSONSchema(t.schema) as Record<string, unknown>;
    return { name: t.name, description: t.description, parameters };
  });
