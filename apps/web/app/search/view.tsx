"use client";

import { categoryById, cityName, provinceById, REASON_FA, type SearchParams, type SortKey } from "@nobar/demo";
import { Button, EmptyState, ButtonLink, Skeleton } from "@nobar/ui";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ListingGrid } from "@/components/listing-card";
import { FilterPanel, SearchToolbar } from "@/components/search-filters";
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
    <div className="nx-search">
      <aside className="nx-search-side">
        <div className="nx-filter-card">
          <Suspense>
            <FilterPanel />
          </Suspense>
        </div>
      </aside>
      <div className="nx-search-main">
        <div className="nx-search-head">
          <h1>{heading}</h1>
          <p>
            {loading && apiMode ? "در حال جستجو…" : `${result.total.toLocaleString("fa-IR")} کالا که تازه به ${cityName(dest)} می‌رسد`}
          </p>
        </div>
        <Suspense>
          <SearchToolbar total={result.total} />
        </Suspense>
        {error ? (
          <div role="alert" className="nx-search-error">
            <p>{error}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={retry}>
              تلاش دوباره
            </Button>
          </div>
        ) : null}
        {loading && apiMode ? (
          <div aria-label="در حال دریافت محصولات" className="nx-grid">
            {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[3/5] rounded-xl" />)}
          </div>
        ) : result.hits.length ? (
          <>
            <ListingGrid hits={result.hits} />
            {hasMore ? (
              <div className="nx-more">
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
          <details className="nx-undeliverable">
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
