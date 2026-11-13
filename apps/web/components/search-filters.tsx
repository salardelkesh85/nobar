"use client";

import { CATEGORIES, categoryById, PROVINCES, provinceById, SORT_FA, type SortKey } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { cn, Select } from "@nobar/ui";
import { ArrowDownWideNarrow, Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const ORIGIN_PROVINCES = ["azg", "mrk", "mzn", "gil", "krm", "khj", "isf"];
const FILTER_KEYS = ["cat", "origin", "fresh", "organic", "nobar"] as const;
const TOGGLES: Array<{ key: string; label: string; chip: string }> = [
  { key: "fresh", label: "فقط تازه‌چین و تازه", chip: "تازه‌چین" },
  { key: "organic", label: "فقط ارگانیک", chip: "ارگانیک" },
  { key: "nobar", label: "فقط نوبرها", chip: "نوبر" },
];
const SORTS = Object.keys(SORT_FA) as SortKey[];

function useParamSetter() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const replace = (next: URLSearchParams) => {
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    replace(next);
  };
  const clear = () => {
    const next = new URLSearchParams(params.toString());
    FILTER_KEYS.forEach((k) => next.delete(k));
    replace(next);
  };
  return { params, set, clear };
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="nx-switch">
      <span>{label}</span>
      <span className="nx-switch-track" aria-hidden>
        <span className="nx-switch-thumb" />
      </span>
    </button>
  );
}

/** Filter panel: sidebar on desktop, bottom sheet on mobile. */
export function FilterPanel() {
  const { params, set, clear } = useParamSetter();
  const active = FILTER_KEYS.some((k) => params.get(k));
  return (
    <div className="nx-filter">
      <div className="nx-filter-head">
        <h2>فیلترها</h2>
        {active ? (
          <button type="button" className="nx-filter-clear" onClick={clear}>
            حذف فیلترها
          </button>
        ) : null}
      </div>
      <div className="nx-filter-group">
        {TOGGLES.map((t) => (
          <Switch key={t.key} on={params.get(t.key) === "1"} label={t.label} onClick={() => set(t.key, params.get(t.key) === "1" ? null : "1")} />
        ))}
      </div>
      <fieldset className="nx-filter-group">
        <legend>دسته‌بندی</legend>
        <ul>
          {CATEGORIES.map((c) => {
            const on = params.get("cat") === c.id;
            return (
              <li key={c.id}>
                <button type="button" aria-pressed={on} onClick={() => set("cat", on ? null : c.id)} className={cn("nx-filter-option", on && "is-on")}>
                  <span>{c.name}</span>
                  {on ? <Check className="size-4" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="nx-filter-group">
        <label htmlFor="origin" className="nx-filter-label">
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

/** Bottom sheet (mobile); a native dialog so focus, Escape and the backdrop work. */
function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="nx-sheet"
      aria-label={label}
    >
      <div className="nx-sheet-head">
        <span className="nx-sheet-grip" aria-hidden />
        <strong>{label}</strong>
        <button type="button" onClick={onClose} className="nx-sheet-close" aria-label="بستن">
          <X className="size-5" />
        </button>
      </div>
      <div className="nx-sheet-body">{children}</div>
    </dialog>
  );
}

/**
 * Sort and filter bar above the results. Desktop: sort tabs. Mobile: a scrolling row of chips (filters, sort, quick
 * toggles) with the full filter panel and the sort list in bottom sheets. Active category and origin show as removable chips.
 */
export function SearchToolbar({ total }: { total: number }) {
  const { params, set, clear } = useParamSetter();
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const sort = (params.get("sort") as SortKey | null) ?? "relevance";
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const cat = params.get("cat");
  const origin = params.get("origin");
  const setSort = (k: SortKey) => set("sort", k === "relevance" ? null : k);

  return (
    <div className="nx-toolbar">
      <div className="nx-sortbar">
        <ArrowDownWideNarrow className="size-4" aria-hidden />
        <span className="nx-sortbar-label">مرتب‌سازی:</span>
        {SORTS.map((k) => (
          <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k} className={cn("nx-sortbar-tab", sort === k && "is-on")}>
            {SORT_FA[k]}
          </button>
        ))}
      </div>

      <div className="nx-chips" role="toolbar" aria-label="فیلتر و مرتب‌سازی">
        <button type="button" className={cn("nx-chip", activeCount > 0 && "is-on")} onClick={() => setSheet("filter")}>
          <SlidersHorizontal className="size-4" aria-hidden />
          فیلتر
          {activeCount ? <span className="nx-chip-count">{toFaDigits(activeCount)}</span> : null}
        </button>
        <button type="button" className="nx-chip" onClick={() => setSheet("sort")}>
          <ArrowDownWideNarrow className="size-4" aria-hidden />
          {SORT_FA[sort]}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
        <span className="nx-chips-sep" aria-hidden />
        {TOGGLES.map((t) => {
          const on = params.get(t.key) === "1";
          return (
            <button key={t.key} type="button" aria-pressed={on} className={cn("nx-chip", on && "is-on")} onClick={() => set(t.key, on ? null : "1")}>
              {on ? <Check className="size-3.5" aria-hidden /> : null}
              {t.chip}
            </button>
          );
        })}
      </div>

      {cat || origin ? (
        <div className="nx-active">
          {cat ? (
            <button type="button" className="nx-active-chip" onClick={() => set("cat", null)} aria-label={`حذف فیلتر ${categoryById(cat)?.name ?? ""}`}>
              {categoryById(cat)?.name ?? cat} <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
          {origin ? (
            <button type="button" className="nx-active-chip" onClick={() => set("origin", null)} aria-label={`حذف فیلتر ${provinceById(origin)?.name ?? ""}`}>
              از {provinceById(origin)?.name ?? origin} <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <button type="button" className="nx-active-clear" onClick={clear}>
            حذف همه
          </button>
        </div>
      ) : null}

      <Sheet open={sheet === "filter"} onClose={() => setSheet(null)} label="فیلترها">
        <FilterPanel />
        <button type="button" onClick={() => setSheet(null)} className="nx-sheet-done">
          دیدن {toFaDigits(total)} کالا
        </button>
      </Sheet>
      <Sheet open={sheet === "sort"} onClose={() => setSheet(null)} label="مرتب‌سازی">
        <ul className="nx-sort-list">
          {SORTS.map((k) => (
            <li key={k}>
              <button
                type="button"
                aria-pressed={sort === k}
                className={cn("nx-filter-option", sort === k && "is-on")}
                onClick={() => {
                  setSort(k);
                  setSheet(null);
                }}
              >
                <span>{SORT_FA[k]}</span>
                {sort === k ? <Check className="size-4" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
