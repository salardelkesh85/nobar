import { Inject, Injectable } from "@nestjs/common";
import { badRequest, conflict, type Database, iso, notFound, type Sql, TOKENS, unprocessable } from "@nobar/common";
import { isUuid, uuidv7 } from "@nobar/contracts";
import { cleanFaText, isValidNationalId, normalizeSheba } from "@nobar/fa";
import type { Listing, ListingPackage, ShippingRate } from "@nobar/domain";
import { type Actor, AuditService, SYSTEM } from "../audit/audit.service";
import { UsersService } from "../identity/users.service";
import { toListing, toShop, type ListingRow, type ShopRow } from "./catalog.repo";
import { CatalogService } from "./catalog.service";
import { KYC_VAULT, type KycVault } from "./kyc";

/** kit moderation rule (packages/demo MODERATION_QUEUE): a price moving more than 30% in one go is reviewed */
const PRICE_JUMP = 0.3;

export interface ShopInput {
  name: string;
  type: "GROWER" | "SHOP" | "COOPERATIVE";
  cityId: string;
  ownerName: string;
  handlingDays: number;
  acceptanceSlaHours: number;
  story: { title: string; body: string[]; practices: string[]; sinceYear: number };
  shipping: ShippingRate[];
  kyc: { nationalId: string; sheba: string };
}

export interface ListingInput {
  produceTypeId: string;
  title: string;
  variety?: string | undefined;
  description: string;
  grade: Listing["grade"];
  originCityId?: string | undefined;
  isOrganic: boolean;
  harvestedAt: string;
  stockBase: number;
  packages: Array<{ label: string; netGrams?: number | undefined; units?: number | undefined; priceRial: number }>;
  tags: string[];
  isPreorder: boolean;
  preorderDispatchFrom?: string | undefined;
}

const jalaliYear = (d = new Date()) => Number(new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" }).format(d).replace(/\D/g, ""));
const slugify = (s: string) =>
  cleanFaText(s)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
const cleanStory = (s: ShopInput["story"]) => ({ title: cleanFaText(s.title), body: s.body.map(cleanFaText), practices: s.practices.map(cleanFaText), sinceYear: s.sinceYear });

/**
 * The writing side of the catalog: seller onboarding with encrypted KYC, listings, quick price and
 * stock changes, and staff review (shops, listings, rule hits). Staff actions go to the audit log.
 */
@Injectable()
export class SellerCatalogService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(KYC_VAULT) private readonly vault: KycVault,
  ) {}

  private async tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
    await this.catalog.market(); // loaded before the transaction (see CatalogService.market)
    const out = await this.db.tx(fn);
    this.catalog.invalidate();
    return out;
  }

  private async ownShop(sql: Sql, userId: string): Promise<ShopRow & { review_note: string | null }> {
    const [s] = await sql.query<ShopRow & { review_note: string | null }>("select * from catalog.shops where owner_user_id = $1 for update", [userId]);
    if (!s) throw notFound("غرفه");
    return s;
  }

  private async ownListing(sql: Sql, userId: string, id: string): Promise<{ shop: ShopRow; listing: ListingRow & { moderation_note: string | null } }> {
    const shop = await this.ownShop(sql, userId);
    const [listing] = await sql.query<ListingRow & { moderation_note: string | null }>("select * from catalog.listings where id = $1 and shop_id = $2 for update", [id, shop.id]);
    if (!listing) throw notFound("محصول");
    return { shop, listing };
  }

  // ---------- seller: shop

  async myShop(userId: string) {
    const [s] = await this.db.query<ShopRow & { review_note: string | null }>("select * from catalog.shops where owner_user_id = $1", [userId]);
    if (!s) throw notFound("غرفه");
    const [k] = await this.db.query<{ national_id_last4: string; sheba_last4: string; submitted_at: Date }>(
      "select national_id_last4, sheba_last4, submitted_at from catalog.shop_kyc where shop_id = $1",
      [s.id],
    );
    return {
      shop: toShop(s),
      reviewNote: s.review_note,
      kyc: k ? { nationalIdLast4: k.national_id_last4, shebaLast4: k.sheba_last4, submittedAt: iso(k.submitted_at) } : null,
    };
  }

  /** New shop, or a corrected application after a rejection; it waits for staff approval either way. */
  async apply(userId: string, input: ShopInput) {
    if (!isValidNationalId(input.kyc.nationalId)) throw badRequest("NATIONAL_ID_INVALID", "کد ملی معتبر نیست");
    const sheba = normalizeSheba(input.kyc.sheba);
    if (!sheba) throw badRequest("SHEBA_INVALID", "شماره‌ی شبا معتبر نیست");
    const nationalId = input.kyc.nationalId.replace(/\D/g, "") || input.kyc.nationalId;
    await this.tx(async (sql) => {
      const [existing] = await sql.query<{ id: string; status: string }>("select id, status from catalog.shops where owner_user_id = $1 for update", [userId]);
      if (existing && existing.status !== "REJECTED") throw conflict("SHOP_EXISTS", "برای این حساب غرفه ثبت شده است");
      const id = existing?.id ?? uuidv7();
      const values = [
        id,
        `${slugify(input.name)}-${id.slice(-4)}`,
        cleanFaText(input.name),
        input.type,
        input.cityId,
        cleanFaText(input.ownerName),
        userId,
        input.handlingDays,
        input.acceptanceSlaHours,
        jalaliYear(),
        JSON.stringify(cleanStory(input.story)),
        JSON.stringify(input.shipping),
      ];
      if (existing) {
        await sql.query(
          `update catalog.shops set slug = $2, name = $3, type = $4, city_id = $5, owner_name = $6, owner_user_id = $7, handling_days = $8,
             acceptance_sla_hours = $9, joined_year = $10, story = $11, shipping = $12, status = 'PENDING_REVIEW', review_note = null, updated_at = now() where id = $1`,
          values,
        );
      } else {
        await sql.query(
          `insert into catalog.shops (id, slug, name, type, city_id, owner_name, owner_user_id, handling_days, acceptance_sla_hours, joined_year,
             story, shipping, status, emoji, hue, art, position)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING_REVIEW', '🧺', 130, 'apple-red',
             (select coalesce(max(position), 0) + 1 from catalog.shops))`,
          values,
        );
      }
      await sql.query(
        `insert into catalog.shop_kyc (shop_id, national_id_enc, sheba_enc, national_id_last4, sheba_last4) values ($1, $2, $3, $4, $5)
         on conflict (shop_id) do update set national_id_enc = excluded.national_id_enc, sheba_enc = excluded.sheba_enc,
           national_id_last4 = excluded.national_id_last4, sheba_last4 = excluded.sheba_last4, submitted_at = now()`,
        [id, this.vault.seal(nationalId), this.vault.seal(sheba), nationalId.slice(-4), sheba.slice(-4)],
      );
    });
    return this.myShop(userId);
  }

  async updateShop(userId: string, patch: Partial<Omit<ShopInput, "cityId" | "kyc" | "type">>) {
    await this.tx(async (sql) => {
      const s = await this.ownShop(sql, userId);
      await sql.query(
        `update catalog.shops set name = coalesce($2, name), owner_name = coalesce($3, owner_name), handling_days = coalesce($4, handling_days),
           acceptance_sla_hours = coalesce($5, acceptance_sla_hours), story = coalesce($6, story), shipping = coalesce($7, shipping), updated_at = now()
         where id = $1`,
        [
          s.id,
          patch.name ? cleanFaText(patch.name) : null,
          patch.ownerName ? cleanFaText(patch.ownerName) : null,
          patch.handlingDays ?? null,
          patch.acceptanceSlaHours ?? null,
          patch.story ? JSON.stringify(cleanStory(patch.story)) : null,
          patch.shipping ? JSON.stringify(patch.shipping) : null,
        ],
      );
    });
    return this.myShop(userId);
  }

  // ---------- seller: listings

  async myListings(userId: string) {
    const [s] = await this.db.query<{ id: string }>("select id from catalog.shops where owner_user_id = $1", [userId]);
    if (!s) throw notFound("غرفه");
    const rows = await this.db.query<ListingRow & { moderation_note: string | null }>("select * from catalog.listings where shop_id = $1 order by created_at desc, id", [s.id]);
    const market = await this.catalog.market();
    return rows.map((r) => {
      const listing = toListing(r);
      const fresh = market.typeById(listing.produceTypeId) ? market.freshnessOf(listing) : null;
      return { listing, moderationNote: r.moderation_note, freshness: fresh };
    });
  }

  /** Checks a listing against its produce type: package kind, freshness, pre-order dates. */
  private async validate(listing: Listing): Promise<void> {
    const market = await this.catalog.market({ stale: true }); // runs inside transactions
    const type = market.typeById(listing.produceTypeId);
    if (!type) throw badRequest("PRODUCE_TYPE_UNKNOWN", "نوع محصول پیدا نشد");
    for (const p of listing.packages) {
      if (type.unitKind === "WEIGHT" && !p.netGrams) throw badRequest("PACKAGE_NEEDS_WEIGHT", `برای «${type.name}» وزن هر بسته را بنویسید`);
      if (type.unitKind !== "WEIGHT" && !p.units) throw badRequest("PACKAGE_NEEDS_UNITS", `برای «${type.name}» تعداد در هر بسته را بنویسید`);
    }
    if (listing.isPreorder) {
      if (!listing.preorderDispatchFrom || new Date(listing.preorderDispatchFrom) <= new Date()) throw badRequest("PREORDER_DATE", "تاریخ شروع ارسال پیش‌فروش باید در آینده باشد");
    } else if (new Date(listing.harvestedAt).getTime() > Date.now() + 3_600_000) {
      throw badRequest("HARVEST_IN_FUTURE", "تاریخ برداشت نمی‌تواند در آینده باشد");
    }
    const fresh = market.freshnessOf(listing);
    if (!fresh.sellable) throw unprocessable("NOT_FRESH", `این محصول دیگر به اندازه‌ی کافی تازه نیست (ماندگاری «${type.name}» ${type.shelfLifeDays} روز است)`);
  }

  private toListingValue(id: string, shopId: string, shopCity: string, input: ListingInput, previous?: ListingPackage[]): Listing {
    const packages = input.packages.map((p, i): ListingPackage => {
      const keep = previous?.[i];
      return { id: keep?.id ?? `${id.slice(-6)}-p${i + 1}`, label: cleanFaText(p.label), priceRial: p.priceRial, ...(p.netGrams ? { netGrams: p.netGrams } : { units: p.units! }) };
    });
    const l: Listing = {
      id,
      slug: `${slugify(input.title)}-${id.slice(-6)}`,
      shopId,
      produceTypeId: input.produceTypeId,
      title: cleanFaText(input.title),
      description: cleanFaText(input.description),
      grade: input.grade,
      originCityId: input.originCityId ?? shopCity,
      isOrganic: input.isOrganic,
      harvestedAt: new Date(input.harvestedAt).toISOString(),
      stockBase: input.stockBase,
      packages,
      publishedAt: new Date().toISOString(),
      tags: input.tags.map(cleanFaText),
      status: "PENDING_REVIEW",
    };
    if (input.variety) l.variety = cleanFaText(input.variety);
    if (input.isPreorder) {
      l.isPreorder = true;
      if (input.preorderDispatchFrom) l.preorderDispatchFrom = new Date(input.preorderDispatchFrom).toISOString();
    }
    return l;
  }

  private async openCase(sql: Sql, listingId: string, rule: string, excerpt: string): Promise<void> {
    await sql.query("insert into catalog.moderation_cases (id, listing_id, rule, excerpt, status) values ($1, $2, $3, $4, 'OPEN')", [uuidv7(), listingId, rule, excerpt.slice(0, 200)]);
  }

  /** A new listing goes to staff review before buyers see it (kit: listing moderation). */
  async createListing(userId: string, input: ListingInput) {
    const listing = await this.tx(async (sql) => {
      const shop = await this.ownShop(sql, userId);
      if (shop.status !== "ACTIVE") throw conflict("SHOP_NOT_ACTIVE", "غرفه‌ی شما هنوز تأیید نشده است");
      const l = this.toListingValue(uuidv7(), shop.id, shop.city_id, input);
      await this.validate(l);
      await sql.query(
        `insert into catalog.listings (id, slug, shop_id, produce_type_id, title, variety, description, grade, origin_city_id, is_organic,
           harvested_at, stock_base, packages, is_preorder, preorder_dispatch_from, published_at, tags, status, position)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'PENDING_REVIEW',
           (select coalesce(max(position), 0) + 1 from catalog.listings))`,
        [l.id, l.slug, l.shopId, l.produceTypeId, l.title, l.variety ?? null, l.description, l.grade, l.originCityId, l.isOrganic, l.harvestedAt, l.stockBase, JSON.stringify(l.packages), l.isPreorder ?? false, l.preorderDispatchFrom ?? null, l.publishedAt, l.tags],
      );
      if (l.isOrganic) await this.openCase(sql, l.id, "ادعای ارگانیک — گواهی لازم است", l.title);
      return l;
    });
    return listing;
  }

  /** Content changes go back to review; price and stock have their own quick endpoints. */
  async updateListing(userId: string, id: string, patch: Partial<Omit<ListingInput, "produceTypeId">>) {
    return this.tx(async (sql) => {
      const { shop, listing } = await this.ownListing(sql, userId, id);
      const current = toListing(listing);
      const merged: ListingInput = {
        produceTypeId: current.produceTypeId,
        title: patch.title ?? current.title,
        variety: patch.variety ?? current.variety,
        description: patch.description ?? current.description,
        grade: patch.grade ?? current.grade,
        originCityId: patch.originCityId ?? current.originCityId,
        isOrganic: patch.isOrganic ?? current.isOrganic,
        harvestedAt: patch.harvestedAt ?? current.harvestedAt,
        stockBase: patch.stockBase ?? current.stockBase,
        packages: patch.packages ?? current.packages,
        tags: patch.tags ?? current.tags,
        isPreorder: patch.isPreorder ?? current.isPreorder ?? false,
        preorderDispatchFrom: patch.preorderDispatchFrom ?? current.preorderDispatchFrom,
      };
      const l = { ...this.toListingValue(current.id, shop.id, shop.city_id, merged, current.packages), slug: current.slug, publishedAt: current.publishedAt };
      await this.validate(l);
      await sql.query(
        `update catalog.listings set title = $2, variety = $3, description = $4, grade = $5, origin_city_id = $6, is_organic = $7, harvested_at = $8,
           stock_base = $9, packages = $10, tags = $11, is_preorder = $12, preorder_dispatch_from = $13, status = 'PENDING_REVIEW', moderation_note = null, updated_at = now()
         where id = $1`,
        [l.id, l.title, l.variety ?? null, l.description, l.grade, l.originCityId, l.isOrganic, l.harvestedAt, l.stockBase, JSON.stringify(l.packages), l.tags, l.isPreorder ?? false, l.preorderDispatchFrom ?? null],
      );
      if (l.isOrganic && !current.isOrganic) await this.openCase(sql, l.id, "ادعای ارگانیک — گواهی لازم است", l.title);
      return { ...l, status: "PENDING_REVIEW" as const };
    });
  }

  /** Morning stock update (persona: the local shop owner); stays published. */
  async setStock(userId: string, id: string, stockBase: number) {
    return this.tx(async (sql) => {
      const { listing } = await this.ownListing(sql, userId, id);
      const [row] = await sql.query<ListingRow>("update catalog.listings set stock_base = $2, updated_at = now() where id = $1 returning *", [listing.id, stockBase]);
      return toListing(row!);
    });
  }

  /** Quick price change; a jump of more than 30% opens a review case but the price applies at once. */
  async setPrices(userId: string, id: string, prices: Array<{ packageId: string; priceRial: number }>) {
    return this.tx(async (sql) => {
      const { listing } = await this.ownListing(sql, userId, id);
      const packages = toListing(listing).packages;
      for (const p of prices) {
        const pkg = packages.find((x) => x.id === p.packageId);
        if (!pkg) throw notFound("بسته");
        if (Math.abs(p.priceRial - pkg.priceRial) > pkg.priceRial * PRICE_JUMP) {
          await this.openCase(sql, listing.id, "تغییر قیمت بیش از ۳۰٪ در یک روز", `${pkg.label}: ${pkg.priceRial / 10} → ${p.priceRial / 10} تومان`);
        }
        pkg.priceRial = p.priceRial;
      }
      const [row] = await sql.query<ListingRow>("update catalog.listings set packages = $2, updated_at = now() where id = $1 returning *", [listing.id, JSON.stringify(packages)]);
      return toListing(row!);
    });
  }

  async pause(userId: string, id: string) {
    return this.tx(async (sql) => {
      const { listing } = await this.ownListing(sql, userId, id);
      if (listing.status !== "PUBLISHED") throw conflict("LISTING_STATE", "فقط محصول منتشرشده را می‌شود متوقف کرد");
      const [row] = await sql.query<ListingRow>("update catalog.listings set status = 'PAUSED', updated_at = now() where id = $1 returning *", [listing.id]);
      return toListing(row!);
    });
  }

  /** Back on sale — unless staff paused it, then it goes to review again. */
  async resume(userId: string, id: string) {
    return this.tx(async (sql) => {
      const { listing } = await this.ownListing(sql, userId, id);
      if (listing.status !== "PAUSED") throw conflict("LISTING_STATE", "این محصول متوقف نیست");
      const l = toListing(listing);
      if (!listing.moderation_note) await this.validate(l);
      const next = listing.moderation_note ? "PENDING_REVIEW" : "PUBLISHED";
      const [row] = await sql.query<ListingRow>("update catalog.listings set status = $2, updated_at = now() where id = $1 returning *", [listing.id, next]);
      return toListing(row!);
    });
  }

  // ---------- staff

  async kycQueue() {
    const rows = await this.db.query<ShopRow & { national_id_last4: string | null; sheba_last4: string | null; submitted_at: Date | null }>(
      `select s.*, k.national_id_last4, k.sheba_last4, k.submitted_at from catalog.shops s left join catalog.shop_kyc k on k.shop_id = s.id
       where s.status = 'PENDING_REVIEW' order by k.submitted_at nulls last, s.id`,
    );
    return rows.map((r) => ({
      shop: toShop(r),
      nationalIdLast4: r.national_id_last4,
      shebaLast4: r.sheba_last4,
      submittedAt: r.submitted_at ? iso(r.submitted_at) : null,
    }));
  }

  private async shopForStaff(sql: Sql, shopId: string) {
    const [s] = await sql.query<{ id: string; name: string; status: string; owner_user_id: string | null }>("select id, name, status, owner_user_id from catalog.shops where id = $1 for update", [shopId]);
    if (!s) throw notFound("غرفه");
    return s;
  }

  async approveShop(actor: Actor, shopId: string) {
    await this.tx(async (sql) => {
      const s = await this.shopForStaff(sql, shopId);
      if (s.status !== "PENDING_REVIEW" && s.status !== "SUSPENDED") throw conflict("SHOP_STATE", "این غرفه در انتظار تأیید نیست");
      await sql.query("update catalog.shops set status = 'ACTIVE', review_note = null, updated_at = now() where id = $1", [s.id]);
      if (s.owner_user_id) await this.users.grantRole(sql, s.owner_user_id, "SELLER");
      await this.audit.record(sql, actor, s.status === "SUSPENDED" ? "فعال‌سازی دوباره‌ی غرفه" : "تأیید هویت غرفه", s.name);
    });
  }

  async rejectShop(actor: Actor, shopId: string, reason: string) {
    await this.tx(async (sql) => {
      const s = await this.shopForStaff(sql, shopId);
      if (s.status !== "PENDING_REVIEW") throw conflict("SHOP_STATE", "این غرفه در انتظار تأیید نیست");
      await sql.query("update catalog.shops set status = 'REJECTED', review_note = $2, updated_at = now() where id = $1", [s.id, reason]);
      await this.audit.record(sql, actor, "رد درخواست غرفه", `${s.name}: ${reason}`);
    });
  }

  /** A suspended shop and its listings disappear from the store; open orders continue. */
  async suspendShop(actor: Actor, shopId: string, reason: string) {
    await this.tx(async (sql) => {
      const s = await this.shopForStaff(sql, shopId);
      if (s.status !== "ACTIVE") throw conflict("SHOP_STATE", "فقط غرفه‌ی فعال را می‌شود تعلیق کرد");
      await sql.query("update catalog.shops set status = 'SUSPENDED', review_note = $2, updated_at = now() where id = $1", [s.id, reason]);
      await this.audit.record(sql, actor, "تعلیق غرفه", `${s.name}: ${reason}`);
    });
  }

  async moderationQueue() {
    const pending = await this.db.query<ListingRow>("select * from catalog.listings where status = 'PENDING_REVIEW' order by updated_at, id");
    const cases = await this.db.query<{ id: string; listing_id: string; rule: string; excerpt: string; opened_at: Date }>(
      "select id, listing_id, rule, excerpt, opened_at from catalog.moderation_cases where status = 'OPEN' order by opened_at",
    );
    return {
      pendingListings: pending.map(toListing),
      cases: cases.map((c) => ({ id: c.id, listingId: c.listing_id, rule: c.rule, excerpt: c.excerpt, openedAt: iso(c.opened_at) })),
    };
  }

  private async listingForStaff(sql: Sql, id: string) {
    const [l] = await sql.query<{ id: string; title: string; status: string }>("select id, title, status from catalog.listings where id = $1 for update", [id]);
    if (!l) throw notFound("محصول");
    return l;
  }

  async approveListing(actor: Actor, id: string) {
    await this.tx(async (sql) => {
      const l = await this.listingForStaff(sql, id);
      if (l.status !== "PENDING_REVIEW") throw conflict("LISTING_STATE", "این محصول در انتظار بررسی نیست");
      await sql.query("update catalog.listings set status = 'PUBLISHED', published_at = now(), moderation_note = null, updated_at = now() where id = $1", [l.id]);
      await sql.query("update catalog.moderation_cases set status = 'CLOSED', closed_at = now() where listing_id = $1 and status = 'OPEN'", [l.id]);
      await this.audit.record(sql, actor, "تأیید آگهی", l.title);
    });
  }

  async rejectListing(actor: Actor, id: string, reason: string) {
    await this.tx(async (sql) => {
      const l = await this.listingForStaff(sql, id);
      if (l.status === "PAUSED") throw conflict("LISTING_STATE", "این محصول قبلاً متوقف شده است");
      await sql.query("update catalog.listings set status = 'PAUSED', moderation_note = $2, updated_at = now() where id = $1", [l.id, reason]);
      await sql.query("update catalog.moderation_cases set status = 'CLOSED', closed_at = now() where listing_id = $1 and status = 'OPEN'", [l.id]);
      await this.audit.record(sql, actor, "رد آگهی", `${l.title}: ${reason}`);
    });
  }

  async closeCase(actor: Actor, caseId: string) {
    if (!isUuid(caseId)) throw notFound("مورد");
    await this.tx(async (sql) => {
      const [c] = await sql.query<{ rule: string }>("update catalog.moderation_cases set status = 'CLOSED', closed_at = now() where id = $1 and status = 'OPEN' returning rule", [caseId]);
      if (!c) throw notFound("مورد");
      await this.audit.record(sql, actor, "بستن مورد بررسی", c.rule);
    });
  }

  /** Timer: listings too old to sell are paused automatically (kit: freshness meter). */
  async pauseStale(): Promise<number> {
    const market = await this.catalog.market();
    const stale = market.data.listings.filter((l) => l.status === "PUBLISHED" && !market.freshnessOf(l).sellable);
    if (!stale.length) return 0;
    await this.tx(async (sql) => {
      for (const l of stale) {
        const rows = await sql.query("update catalog.listings set status = 'PAUSED', updated_at = now() where id = $1 and status = 'PUBLISHED' returning id", [l.id]);
        if (rows.length) await this.audit.record(sql, SYSTEM, "توقف خودکار آگهی (خارج از تازگی)", l.title);
      }
    });
    return stale.length;
  }
}
