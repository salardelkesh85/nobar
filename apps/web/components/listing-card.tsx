import { cityName, isNobar, minPricePerKg, type SearchHit } from "@nobar/demo";
import { cn, Toman } from "@nobar/ui";
import { BadgeCheck, MapPin, Star } from "lucide-react";
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

export function ListingCard({ hit, variant = "grid" }: { hit: SearchHit; variant?: "grid" | "row" }) {
  const { listing: l, shop, type, freshness, offer } = hit;
  const perKg = minPricePerKg(l);
  const firstPkg = l.packages[0]!;
  return (
    <article className={cn("nobar-product-card group relative flex h-full flex-col", variant === "row" ? "nobar-product-card-row w-56 shrink-0 sm:w-60" : "nobar-product-card-grid")}>
      <div className="nobar-product-visual">
        <Photo kind={type.id} alt={l.title} fallback={{ emoji: type.emoji, hue: type.hue }} className="nobar-product-photo aspect-square w-full" />
        <span className="nobar-fresh-badge">
          <span className={cn("size-1.5 rounded-full", FRESH_DOT[freshness.badge])} /> {FRESH_LABEL[freshness.badge]}
        </span>
        {isNobar(l) ? <span className="nobar-product-nobar-badge">نوبر شد!</span> : null}
        <div className="nobar-product-actions">
          <FavoriteToggle listingId={l.id} className="nobar-icon-action" />
          {variant === "grid" ? <CompareToggle listingId={l.id} label={false} className="nobar-icon-action" /> : null}
        </div>
        <QuickAdd listingId={l.id} packageId={firstPkg.id} label={firstPkg.label} className="nobar-quick-add" />
      </div>

      <div className="nobar-product-info">
        <div className="flex items-center justify-between gap-2">
          <span className="nobar-product-shop"><BadgeCheck className="size-3.5 shrink-0" /> <span className="truncate">{shop.name}</span></span>
          <span className="nobar-product-rating"><Star className="size-3 fill-current" /> {shop.ratingAvg.toLocaleString("fa-IR")}</span>
        </div>
        <h3 className="nobar-product-title">
          <Link href={"/l/" + l.id} className="after:absolute after:inset-0">{l.title}</Link>
        </h3>
        <p className="nobar-product-origin"><MapPin className="size-3 shrink-0" /> {cityName(l.originCityId)} <span>·</span> ارسال به مقصد انتخابی</p>
      </div>

      <div className="nobar-product-price">
        <div className="flex items-baseline justify-end gap-1">
          <Toman rial={perKg ?? firstPkg.priceRial} unit={false} className="text-lg font-black tracking-tight text-ink" />
          <span className="text-[10px] text-ink-soft">تومان</span>
        </div>
        <p className="text-[10px] text-ink-soft">{perKg ? "قیمت هر کیلو" : firstPkg.label}</p>
        {variant === "grid" ? (
          <p className="nobar-landed-price">
            <span>با ارسال تا مقصد</span>
            <strong><Toman rial={offer.landedPerKgRial} unit={false} /> <small>تومان / کیلو</small></strong>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ListingGrid({ hits, className }: { hits: SearchHit[]; className?: string }) {
  return <div className={cn("nobar-product-grid grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface simple:grid-cols-1 sm:grid-cols-3 sm:simple:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", className)}>{hits.map((h) => <ListingCard key={h.listing.id} hit={h} />)}</div>;
}

export function ListingRail({ hits }: { hits: SearchHit[] }) {
  return <ul className="nobar-product-rail flex snap-x overflow-x-auto scrollbar-none">{hits.map((h) => <li key={h.listing.id} className="nobar-product-rail-item snap-start"><ListingCard hit={h} variant="row" /></li>)}</ul>;
}
