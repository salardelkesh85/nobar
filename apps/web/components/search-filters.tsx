"use client";

import { CATEGORIES, PROVINCES, SORT_FA, type SortKey } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { cn, Select } from "@nobar/ui";
import { ArrowDownWideNarrow, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const ORIGIN_PROVINCES = ["azg", "mrk", "mzn", "gil", "krm", "khj", "isf"];
const TOGGLES: Array<[string, string]> = [
  ["fresh", "فقط تازه‌چین و تازه"],
  ["organic", "فقط ارگانیک"],
  ["nobar", "فقط نوبرها"],
];

function useParamSetter() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };
  return { params, set };
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex min-h-11 w-full items-center justify-between gap-3 text-sm">
      <span className={on ? "font-bold" : ""}>{label}</span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "start-[1.125rem]" : "start-0.5")} />
      </span>
    </button>
  );
}

/** Filter panel: sidebar on desktop, bottom sheet on mobile. */
export function FilterPanel() {
  const { params, set } = useParamSetter();
  const active = ["cat", "origin", "fresh", "organic", "nobar"].some((k) => params.get(k));
  return (
    <div className="divide-y divide-line">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-base font-extrabold">فیلترها</h2>
        {active ? (
          <button
            type="button"
            className="text-xs font-bold text-brand"
            onClick={() => ["cat", "origin", "fresh", "organic", "nobar"].forEach((k) => set(k, null))}
          >
            حذف فیلترها
          </button>
        ) : null}
      </div>
      <div className="py-2">
        {TOGGLES.map(([k, label]) => (
          <Switch key={k} on={params.get(k) === "1"} label={label} onClick={() => set(k, params.get(k) === "1" ? null : "1")} />
        ))}
      </div>
      <fieldset className="py-3">
        <legend className="mb-2 text-sm font-bold">دسته‌بندی</legend>
        <ul className="space-y-0.5">
          {CATEGORIES.map((c) => {
            const on = params.get("cat") === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("cat", on ? null : c.id)}
                  className={cn("flex min-h-10 w-full items-center rounded-control px-2 text-start text-sm", on ? "bg-brand-soft font-bold text-brand-strong" : "hover:bg-surface-2")}
                >
                  {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="pt-3">
        <label htmlFor="origin" className="mb-2 block text-sm font-bold">
          استان مبدأ
        </label>
        <Select id="origin" value={params.get("origin") ?? ""} onChange={(e) => set("origin", e.target.value)}>
          <option value="">همه‌ی استان‌ها</option>
          {PROVINCES.filter((p) => ORIGIN_PROVINCES.includes(p.id)).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/** Sort tabs (desktop), sort select + filter sheet button (mobile). */
export function SearchFilters({ total }: { total: number }) {
  const { params, set } = useParamSetter();
  const [open, setOpen] = useState(false);
  const sort = (params.get("sort") as SortKey) ?? "relevance";
  const activeCount = ["cat", "origin", "fresh", "organic", "nobar"].filter((k) => params.get(k)).length;

  return (
    <div className="mb-3">
      <div className="hidden items-center gap-1 rounded-t-card border border-b-0 border-line bg-surface px-4 py-2 text-sm lg:flex">
        <ArrowDownWideNarrow className="size-4 text-ink-soft" aria-hidden />
        <span className="me-2 font-bold">مرتب‌سازی:</span>
        {(Object.keys(SORT_FA) as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => set("sort", k === "relevance" ? null : k)}
            aria-pressed={sort === k}
            className={cn("min-h-9 rounded-control px-2.5", sort === k ? "font-bold text-brand" : "text-ink-soft hover:text-ink")}
          >
            {SORT_FA[k]}
          </button>
        ))}
        <span className="ms-auto text-xs text-ink-soft">{toFaDigits(total)} کالا</span>
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-sm font-bold"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          فیلتر{activeCount ? ` (${toFaDigits(activeCount)})` : ""}
        </button>
        <div className="flex-1">
          <label htmlFor="sort" className="sr-only">
            مرتب‌سازی
          </label>
          <Select id="sort" value={sort} onChange={(e) => set("sort", e.target.value)} className="min-h-10">
            {(Object.keys(SORT_FA) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_FA[k]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="فیلترها" className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="بستن">
                <X className="size-5" />
              </button>
            </div>
            <FilterPanel />
            <button type="button" onClick={() => setOpen(false)} className="mt-6 min-h-12 w-full rounded-control bg-brand font-bold text-on-brand">
              دیدن نتیجه‌ها
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
