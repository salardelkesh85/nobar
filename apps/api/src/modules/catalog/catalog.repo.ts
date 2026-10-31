import { type Database, iso, isoOrNull } from "@nobar/common";
import type { Category, Listing, MarketData, ProduceType, Shop } from "@nobar/domain";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  art: string;
}

interface TypeRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  aliases: string[];
  unit_kind: ProduceType["unitKind"];
  shelf_life_days: number;
  storage: ProduceType["storage"];
  min_shelf_days_on_arrival: number;
  complaint_window_hours: number;
  months: number[];
  peak_months: number[];
  storage_tips: string;
  emoji: string;
  hue: number;
  needs_review: boolean;
}

interface ShopRow {
  id: string;
  slug: string;
  name: string;
  type: Shop["type"];
  city_id: string;
  owner_name: string;
  handling_days: number;
  acceptance_sla_hours: number;
  rating_avg: number;
  rating_count: number;
  freshness_rating_avg: number;
  cancellations_90d: number;
  joined_year: number;
  status: Shop["status"];
  story: Shop["story"];
  shipping: Shop["shipping"];
  emoji: string;
  hue: number;
  art: string;
}

interface ListingRow {
  id: string;
  slug: string;
  shop_id: string;
  produce_type_id: string;
  title: string;
  variety: string | null;
  description: string;
  grade: Listing["grade"];
  origin_city_id: string;
  is_organic: boolean;
  harvested_at: Date;
  stock_base: number;
  packages: Listing["packages"];
  is_preorder: boolean;
  preorder_dispatch_from: Date | null;
  published_at: Date;
  nobar_until: Date | null;
  tags: string[];
  status: Listing["status"];
}

const toType = (r: TypeRow): ProduceType => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  categoryId: r.category_id,
  aliases: r.aliases,
  unitKind: r.unit_kind,
  shelfLifeDays: r.shelf_life_days,
  storage: r.storage,
  minShelfDaysOnArrival: r.min_shelf_days_on_arrival,
  complaintWindowHours: r.complaint_window_hours,
  months: r.months,
  peakMonths: r.peak_months,
  storageTips: r.storage_tips,
  emoji: r.emoji,
  hue: r.hue,
  needsReview: r.needs_review,
});

const toShop = (r: ShopRow): Shop => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  type: r.type,
  cityId: r.city_id,
  ownerName: r.owner_name,
  handlingDays: r.handling_days,
  acceptanceSlaHours: r.acceptance_sla_hours,
  ratingAvg: r.rating_avg,
  ratingCount: r.rating_count,
  freshnessRatingAvg: r.freshness_rating_avg,
  cancellations90d: r.cancellations_90d,
  joinedYear: r.joined_year,
  status: r.status,
  story: r.story,
  shipping: r.shipping,
  emoji: r.emoji,
  hue: r.hue,
  art: r.art,
});

const toListing = (r: ListingRow): Listing => {
  const l: Listing = {
    id: r.id,
    slug: r.slug,
    shopId: r.shop_id,
    produceTypeId: r.produce_type_id,
    title: r.title,
    description: r.description,
    grade: r.grade,
    originCityId: r.origin_city_id,
    isOrganic: r.is_organic,
    harvestedAt: iso(r.harvested_at),
    stockBase: r.stock_base,
    packages: r.packages,
    publishedAt: iso(r.published_at),
    tags: r.tags,
    status: r.status,
  };
  if (r.variety !== null) l.variety = r.variety;
  if (r.is_preorder) l.isPreorder = true;
  const dispatch = isoOrNull(r.preorder_dispatch_from);
  if (dispatch) l.preorderDispatchFrom = dispatch;
  const nobar = isoOrNull(r.nobar_until);
  if (nobar) l.nobarUntil = nobar;
  return l;
};

/** Reads and writes the `catalog` schema only. */
export class CatalogRepo {
  constructor(private readonly db: Database) {}

  async load(): Promise<MarketData> {
    const [categories, types, shops, listings] = await Promise.all([
      this.db.query<CategoryRow>("select id, slug, name, emoji, art from catalog.categories order by position"),
      this.db.query<TypeRow>("select * from catalog.produce_types order by position"),
      this.db.query<ShopRow>("select * from catalog.shops order by position"),
      this.db.query<ListingRow>("select * from catalog.listings order by position"),
    ]);
    return {
      categories: categories.map((c): Category => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji, art: c.art })),
      types: types.map(toType),
      shops: shops.map(toShop),
      listings: listings.map(toListing),
    };
  }

  async isEmpty(): Promise<boolean> {
    const [row] = await this.db.query<{ n: number }>("select count(*)::int as n from catalog.categories");
    return (row?.n ?? 0) === 0;
  }

  /** Imports a full catalog (the demo data in development) in one transaction. */
  async importAll(data: MarketData): Promise<void> {
    await this.db.tx(async (sql) => {
      for (const [i, c] of data.categories.entries()) {
        await sql.query("insert into catalog.categories (id, slug, name, emoji, art, position) values ($1, $2, $3, $4, $5, $6)", [c.id, c.slug, c.name, c.emoji, c.art, i]);
      }
      for (const [i, t] of data.types.entries()) {
        await sql.query(
          `insert into catalog.produce_types (id, slug, name, category_id, aliases, unit_kind, shelf_life_days, storage,
             min_shelf_days_on_arrival, complaint_window_hours, months, peak_months, storage_tips, emoji, hue, needs_review, position)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [t.id, t.slug, t.name, t.categoryId, t.aliases, t.unitKind, t.shelfLifeDays, t.storage, t.minShelfDaysOnArrival, t.complaintWindowHours, t.months, t.peakMonths, t.storageTips, t.emoji, t.hue, t.needsReview, i],
        );
      }
      for (const [i, s] of data.shops.entries()) {
        await sql.query(
          `insert into catalog.shops (id, slug, name, type, city_id, owner_name, handling_days, acceptance_sla_hours, rating_avg, rating_count,
             freshness_rating_avg, cancellations_90d, joined_year, status, story, shipping, emoji, hue, art, position)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [s.id, s.slug, s.name, s.type, s.cityId, s.ownerName, s.handlingDays, s.acceptanceSlaHours, s.ratingAvg, s.ratingCount, s.freshnessRatingAvg, s.cancellations90d, s.joinedYear, s.status, JSON.stringify(s.story), JSON.stringify(s.shipping), s.emoji, s.hue, s.art, i],
        );
      }
      for (const [i, l] of data.listings.entries()) {
        await sql.query(
          `insert into catalog.listings (id, slug, shop_id, produce_type_id, title, variety, description, grade, origin_city_id, is_organic,
             harvested_at, stock_base, packages, is_preorder, preorder_dispatch_from, published_at, nobar_until, tags, status, position)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [l.id, l.slug, l.shopId, l.produceTypeId, l.title, l.variety ?? null, l.description, l.grade, l.originCityId, l.isOrganic, l.harvestedAt, l.stockBase, JSON.stringify(l.packages), l.isPreorder ?? false, l.preorderDispatchFrom ?? null, l.publishedAt, l.nobarUntil ?? null, l.tags, l.status, i],
        );
      }
    });
  }
}
