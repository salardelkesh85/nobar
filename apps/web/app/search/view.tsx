"use client";

import { categoryById, cityName, provinceById, REASON_FA, type SearchParams, type SortKey } from "@nobar/demo";
import { Button, EmptyState, ButtonLink, Skeleton } from "@nobar/ui";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ListingGrid } from "@/components/listing-card";
import { FilterPanel, SearchFilters } from "@/components/search-filters";
import { useStore } from "@/lib/store";
import { useCatalogSearch } from "@/lib/api-catalog";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
/** results per page in API mode (the API caps a page at 100) */
const PAGE_SIZE = 48;

export function SearchView() {
  const sp: Record<string, string | undefined> = Object.fromEntries(useSearchParams().entries());
  const { dest } = useStore();
  const q = one(sp.q) ?? "";
  const cat = one(sp.cat);
  const origin = one(sp.origin);
  const searchParams = useMemo<SearchParams>(
    () => ({
      dest,
      q,
      category: cat,
      originProvince: origin,
      freshOnly: one(sp.fresh) === "1",
      organic: one(sp.organic) === "1",
      nobarOnly: one(sp.nobar) === "1",
      sort: (one(sp.sort) as SortKey) ?? "relevance",
    }),
    [dest, q, cat, origin, sp.fresh, sp.organic, sp.nobar, sp.sort],
  );
  const { result, loading, error, retry, apiMode, hasMore, loadMore, loadingMore } = useCatalogSearch(searchParams, { pageSize: PAGE_SIZE });
  const heading = q ? `نتیجه‌های «${q}»` : cat ? categoryById(cat)?.name ?? "محصولات" : origin ? `محصولات ${provinceById(origin)?.name ?? ""}` : "همه‌ی محصولات";

  return (
    <div className="studio-search-layout grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-36 rounded-card border border-line bg-surface p-4">
          <Suspense>
            <FilterPanel />
          </Suspense>
        </div>
      </aside>
      <div>
        <div className="mb-3">
          <h1 className="text-xl font-extrabold">{heading}</h1>
          <p className="text-xs text-ink-soft">
            {result.total.toLocaleString("fa-IR")} محصول که تازه به {cityName(dest)} می‌رسد
          </p>
        </div>
        <Suspense>
          <SearchFilters total={result.total} />
        </Suspense>
        {error ? (
          <div role="alert" className="my-4 rounded-card border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
            <p>{error}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={retry}>
              تلاش دوباره
            </Button>
          </div>
        ) : null}
        {loading && apiMode ? (
          <div aria-label="در حال دریافت محصولات" className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-card" />)}
          </div>
        ) : result.hits.length ? (
          <>
            <ListingGrid hits={result.hits} className="lg:rounded-t-none lg:-mt-3" />
            {hasMore ? (
              <div className="mt-4 flex flex-col items-center gap-1">
                <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "در حال دریافت…" : "نمایش محصولات بیشتر"}
                </Button>
                <p className="text-xs text-ink-soft">
                  {result.hits.length.toLocaleString("fa-IR")} از {result.total.toLocaleString("fa-IR")} محصول
                </p>
              </div>
            ) : null}
          </>
        ) : !error ? (
          <EmptyState
            icon={<Search className="size-10" />}
            title="چیزی پیدا نکردیم"
            body={q ? "املای دیگری امتحان کنید یا از باغبون بپرسید؛ او منظورتان را بهتر می‌فهمد." : "فیلترها را کمتر کنید."}
            action={
              <ButtonLink href={`/baghboon?q=${encodeURIComponent(q)}`} variant="secondary">
                از باغبون بپرسید
              </ButtonLink>
            }
          />
        ) : null}
        {!loading && result.notDeliverable.length ? (
          <details className="mt-4 rounded-card border border-dashed border-line-strong bg-surface p-4">
            <summary className="cursor-pointer text-sm font-bold text-ink-soft">
              {result.notDeliverable.length.toLocaleString("fa-IR")} محصول دیگر هم پیدا شد که تا {cityName(dest)} تازه نمی‌رسد
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {result.notDeliverable.map((x) => (
                <li key={x.listing.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {x.listing.title} — {x.shop.name}
                  </span>
                  <span className="text-ink-soft">
                    {REASON_FA[x.reason]} · مبدأ: {cityName(x.listing.originCityId)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
