"use client";

import { categoryById, cityName, provinceById, REASON_FA, search, type SortKey } from "@nobar/demo";
import { EmptyState, ButtonLink } from "@nobar/ui";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ListingGrid } from "@/components/listing-card";
import { FilterPanel, SearchFilters } from "@/components/search-filters";
import { useStore } from "@/lib/store";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function SearchView() {
  const sp: Record<string, string | undefined> = Object.fromEntries(useSearchParams().entries());
  const { dest } = useStore();
  const q = one(sp.q) ?? "";
  const cat = one(sp.cat);
  const origin = one(sp.origin);
  const result = search({
    dest,
    q,
    category: cat,
    originProvince: origin,
    freshOnly: one(sp.fresh) === "1",
    organic: one(sp.organic) === "1",
    nobarOnly: one(sp.nobar) === "1",
    sort: (one(sp.sort) as SortKey) ?? "relevance",
  });
  const heading = q ? `نتیجه‌های «${q}»` : cat ? categoryById(cat)?.name ?? "محصولات" : origin ? `محصولات ${provinceById(origin)?.name ?? ""}` : "همه‌ی محصولات";

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
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
        {result.hits.length ? (
          <ListingGrid hits={result.hits} className="lg:rounded-t-none lg:-mt-3" />
        ) : (
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
        )}
        {result.notDeliverable.length ? (
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
