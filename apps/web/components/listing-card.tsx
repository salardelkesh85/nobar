import { cityName, isNobar, minPricePerKg, type SearchHit } from "@nobar/demo";
import { cn, Toman } from "@nobar/ui";
import { Star } from "lucide-react";
import Link from "next/link";
import { CompareToggle, FavoriteToggle, QuickAdd } from "./actions";
import { Photo } from "./photo";

const FRESH_LABEL: Record<string, string> = {
  FRESH_PICKED: "تازه‌چین",
  FRESH: "تازه",
  GOOD: "مناسب",
  PREORDER: "پیش‌فروش",
  NOT_FRESH: "خارج از تازگی",
};

const FRESH_DOT: Record<string, string> = {
  FRESH_PICKED: "bg-brand",
  FRESH: "bg-brand",
  GOOD: "bg-saffron",
  PREORDER: "bg-ink-soft",
  NOT_FRESH: "bg-danger",
};

/**
 * Store product card. `row` is the compact variant used in horizontal rails; `grid` adds the landed price
 * line used on search and listing pages.
 */
export function ListingCard({ hit, variant = "grid" }: { hit: SearchHit; variant?: "grid" | "row" }) {
  const { listing: l, shop, type, freshness, offer } = hit;
  const perKg = minPricePerKg(l);
  const firstPkg = l.packages[0]!;
  return (
    <article className={cn("group relative flex h-full flex-col bg-surface p-3", variant === "row" ? "w-44 shrink-0 sm:w-48" : "border-b border-e border-line")}>
      <div className="relative">
        <Photo kind={type.id} alt={l.title} fallback={{ emoji: type.emoji, hue: type.hue }} className="aspect-square w-full rounded-tile" />
        {isNobar(l) ? (
          <span className="absolute start-1.5 top-1.5 rounded-md bg-nobar-solid px-1.5 py-0.5 text-[0.68rem] font-extrabold text-white">نوبر شد!</span>
        ) : null}
        <QuickAdd listingId={l.id} packageId={firstPkg.id} label={firstPkg.label} className="absolute bottom-1.5 end-1.5 z-10" />
      </div>

      <h3 className="mt-2.5 line-clamp-2 min-h-[2.8rem] text-[0.84rem] font-semibold leading-[1.4rem] text-ink">
        <Link href={`/l/${l.id}`} className="after:absolute after:inset-0">
          {l.title}
        </Link>
      </h3>

      <div className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <span className={cn("size-1.5 rounded-full", FRESH_DOT[freshness.badge])} aria-hidden />
          {FRESH_LABEL[freshness.badge]}
        </span>
        <span className="inline-flex items-center gap-0.5">
          {shop.ratingAvg.toLocaleString("fa-IR")}
          <Star className="size-3 fill-saffron text-saffron" aria-hidden />
        </span>
      </div>
      <p className="mt-0.5 truncate text-[0.7rem] text-ink-soft">
        {shop.name}، {cityName(l.originCityId)}
      </p>

      <div className="mt-auto pt-2.5 text-end">
        <p className="flex items-baseline justify-end gap-1">
          <Toman rial={perKg ?? firstPkg.priceRial} unit={false} className="text-[1.05rem] font-extrabold text-ink" />
          <span className="text-[0.68rem] text-ink-soft">تومان</span>
        </p>
        <p className="text-[0.68rem] text-ink-soft">{perKg ? "هر کیلو" : firstPkg.label}</p>
        {variant === "grid" ? (
          <p className="mt-1 text-[0.68rem] text-brand-strong">
            تا درِ خانه <Toman rial={offer.landedPerKgRial} unit={false} className="font-bold" /> /کیلو
          </p>
        ) : null}
      </div>
      <div className="absolute end-4 top-4 z-10 flex flex-col gap-1.5">
        <FavoriteToggle listingId={l.id} className="shadow-soft" />
        {variant === "grid" ? <CompareToggle listingId={l.id} label={false} className="shadow-soft" /> : null}
      </div>
    </article>
  );
}

/** Uniform product grid with hairline separators (search, produce type, shop pages). */
export function ListingGrid({ hits, className }: { hits: SearchHit[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 overflow-hidden rounded-card border-s border-t border-line bg-surface simple:grid-cols-1 sm:grid-cols-3 sm:simple:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {hits.map((h) => (
        <ListingCard key={h.listing.id} hit={h} />
      ))}
    </div>
  );
}

/** Horizontal rail of compact cards separated by hairlines. */
export function ListingRail({ hits }: { hits: SearchHit[] }) {
  return (
    <ul className="flex snap-x overflow-x-auto scrollbar-none">
      {hits.map((h) => (
        <li key={h.listing.id} className="snap-start border-e border-line last:border-e-0">
          <ListingCard hit={h} variant="row" />
        </li>
      ))}
    </ul>
  );
}
