import { Controller, Get, Inject, Injectable, Module, Query } from "@nestjs/common";
import { type AuthUser, consume, CurrentUser, type Database, type Migration, Public, type ServiceDeps, TOKENS, ZodPipe } from "@nobar/common";
import { CITIES, DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import { isOffer, type Listing, type Market, type Offer } from "@nobar/domain";
import { z } from "zod";
import type { ApiConfig } from "../../config";
import { CartModule } from "../cart/cart.module";
import { CartService } from "../cart/cart.service";
import { CatalogModule } from "../catalog/catalog.module";
import { CatalogService } from "../catalog/catalog.service";

export const recommendationMigrations: Migration[] = [
  {
    name: "recommendation/0001_init",
    sql: `
      create schema if not exists recommendation;

      -- one row per listing in a paid order, copied from order.placed events (this module never reads ordering tables)
      create table recommendation.purchases (
        order_id uuid not null,
        listing_id text not null,
        checkout_id uuid not null,
        user_id uuid not null,
        qty int not null check (qty > 0),
        purchased_at timestamptz not null default now(),
        primary key (order_id, listing_id)
      );
      create index purchases_listing on recommendation.purchases (listing_id, purchased_at desc);
      create index purchases_checkout on recommendation.purchases (checkout_id);
      create index purchases_user on recommendation.purchases (user_id, purchased_at desc);
    `,
  },
];

const POPULAR_DAYS = 30;
const CO_PURCHASE_DAYS = 90;
const LIMIT = 8;

export type ReasonCode = "BOUGHT_TOGETHER" | "POPULAR" | "PEAK_SEASON" | "IN_SEASON";
/** every recommendation says why it is there, in words a buyer can check */
const REASON_FA: Record<ReasonCode, string> = {
  BOUGHT_TOGETHER: "خریداران این محصول، این را هم خریده‌اند",
  POPULAR: "پرفروش این ماه",
  PEAK_SEASON: "اوج فصل",
  IN_SEASON: "در فصل",
};

export interface Recommendation {
  listingId: string;
  slug: string;
  title: string;
  produceTypeId: string;
  shopName: string;
  landedPerKgRial: number;
  arrivesWithinDays: number;
  freshDaysOnArrival: number;
  reasonCode: ReasonCode;
  reason: string;
}

/**
 * Recommendations from three plain signals: what is bought together, what sells this month, and what is
 * in season. Only listings that reach the destination fresh are offered, at most one per produce type.
 * With no purchase history (cold start) the season decides. Owns the `recommendation` schema.
 */
@Injectable()
export class RecommendationService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(CartService) private readonly cart: CartService,
  ) {}

  async subscribe(deps: Pick<ServiceDeps, "bus" | "db" | "log">): Promise<void> {
    await consume(deps, "recommendation.purchases", ["order.placed"], async (event, sql) => {
      const d = event.data;
      for (const item of d.items ?? []) {
        await sql.query(
          "insert into recommendation.purchases (order_id, listing_id, checkout_id, user_id, qty) values ($1, $2, $3, $4, $5) on conflict (order_id, listing_id) do update set qty = recommendation.purchases.qty + excluded.qty",
          [d.orderId, item.listingId, d.checkoutId, d.buyerId, item.qty],
        );
      }
    });
  }

  private get enabled(): boolean {
    return this.config.RECOMMENDATIONS !== "false";
  }

  private async popularity(): Promise<Map<string, number>> {
    const rows = await this.db.query<{ listing_id: string; n: number }>(
      "select listing_id, count(distinct order_id)::int as n from recommendation.purchases where purchased_at > now() - make_interval(days => $1) group by listing_id",
      [POPULAR_DAYS],
    );
    return new Map(rows.map((r) => [r.listing_id, r.n]));
  }

  /** Listings bought in the same checkout, or by the same buyers, as any of `listingIds`. */
  private async boughtWith(listingIds: string[]): Promise<Map<string, number>> {
    if (!listingIds.length) return new Map();
    const rows = await this.db.query<{ listing_id: string; n: number }>(
      `select other.listing_id, count(distinct other.user_id)::int as n
       from recommendation.purchases seed
       join recommendation.purchases other on (other.checkout_id = seed.checkout_id or other.user_id = seed.user_id) and other.listing_id <> all($1::text[])
       where seed.listing_id = any($1::text[]) and seed.purchased_at > now() - make_interval(days => $2)
       group by other.listing_id`,
      [listingIds, CO_PURCHASE_DAYS],
    );
    return new Map(rows.map((r) => [r.listing_id, r.n]));
  }

  private rank(m: Market, dest: string, opts: { together: Map<string, number>; popular: Map<string, number>; excludeListings: Set<string>; excludeTypes: Set<string>; preferCategory?: string }): Recommendation[] {
    const scored: Array<{ offer: Offer; score: number; code: ReasonCode }> = [];
    for (const l of m.data.listings) {
      if (l.status !== "PUBLISHED" || l.isPreorder || opts.excludeListings.has(l.id) || opts.excludeTypes.has(l.produceTypeId)) continue;
      const type = m.typeById(l.produceTypeId);
      if (!type) continue;
      const offer = m.landedOffer(l, dest, 1000);
      if (!isOffer(offer)) continue;
      const together = opts.together.get(l.id) ?? 0;
      const popular = opts.popular.get(l.id) ?? 0;
      const peak = m.isPeak(type);
      const season = m.inSeason(type);
      // out of season and never bought: nothing to say about it
      if (!together && !popular && !season) continue;
      const code: ReasonCode = together ? "BOUGHT_TOGETHER" : popular ? "POPULAR" : peak ? "PEAK_SEASON" : "IN_SEASON";
      const score = together * 10 + popular * 2 + (peak ? 3 : season ? 1 : 0) + (opts.preferCategory === type.categoryId ? 1 : 0) + m.ratingBayes(offer.shop) / 5 + offer.freshness.ratio;
      scored.push({ offer, score, code });
    }
    scored.sort((a, b) => b.score - a.score || a.offer.listing.id.localeCompare(b.offer.listing.id));
    const seenTypes = new Set<string>();
    const out: Recommendation[] = [];
    for (const s of scored) {
      const l: Listing = s.offer.listing;
      if (seenTypes.has(l.produceTypeId)) continue;
      seenTypes.add(l.produceTypeId);
      out.push({
        listingId: l.id,
        slug: l.slug,
        title: l.title,
        produceTypeId: l.produceTypeId,
        shopName: s.offer.shop.name,
        landedPerKgRial: s.offer.landedPerKgRial,
        arrivesWithinDays: s.offer.delivery.etaMaxDays,
        freshDaysOnArrival: s.offer.delivery.freshOnArrivalDays,
        reasonCode: s.code,
        reason: REASON_FA[s.code],
      });
      if (out.length >= LIMIT) break;
    }
    return out;
  }

  /** Home page: what sells and what is in season. */
  async forHome(dest: string) {
    if (!this.enabled) return { enabled: false, items: [] };
    const m = await this.catalog.market();
    return { enabled: true, items: this.rank(m, dest, { together: new Map(), popular: await this.popularity(), excludeListings: new Set(), excludeTypes: new Set() }) };
  }

  /** Product page: what goes with this listing (other produce types; other sellers of the same one are the compare page's job). */
  async forListing(listingId: string, dest: string) {
    if (!this.enabled) return { enabled: false, items: [] };
    const m = await this.catalog.market();
    const l = m.listingById(listingId) ?? m.data.listings.find((x) => x.slug === listingId);
    if (!l) return { enabled: true, items: [] };
    const category = m.typeById(l.produceTypeId)?.categoryId;
    return {
      enabled: true,
      items: this.rank(m, dest, { together: await this.boughtWith([l.id]), popular: await this.popularity(), excludeListings: new Set([l.id]), excludeTypes: new Set([l.produceTypeId]), ...(category ? { preferCategory: category } : {}) }),
    };
  }

  /** Cart page: what buyers add next to what is already in this cart. */
  async forCart(userId: string, dest: string) {
    if (!this.enabled) return { enabled: false, items: [] };
    const m = await this.catalog.market();
    const lines = (await this.cart.get(userId, dest)).groups.flatMap((g) => g.lines);
    const ids = lines.map((x) => x.listing.id);
    return {
      enabled: true,
      items: this.rank(m, dest, { together: await this.boughtWith(ids), popular: await this.popularity(), excludeListings: new Set(ids), excludeTypes: new Set(lines.map((x) => x.listing.produceTypeId)) }),
    };
  }
}

const DESTINATIONS = CITIES.filter((city) => city.destination).map((city) => city.id) as [string, ...string[]];
const Dest = z.enum(DESTINATIONS, { error: "شهر مقصد پشتیبانی نمی‌شود" }).default(DEFAULT_CITY_ID);
const HomeQuery = z.object({ dest: Dest, listingId: z.string().trim().min(1).max(200).optional() });
const CartQuery = z.object({ dest: Dest });

@Controller("v1/recommendations")
class RecommendationController {
  constructor(@Inject(RecommendationService) private readonly recommendations: RecommendationService) {}

  /** With `listingId`: what goes with that listing; without: the home page list. */
  @Public()
  @Get()
  list(@Query(new ZodPipe(HomeQuery)) q: z.infer<typeof HomeQuery>) {
    return q.listingId ? this.recommendations.forListing(q.listingId, q.dest) : this.recommendations.forHome(q.dest);
  }

  @Get("cart")
  cart(@CurrentUser() user: AuthUser, @Query(new ZodPipe(CartQuery)) q: z.infer<typeof CartQuery>) {
    return this.recommendations.forCart(user.id, q.dest);
  }
}

@Module({ imports: [CatalogModule, CartModule], controllers: [RecommendationController], providers: [RecommendationService], exports: [RecommendationService] })
export class RecommendationModule {}

