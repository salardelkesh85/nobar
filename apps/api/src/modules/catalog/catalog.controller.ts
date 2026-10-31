import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { Public, ZodPipe } from "@nobar/common";
import { BoolQuerySchema } from "@nobar/contracts";
import { CITIES, DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import { z } from "zod";
import { CatalogService } from "./catalog.service";

const DESTINATIONS = CITIES.filter((c) => c.destination).map((c) => c.id) as [string, ...string[]];
const Dest = z.enum(DESTINATIONS, { error: "شهر مقصد پشتیبانی نمی‌شود" }).default(DEFAULT_CITY_ID);
const Grams = z.coerce.number().int().min(250).max(50_000);
const Id = z.string().trim().min(1).max(80);

const DestQuery = z.object({ dest: Dest });
const SearchQuery = z.object({
  dest: Dest,
  q: z.string().trim().max(100).optional(),
  category: Id.optional(),
  produceType: Id.optional(),
  originProvince: Id.optional(),
  shopId: Id.optional(),
  organic: BoolQuerySchema.optional(),
  freshOnly: BoolQuerySchema.optional(),
  nobarOnly: BoolQuerySchema.optional(),
  sort: z.enum(["relevance", "landed", "freshness", "newest", "rating"]).optional(),
});
// the store's compare tray holds at most 4 listings (apps/web/components/actions.tsx)
const CompareQuery = z.object({
  dest: Dest,
  ids: z
    .string()
    .transform((v) => [...new Set(v.split(",").map((x) => x.trim()).filter(Boolean))])
    .pipe(z.array(Id).min(1, "دست‌کم یک محصول برای مقایسه لازم است").max(4, "حداکثر ۴ محصول را می‌شود مقایسه کرد")),
  grams: Grams.default(5000),
  preset: z.enum(["balanced", "budget", "freshest", "fastest"]).default("balanced"),
});
const CandidatesQuery = z.object({ dest: Dest, grams: Grams.default(5000) });
const ShopsQuery = z.object({ city: z.string().max(40).optional() });
const SuggestQuery = z.object({ q: z.string().trim().max(50).default("") });

const strip = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** Public catalog: browsing, search, comparison. Prices, stock and freshness always come from here. */
@Public()
@Controller("v1")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get("catalog/categories")
  categories() {
    return this.catalog.categories();
  }

  @Get("catalog/produce-types")
  produceTypes() {
    return this.catalog.produceTypes();
  }

  @Get("catalog/produce-types/:id/candidates")
  candidates(@Param("id") id: string, @Query(new ZodPipe(CandidatesQuery)) q: z.infer<typeof CandidatesQuery>) {
    return this.catalog.candidates(id, q.dest, q.grams);
  }

  @Get("shops")
  shops(@Query(new ZodPipe(ShopsQuery)) q: z.infer<typeof ShopsQuery>) {
    return this.catalog.shops(q.city);
  }

  @Get("shops/:slug")
  shop(@Param("slug") slug: string) {
    return this.catalog.shop(slug);
  }

  @Get("listings/:slug")
  listing(@Param("slug") slug: string, @Query(new ZodPipe(DestQuery)) q: z.infer<typeof DestQuery>) {
    return this.catalog.listing(slug, q.dest);
  }

  @Get("search")
  search(@Query(new ZodPipe(SearchQuery)) q: z.infer<typeof SearchQuery>) {
    return this.catalog.search(strip(q));
  }

  @Get("compare")
  compare(@Query(new ZodPipe(CompareQuery)) q: z.infer<typeof CompareQuery>) {
    return this.catalog.compare(q.ids, q.dest, q.grams, q.preset);
  }

  @Get("suggest")
  suggest(@Query(new ZodPipe(SuggestQuery)) q: z.infer<typeof SuggestQuery>) {
    return this.catalog.suggest(q.q);
  }
}
