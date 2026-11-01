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
import { CITIES, PROVINCES } from "@nobar/contracts/cities";

/** How long a catalog snapshot is reused before it is read again (writes also refresh it). */
const SNAPSHOT_TTL_MS = 30_000;

export type ShopCard = Shop & {
  /** Bayesian rating used for ranking (docs/02 §8.2) */
  rating: number;
};
export type OfferView = Omit<Offer, "listing" | "shop"> & { listingId: string; shopId: string };
export interface ExcludedView {
  listingId: string;
  shopId: string;
  listing: Listing;
  shop: ShopCard;
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
    return { ...s, rating: m.ratingBayes(s) };
  }

  private offerView(o: Offer): OfferView {
    const { listing, shop, ...rest } = o;
    return { ...rest, listingId: listing.id, shopId: shop.id };
  }

  private excludedView(m: Market, x: Excluded): ExcludedView {
    return {
      listingId: x.listing.id,
      shopId: x.shop.id,
      listing: x.listing,
      shop: this.shopCard(m, x.shop),
      reason: x.reason,
      reasonFa: REASON_FA[x.reason],
    };
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
    return m.data.types.map((t) => ({ ...t, inSeason: m.inSeason(t), isPeak: m.isPeak(t), marketStat: m.marketStat(t.id) ?? null }));
  }

  async produceType(slugOrId: string) {
    const m = await this.market();
    const type = m.typeById(slugOrId) ?? m.data.types.find((item) => item.slug === slugOrId);
    if (!type) throw notFound("نوع محصول");
    const category = m.data.categories.find((item) => item.id === type.categoryId)!;
    return { ...type, category, inSeason: m.inSeason(type), isPeak: m.isPeak(type), marketStat: m.marketStat(type.id) ?? null };
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
    const category = m.data.categories.find((item) => item.id === type.categoryId)!;
    const freshness = m.freshnessOf(l);
    return {
      listing: l,
      shop: this.shopCard(m, shop),
      type,
      category,
      freshness: { ...freshness, phrase: harvestPhrase(freshness) },
      delivery: m.quoteDelivery(l, dest),
      marketStat: m.marketStat(l.produceTypeId) ?? null,
      pricePosition: m.pricePosition(l),
      isNobar: m.isNobar(l),
    };
  }

  async origin(cityId: string, dest: string) {
    const city = CITIES.find((item) => item.id === cityId);
    if (!city) throw notFound("شهر مبدأ");
    const province = PROVINCES.find((item) => item.id === city.provinceId)!;
    const m = await this.market();
    const shops = m.data.shops.filter((shop) => shop.status === "ACTIVE" && shop.cityId === cityId).map((shop) => this.shopCard(m, shop));
    const listings = m.data.listings.filter((listing) => listing.status === "PUBLISHED" && listing.originCityId === cityId);
    const result = await this.search({ dest });
    return {
      city,
      province,
      shops,
      totalListings: listings.length,
      search: {
        total: result.hits.filter((hit) => hit.listing.originCityId === cityId).length,
        hits: result.hits.filter((hit) => hit.listing.originCityId === cityId),
        notDeliverable: result.notDeliverable.filter((item) => item.listing.originCityId === cityId),
      },
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
        type: h.type,
        freshness: h.freshness,
        offer: this.offerView(h.offer),
        relevance: h.relevance,
        isNobar: m.isNobar(h.listing),
      })),
      notDeliverable: r.notDeliverable.map((x) => this.excludedView(m, x)),
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
      excluded: c.excluded.map((x) => this.excludedView(m, x)),
    };
  }

  /** Cheapest deliverable listings of one produce type, for "compare with other sellers". */
  async candidates(produceTypeId: string, dest: string, grams: number) {
    const m = await this.market();
    if (!m.typeById(produceTypeId)) throw notFound("نوع محصول");
    return m.candidatesForType(produceTypeId, dest, grams);
  }

  async suggest(q: string) {
    return (await this.market()).suggest(q).map(({ id, slug, name, emoji, hue, categoryId }) => ({ id, slug, name, emoji, hue, categoryId }));
  }
}
