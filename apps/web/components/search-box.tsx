"use client";

import { suggest } from "@nobar/demo";
import { cn, inputClass } from "@nobar/ui";
import { Photo } from "./photo";
import { Clock, Search, TrendingUp, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

export function SearchBox({
  className,
  autoFocus,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useStore();
  const items = focused ? suggest(q) : [];
  const showHints = focused && !q.trim();

  const go = (text: string) => {
    const t = text.trim();
    setFocused(false);
    if (t) addRecentSearch(t);
    router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
  };

  return (
    <form
      role="search"
      className={cn("nobar-search-shell relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        جستجو در نوبر
      </label>
      <Search
        className="nobar-search-icon pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2"
        aria-hidden
      />
      <input
        id={`${listId}-input`}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setFocused(false);
            setActiveIndex(-1);
          }
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % items.length);
          }
          if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActiveIndex((i) => (i + items.length - 1) % items.length);
          }
          if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            setFocused(false);
            router.push(`/p/${items[activeIndex]!.id}`);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        placeholder="دنبال چه طعمی هستی؟ مثلاً انار ساوه"
        className={cn(
          inputClass,
          "nobar-search-input min-h-12 border-transparent bg-surface-2 ps-12 pe-20 shadow-none focus:bg-surface",
        )}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-activedescendant={
          activeIndex >= 0 && items[activeIndex]
            ? `${listId}-${items[activeIndex]!.id}`
            : undefined
        }
        aria-controls={listId}
        aria-autocomplete="list"
        enterKeyHint="search"
      />
      <span className="nobar-search-shortcut" aria-hidden>
        جستجو
      </span>

      {showHints ? (
        <div
          className="nobar-search-popover absolute inset-x-0 top-full z-30 mt-2 space-y-4 rounded-card border border-line bg-surface p-4 shadow-lift"
          onMouseDown={(e) => e.preventDefault()}
        >
          {recentSearches.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock className="size-4 text-ink-soft" aria-hidden />{" "}
                  جستجوهای اخیر
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-danger"
                >
                  <X className="size-3.5" aria-hidden /> پاک کردن
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setQ(r);
                      go(r);
                    }}
                    className="nobar-search-chip"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <TrendingUp className="size-4 text-brand" aria-hidden /> جستجوهای
              پرطرفدار
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "انار ساوه",
                "سیب قرمز",
                "کیوی",
                "خرما مضافتی",
                "نارنگی",
                "سبزی خوردن",
                "سیب‌زمینی",
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setQ(r);
                    go(r);
                  }}
                  className="nobar-search-chip"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="nobar-search-popover absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-card border border-line bg-surface p-1.5 shadow-lift"
        >
          {items.map((pt, index) => (
            <li
              key={pt.id}
              id={`${listId}-${pt.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "bg-brand-soft" : undefined}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(pt.name);
                  setFocused(false);
                  router.push(`/p/${pt.id}`);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-start transition-colors hover:bg-surface-2"
              >
                <Photo
                  kind={pt.id}
                  alt=""
                  sizes="36px"
                  className="size-9 shrink-0 rounded-lg"
                  fallback={{ emoji: pt.emoji, hue: pt.hue }}
                />
                <span className="font-bold">{pt.name}</span>
                <span className="ms-auto text-xs text-ink-soft">
                  مشاهده پیشنهادها
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
