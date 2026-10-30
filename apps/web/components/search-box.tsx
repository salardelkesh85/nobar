"use client";

import { suggest } from "@nobar/demo";
import { cn, inputClass, ProduceIllustration } from "@nobar/ui";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const items = focused ? suggest(q) : [];

  const go = (text: string) => {
    const t = text.trim();
    setFocused(false);
    router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
  };

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        جستجو در نوبر
      </label>
      <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
      <input
        id={`${listId}-input`}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        placeholder="سیب، انار ساوه، سبزی خوردن…"
        className={cn(inputClass, "min-h-12 rounded-full border-transparent bg-surface-2 ps-11 shadow-none hover:bg-surface-3 focus:bg-surface")}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        enterKeyHint="search"
      />
      {items.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-card border border-line bg-surface p-1.5 shadow-lift">
          {items.map((pt) => (
            <li key={pt.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(pt.name);
                  setFocused(false);
                  router.push(`/p/${pt.slug}`);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-start hover:bg-surface-2"
              >
                <ProduceIllustration kind={pt.id} className="size-8" />
                <span className="font-bold">{pt.name}</span>
                <span className="text-xs text-ink-soft">همه‌ی پیشنهادها</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
