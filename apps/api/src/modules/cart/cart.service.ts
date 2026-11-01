import { Inject, Injectable } from "@nestjs/common";
import { badRequest, type Database, type Logger, TOKENS } from "@nobar/common";
import { REASON_FA, type CartLine, type GroupQuote, type Listing, type ListingPackage, type Market, type NotDeliverableReason, type Shop } from "@nobar/domain";
import { CatalogService } from "../catalog/catalog.service";

type CartIssue = NotDeliverableReason | "UNAVAILABLE" | "INSUFFICIENT_STOCK";
type StoredItem = { listingId: string; packageId: string; qty: number };

export type CartLineView = CartLine & { availablePackages: number; issue?: CartIssue };
export type CartBlockedView = { line: CartLineView; reason: CartIssue; reasonFa: string };
export type CartGroupView = Omit<GroupQuote, "lines" | "blocked"> & { lines: CartLineView[]; blocked: CartBlockedView[] };
export type CartView = {
  groups: CartGroupView[];
  itemCount: number;
  itemsRial: number;
  deliveryTotalRial: number;
  totalRial: number;
  hasIssues: boolean;
};

const ISSUE_FA: Record<CartIssue, string> = {
  ...REASON_FA,
  UNAVAILABLE: "این محصول دیگر در بازار موجود نیست",
  INSUFFICIENT_STOCK: "موجودی این بسته برای تعداد انتخاب‌شده کافی نیست",
};

/** Server cart read/write side. Prices, freshness, delivery and stock are revalidated on every read. */
@Injectable()
export class CartService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(TOKENS.LOG) private readonly log: Logger,
  ) {}

  private async rows(userId: string): Promise<StoredItem[]> {
    return this.db.query<StoredItem>("select listing_id as \"listingId\", package_id as \"packageId\", qty from ordering.cart_items where user_id = $1 order by updated_at, listing_id", [userId]);
  }

  private baseUnits(pkg: ListingPackage): number {
    return pkg.netGrams ?? pkg.units ?? 1;
  }

  private availablePackages(listing: Listing, pkg: ListingPackage): number {
    return Math.max(0, Math.floor(listing.stockBase / this.baseUnits(pkg)));
  }

  private issueReason(listing: Listing, pkg: ListingPackage, qty: number): CartIssue | undefined {
    if (listing.status !== "PUBLISHED") return "UNAVAILABLE";
    const available = this.availablePackages(listing, pkg);
    if (available === 0) return "OUT_OF_STOCK";
    if (available < qty) return "INSUFFICIENT_STOCK";
    return undefined;
  }

  private async view(userId: string, dest: string): Promise<CartView> {
    const market = await this.catalog.market();
    const stored = await this.rows(userId);
    const byShop = new Map<string, { shop: Shop; lines: CartLineView[] }>();
    const invalid: StoredItem[] = [];
    for (const item of stored) {
      const listing = market.listingById(item.listingId);
      const pkg = listing?.packages.find((candidate) => candidate.id === item.packageId);
      const shop = listing ? market.shopById(listing.shopId) : undefined;
      if (!listing || !pkg || !shop) {
        invalid.push(item);
        continue;
      }
      const issue = this.issueReason(listing, pkg, item.qty);
      const line: CartLineView = { listing, pkg, qty: item.qty, availablePackages: this.availablePackages(listing, pkg), ...(issue ? { issue } : {}) };
      const group = byShop.get(shop.id) ?? { shop, lines: [] };
      group.lines.push(line);
      byShop.set(shop.id, group);
    }
    if (invalid.length) {
      await this.db.tx(async (sql) => {
        for (const item of invalid) await sql.query("delete from ordering.cart_items where user_id = $1 and listing_id = $2 and package_id = $3", [userId, item.listingId, item.packageId]);
      });
      this.log.info({ userId, removed: invalid.length }, "removed stale cart lines");
    }

    const groups: CartGroupView[] = [];
    for (const { shop, lines } of byShop.values()) {
      const usable = lines.filter((line) => !line.issue) as CartLine[];
      const quote = market.quoteGroup(shop, usable, dest);
      const deliveryBlocked = new Map(quote.blocked.map((blocked) => [blocked.line.listing.id + ":" + blocked.line.pkg.id, blocked.reason]));
      const blocked = lines
        .map((line) => {
          const reason = line.issue ?? deliveryBlocked.get(line.listing.id + ":" + line.pkg.id);
          return reason ? { line, reason, reasonFa: ISSUE_FA[reason] } : undefined;
        })
        .filter((item): item is CartBlockedView => Boolean(item));
      groups.push({ shop: quote.shop, lines, itemsRial: quote.itemsRial, grams: quote.grams, options: quote.options, blocked });
    }
    groups.sort((a, b) => a.shop.name.localeCompare(b.shop.name, "fa"));
    const itemCount = stored.reduce((sum, item) => sum + item.qty, 0) - invalid.reduce((sum, item) => sum + item.qty, 0);
    const itemsRial = groups.reduce((sum, group) => sum + group.itemsRial, 0);
    const deliveryTotalRial = groups.reduce((sum, group) => sum + (group.options[0]?.costRial ?? 0), 0);
    const hasIssues = groups.some((group) => group.blocked.length > 0 || group.options.length === 0);
    return { groups, itemCount, itemsRial, deliveryTotalRial, totalRial: itemsRial + deliveryTotalRial, hasIssues };
  }

  async get(userId: string, dest: string): Promise<CartView> {
    return this.view(userId, dest);
  }

  private async assertLine(listingId: string, packageId: string): Promise<void> {
    const market = await this.catalog.market();
    const listing = market.listingById(listingId);
    const pkg = listing?.packages.find((candidate) => candidate.id === packageId);
    if (!listing || !pkg || listing.status !== "PUBLISHED") throw badRequest("CART_LINE_UNAVAILABLE", "این محصول دیگر برای افزودن به سبد فعال نیست");
  }

  async add(userId: string, listingId: string, packageId: string, qty: number, dest: string): Promise<CartView> {
    await this.assertLine(listingId, packageId);
    await this.db.tx(async (sql) => {
      await sql.query("insert into ordering.carts (user_id) values ($1) on conflict (user_id) do update set updated_at = now()", [userId]);
      await sql.query(
        `insert into ordering.cart_items (user_id, listing_id, package_id, qty) values ($1, $2, $3, $4)
         on conflict (user_id, listing_id, package_id) do update set qty = least(100, ordering.cart_items.qty + excluded.qty), updated_at = now()`,
        [userId, listingId, packageId, qty],
      );
    });
    return this.view(userId, dest);
  }

  async set(userId: string, listingId: string, packageId: string, qty: number, dest: string): Promise<CartView> {
    if (qty > 0) await this.assertLine(listingId, packageId);
    await this.db.tx(async (sql) => {
      if (qty === 0) {
        await sql.query("delete from ordering.cart_items where user_id = $1 and listing_id = $2 and package_id = $3", [userId, listingId, packageId]);
        return;
      }
      await sql.query("insert into ordering.carts (user_id) values ($1) on conflict (user_id) do update set updated_at = now()", [userId]);
      await sql.query(
        `insert into ordering.cart_items (user_id, listing_id, package_id, qty) values ($1, $2, $3, $4)
         on conflict (user_id, listing_id, package_id) do update set qty = excluded.qty, updated_at = now()`,
        [userId, listingId, packageId, qty],
      );
    });
    return this.view(userId, dest);
  }

  async remove(userId: string, listingId: string, packageId: string, dest: string): Promise<CartView> {
    await this.db.query("delete from ordering.cart_items where user_id = $1 and listing_id = $2 and package_id = $3", [userId, listingId, packageId]);
    return this.view(userId, dest);
  }

  async clear(userId: string, dest: string): Promise<CartView> {
    await this.db.query("delete from ordering.cart_items where user_id = $1", [userId]);
    return this.view(userId, dest);
  }
}
