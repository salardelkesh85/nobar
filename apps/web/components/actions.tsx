"use client";

import { packageGrams, pricePerKg, type Listing } from "@nobar/demo";
import { formatToman, toFaDigits } from "@nobar/fa";
import { Button, cn } from "@nobar/ui";
import { Check, Heart, Minus, Plus, Scale, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function CompareToggle({ listingId, className, label = true }: { listingId: string; className?: string; label?: boolean }) {
  const { compare, toggleCompare, showToast } = useStore();
  const on = compare.includes(listingId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (!on && compare.length >= 4) showToast("حداکثر ۴ محصول را می‌شود مقایسه کرد.");
        toggleCompare(listingId);
      }}
      aria-pressed={on}
      className={cn(
        "items-center rounded-full border text-xs font-bold transition-colors simple:hidden",
        label ? "inline-flex min-h-9 gap-1 px-2.5" : "grid size-8 place-items-center",
        on ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface text-ink-soft hover:border-brand",
        className,
      )}
    >
      {on ? <Check className="size-4" aria-hidden /> : <Scale className="size-4" aria-hidden />}
      {label ? (on ? "در مقایسه" : "مقایسه") : <span className="sr-only">{on ? "حذف از مقایسه" : "افزودن به مقایسه"}</span>}
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded-control border border-line-strong bg-surface" role="group" aria-label={label}>
      <button type="button" className="grid size-10 place-items-center rounded-control text-brand hover:bg-surface-2 disabled:text-ink-soft disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="یکی بیشتر">
        <Plus className="size-4" />
      </button>
      <span className="min-w-8 text-center font-bold" aria-live="polite">
        {toFaDigits(value)}
      </span>
      <button type="button" className="grid size-10 place-items-center rounded-control text-brand hover:bg-surface-2 disabled:text-ink-soft disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="یکی کمتر">
        <Minus className="size-4" />
      </button>
    </div>
  );
}

/** Package chooser + quantity + add to cart, used on the listing page. */
export function BuyBox({ listing, disabled, disabledReason }: { listing: Listing; disabled?: boolean; disabledReason?: string }) {
  const { addToCart, showToast } = useStore();
  const [pkgId, setPkgId] = useState(listing.packages[0]!.id);
  const [qty, setQty] = useState(1);
  const pkg = listing.packages.find((p) => p.id === pkgId)!;
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">بسته را انتخاب کنید</legend>
        <div className="grid gap-2">
          {listing.packages.map((p) => {
            const perKg = p.netGrams ? pricePerKg(p.priceRial, p.netGrams) : null;
            const active = p.id === pkgId;
            return (
              <label
                key={p.id}
                className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2", active ? "border-brand bg-brand-soft" : "border-line hover:border-brand")}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="pkg" value={p.id} checked={active} onChange={() => setPkgId(p.id)} className="size-4 accent-[var(--brand)]" />
                  <span className="font-bold">{p.label}</span>
                </span>
                <span className="text-end">
                  <span className="block font-extrabold">{formatToman(p.priceRial)}</span>
                  {perKg ? <span className="block text-xs text-ink-soft">هر کیلو {formatToman(perKg)}</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.floor(listing.stockBase / packageGrams(pkg)))} label="تعداد بسته" />
        <Button
          size="lg"
          className="flex-1"
          disabled={disabled}
          onClick={() => {
            addToCart({ listingId: listing.id, packageId: pkg.id, qty });
            showToast(`${toFaDigits(qty)} × ${pkg.label} به سبد اضافه شد.`);
          }}
        >
          <ShoppingBasket className="size-5" aria-hidden />
          افزودن به سبد · {formatToman(pkg.priceRial * qty)}
        </Button>
      </div>
      {disabled && disabledReason ? <p className="text-sm text-danger">{disabledReason}</p> : null}
    </div>
  );
}

/** Round “+” on product cards: adds the first package, with a short confirmation. */
export function QuickAdd({ listingId, packageId, label, className }: { listingId: string; packageId: string; label: string; className?: string }) {
  const { addToCart, showToast } = useStore();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        addToCart({ listingId, packageId, qty: 1 });
        showToast(`${label} به سبد اضافه شد.`);
        setDone(true);
        window.setTimeout(() => setDone(false), 1400);
      }}
      className={cn(
        "grid size-9 place-items-center rounded-full border shadow-soft transition-all duration-200 active:scale-90",
        done ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-brand hover:border-brand hover:bg-brand hover:text-on-brand",
        className,
      )}
      aria-label={`افزودن ${label} به سبد`}
    >
      {done ? <Check className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
    </button>
  );
}

/** Heart toggle for the wishlist (علاقه‌مندی‌ها). */
export function FavoriteToggle({ listingId, className, withLabel }: { listingId: string; className?: string; withLabel?: boolean }) {
  const { favorites, toggleFavorite, showToast, ready } = useStore();
  const on = ready && favorites.includes(listingId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      onClick={(e) => {
        e.preventDefault();
        showToast(toggleFavorite(listingId) ? "به علاقه‌مندی‌ها اضافه شد." : "از علاقه‌مندی‌ها حذف شد.");
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors",
        withLabel ? "min-h-9 px-3 text-sm" : "size-8",
        on ? "border-nobar/30 bg-nobar-soft text-nobar" : "border-line bg-surface text-ink-soft hover:text-nobar",
        className,
      )}
    >
      <Heart className={cn("size-4", on && "fill-current")} aria-hidden />
      {withLabel ? (on ? "در علاقه‌مندی‌ها" : "علاقه‌مندی") : null}
    </button>
  );
}
