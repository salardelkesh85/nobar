import { Inject, Injectable } from "@nestjs/common";
import { type Database, type Logger, notFound, TOKENS } from "@nobar/common";
import {
  createMarket,
  type Excluded,
  harvestPhrase,
  type Listing,
  type Market,
  type Offer,
  type Preset,
  REASON_FA,
  type SearchParams,
  type Shop,
} from "@nobar/domain";
import { CatalogRepo } from "./catalog.repo";

/** How long a catalog snapshot is reused before it is read again (writes also refresh it). */
const SNAPSHOT_TTL_MS = 30_000;

export type ShopCard = Pick<Shop, "id" | "slug" | "name" | "type" | "cityId" | "ratingAvg" | "ratingCount" | "emoji" | "hue" | "art" | "status"> & {
  /** Bayesian rating used for ranking (docs/02 §8.2) */
  rating: number;
};
export type OfferView = Omit<Offer, "listing" | "shop"> & { listingId: string; shopId: string };
export interface ExcludedView {
  listingId: string;
  shopId: string;
  reason: Excluded["reason"];
  reasonFa: string;
}

/**
 * Catalog read side. The rules are the shared @nobar/domain code, run on a snapshot of the `catalog`
 * schema, so the API and the frontends compute freshness, delivery and landed prices the same way.
 */
@Injectable()
export class CatalogService {
  private readonly repo: CatalogRepo;
  private snapshot?: { market: Market; at: number };
  private loading?: Promise<Market>;

  constructor(
    @Inject(TOKENS.DB) db: Database,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {
    this.repo = new CatalogRepo(db);
  }

  /** Loads the demo catalog into an empty database (development only). */
  async seedIfEmpty(load: () => Promise<Parameters<CatalogRepo["importAll"]>[0]>): Promise<boolean> {
    if (!(await this.repo.isEmpty())) return false;
    const data = await load();
    await this.repo.importAll(data);
    this.invalidate();
    this.log.info({ shops: data.shops.length, listings: data.listings.length }, "demo catalog imported");
    return true;
  }

  invalidate(): void {
    this.snapshot = undefined;
  }

  async market(): Promise<Market> {
    if (this.snapshot && Date.now() - this.snapshot.at < SNAPSHOT_TTL_MS) return this.snapshot.market;
    this.loading ??= this.repo
      .load()
      .then((data) => {
        const market = createMarket(data, () => new Date());
        this.snapshot = { market, at: Date.now() };
        return market;
      })
      .finally(() => {
        this.loading = undefined;
      });
    return this.loading;
  }

  // ---------- views

  private shopCard(m: Market, s: Shop): ShopCard {
    const { id, slug, name, type, cityId, ratingAvg, ratingCount, emoji, hue, art, status } = s;
    return { id, slug, name, type, cityId, ratingAvg, ratingCount, emoji, hue, art, status, rating: m.ratingBayes(s) };
  }

  private offerView(o: Offer): OfferView {
    const { listing, shop, ...rest } = o;
    return { ...rest, listingId: listing.id, shopId: shop.id };
  }

  private excludedView(x: Excluded): ExcludedView {
    return { listingId: x.listing.id, shopId: x.shop.id, reason: x.reason, reasonFa: REASON_FA[x.reason] };
  }

  private findListing(m: Market, slugOrId: string): Listing {
    const l = m.listingById(slugOrId) ?? m.data.listings.find((x) => x.slug === slugOrId);
    if (!l || l.status !== "PUBLISHED") throw notFound("محصول");
    return l;
  }

  // ---------- queries

  async categories() {
    return (await this.market()).data.categories;
  }

  async produceTypes() {
    const m = await this.market();
    return m.data.types.map((t) => ({ ...t, inSeason: m.inSeason(t), isPeak: m.isPeak(t), marketStat: m.marketStat(t.id) }));
  }

  async shops(cityId?: string) {
    const m = await this.market();
    return m.data.shops.filter((s) => s.status === "ACTIVE" && (!cityId || s.cityId === cityId)).map((s) => this.shopCard(m, s));
  }

  async shop(slugOrId: string) {
    const m = await this.market();
    const s = m.shopById(slugOrId) ?? m.data.shops.find((x) => x.slug === slugOrId);
    if (!s || s.status !== "ACTIVE") throw notFound("غرفه");
    const listings = m.data.listings.filter((l) => l.shopId === s.id && l.status === "PUBLISHED");
    return { shop: { ...s, rating: m.ratingBayes(s) }, listings };
  }

  async listing(slugOrId: string, dest: string) {
    const m = await this.market();
    const l = this.findListing(m, slugOrId);
    const shop = m.shopById(l.shopId)!;
    const type = m.typeById(l.produceTypeId)!;
    const freshness = m.freshnessOf(l);
    return {
      listing: l,
      shop: this.shopCard(m, shop),
      type,
      freshness: { ...freshness, phrase: harvestPhrase(freshness) },
      delivery: m.quoteDelivery(l, dest),
      marketStat: m.marketStat(l.produceTypeId),
      pricePosition: m.pricePosition(l),
      isNobar: m.isNobar(l),
    };
  }

  async search(p: SearchParams) {
    const m = await this.market();
    const r = m.search(p);
    return {
      total: r.total,
      hits: r.hits.map((h) => ({
        listing: h.listing,
        shop: this.shopCard(m, h.shop),
        freshness: h.freshness,
        offer: this.offerView(h.offer),
        relevance: h.relevance,
        isNobar: m.isNobar(h.listing),
      })),
      notDeliverable: r.notDeliverable.map((x) => this.excludedView(x)),
    };
  }

  async compare(ids: string[], dest: string, grams: number, preset: Preset) {
    const m = await this.market();
    const c = m.compare(ids, dest, grams, preset);
    return {
      destCityId: c.destCityId,
      targetGrams: c.targetGrams,
      preset: c.preset,
      offers: c.offers.map((o) => ({ ...this.offerView(o), listing: o.listing, shop: this.shopCard(m, o.shop) })),
      excluded: c.excluded.map((x) => this.excludedView(x)),
    };
  }

  /** Cheapest deliverable listings of one produce type, for "compare with other sellers". */
  async candidates(produceTypeId: string, dest: string, grams: number) {
    const m = await this.market();
    if (!m.typeById(produceTypeId)) throw notFound("نوع محصول");
    return m.candidatesForType(produceTypeId, dest, grams);
  }

  async suggest(q: string) {
    return (await this.market()).suggest(q).map(({ id, slug, name, emoji, categoryId }) => ({ id, slug, name, emoji, categoryId }));
  }
}
