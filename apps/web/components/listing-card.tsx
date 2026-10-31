import { cityName, isNobar, minPricePerKg, type SearchHit } from "@nobar/demo";
import { cn, Toman } from "@nobar/ui";
import { BadgeCheck, Star } from "lucide-react";
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
    <article className={cn("group relative flex h-full flex-col bg-surface p-3 transition-all duration-200", variant === "row" ? "w-48 shrink-0 sm:w-52" : "border-b border-e border-line hover:z-10 hover:shadow-[0_8px_24px_rgb(16_24_20_/_0.08)]")}>
      <div className="relative">
        <Photo kind={type.id} alt={l.title} fallback={{ emoji: type.emoji, hue: type.hue }} className="aspect-square w-full rounded-xl bg-surface-2" />
        <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-[#245b35] shadow-soft">
          <span className={cn("size-1.5 rounded-full", FRESH_DOT[freshness.badge])} /> {FRESH_LABEL[freshness.badge]}
        </span>
        {isNobar(l) ? <span className="absolute start-2 top-2 rounded-full bg-[#b52d2d] px-2.5 py-1 text-[10px] font-black text-white shadow-soft">نوبر شد!</span> : null}
        <QuickAdd listingId={l.id} packageId={firstPkg.id} label={firstPkg.label} className="absolute bottom-2 end-2 z-10" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] text-ink-soft"><BadgeCheck className="size-3.5 shrink-0 text-brand" /> {shop.name}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-ink-soft">{shop.ratingAvg.toLocaleString("fa-IR")} <Star className="size-3 fill-saffron text-saffron" /></span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 min-h-11 text-[13px] font-extrabold leading-6 text-ink">
        <Link href={"/l/" + l.id} className="after:absolute after:inset-0">{l.title}</Link>
      </h3>
      <p className="mt-0.5 truncate text-[10px] text-ink-soft">{cityName(l.originCityId)} · ارسال به مقصد انتخابی</p>
      <div className="mt-auto pt-3 text-end">
        <p className="flex items-baseline justify-end gap-1">
          <Toman rial={perKg ?? firstPkg.priceRial} unit={false} className="text-base font-black tracking-tight text-ink" />
          <span className="text-[10px] text-ink-soft">تومان</span>
        </p>
        <p className="text-[10px] text-ink-soft">{perKg ? "قیمت هر کیلو" : firstPkg.label}</p>
        {variant === "grid" ? <p className="mt-1.5 rounded-lg bg-brand-soft px-2 py-1 text-[10px] font-bold text-brand-strong">با ارسال: <Toman rial={offer.landedPerKgRial} unit={false} className="font-black" /> تومان / کیلو</p> : null}
      </div>
      <div className="absolute end-4 top-4 z-10 flex flex-col gap-1.5">
        <FavoriteToggle listingId={l.id} className="shadow-soft" />
        {variant === "grid" ? <CompareToggle listingId={l.id} label={false} className="shadow-soft" /> : null}
      </div>
    </article>
  );
}

export function ListingGrid({ hits, className }: { hits: SearchHit[]; className?: string }) {
  return <div className={cn("grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface simple:grid-cols-1 sm:grid-cols-3 sm:simple:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", className)}>{hits.map((h) => <ListingCard key={h.listing.id} hit={h} />)}</div>;
}
export function ListingRail({ hits }: { hits: SearchHit[] }) {
  return <ul className="flex snap-x overflow-x-auto scrollbar-none">{hits.map((h) => <li key={h.listing.id} className="snap-start border-e border-line last:border-e-0"><ListingCard hit={h} variant="row" /></li>)}</ul>;
}
