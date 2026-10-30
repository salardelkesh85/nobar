"use client";

import { CATEGORIES, PROVINCES, SORT_FA, type SortKey } from "@nobar/demo";
import { cn, Select } from "@nobar/ui";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const ORIGIN_PROVINCES = ["azg", "mrk", "mzn", "gil", "krm", "khj", "isf"];

export function SearchFilters() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };
  const toggle = (key: string) => set(key, params.get(key) === "1" ? null : "1");
  const activeCount = ["cat", "origin", "fresh", "organic", "nobar"].filter((k) => params.get(k)).length;

  const chips = (
    <>
      {[
        ["fresh", "فقط تازه‌چین و تازه"],
        ["organic", "ارگانیک"],
        ["nobar", "نوبر شد!"],
      ].map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={params.get(k!) === "1"}
          onClick={() => toggle(k!)}
          className={cn(
            "min-h-10 shrink-0 rounded-full border px-4 text-sm transition-colors",
            params.get(k!) === "1" ? "border-brand bg-brand text-on-brand font-bold" : "border-line-strong bg-surface text-ink hover:border-brand",
          )}
        >
          {label}
        </button>
      ))}
    </>
  );

  const panel = (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-bold">دسته</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={params.get("cat") === c.id}
              onClick={() => set("cat", params.get("cat") === c.id ? null : c.id)}
              className={cn("min-h-10 rounded-full border px-3 text-sm", params.get("cat") === c.id ? "border-brand bg-brand-soft font-bold" : "border-line bg-surface")}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
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
      <div className="flex flex-wrap gap-2">{chips}</div>
    </div>
  );

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-bold shadow-soft lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          فیلترها{activeCount ? ` (${activeCount.toLocaleString("fa-IR")})` : ""}
        </button>
        <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-none lg:flex">{chips}</div>
        <div className="ms-auto w-48 shrink-0">
          <label htmlFor="sort" className="sr-only">
            مرتب‌سازی
          </label>
          <Select id="sort" value={params.get("sort") ?? "relevance"} onChange={(e) => set("sort", e.target.value)} className="min-h-10 rounded-full">
            {(Object.keys(SORT_FA) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_FA[k]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 hidden lg:block">
        <details className="rounded-card border border-line bg-surface p-4 shadow-soft" open={!!(params.get("cat") || params.get("origin"))}>
          <summary className="cursor-pointer text-sm font-bold">دسته و استان مبدأ</summary>
          <div className="mt-4">{panel}</div>
        </details>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="فیلترها" className="max-h-[85vh] w-full overflow-y-auto rounded-t-card bg-surface p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">فیلترها</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="بستن">
                <X className="size-5" />
              </button>
            </div>
            {panel}
            <button type="button" onClick={() => setOpen(false)} className="mt-6 min-h-12 w-full rounded-control bg-brand font-bold text-on-brand">
              دیدن نتیجه‌ها
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
