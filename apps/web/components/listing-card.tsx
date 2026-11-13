import { isNobar, minPricePerKg, type SearchHit } from "@nobar/demo";
import { cn, Toman } from "@nobar/ui";
import { Star, Truck } from "lucide-react";
import Link from "next/link";
import { FavoriteToggle, QuickAdd } from "./actions";
import { Photo } from "./photo";

const FRESH_LABEL: Record<string, string> = {
  FRESH_PICKED: "تازه‌چین",
  FRESH: "تازه",
  GOOD: "مناسب",
  PREORDER: "پیش‌فروش",
  NOT_FRESH: "خارج از تازگی",
};

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * Product card used in every grid and rail. The headline price is the landed price per kilo for the buyer's
 * city (goods plus delivery), Nobar's honest comparison number; the goods-only price is shown beside it.
 */
export function ListingCard({ hit, variant = "grid" }: { hit: SearchHit; variant?: "grid" | "row" }) {
  const { listing: l, shop, type, freshness, offer } = hit;
  const goodsPerKg = minPricePerKg(l);
  const firstPkg = l.packages[0]!;
  const eta = offer.delivery.etaMaxDays;
  return (
    <article className={cn("nx-card", variant === "row" && "nx-card-row")}>
      <div className="nx-card-media">
        <Photo kind={type.id} alt="" fallback={{ emoji: type.emoji, hue: type.hue }} sizes="(max-width: 640px) 50vw, 240px" className="nx-card-photo" />
        <div className="nx-card-badges">
          {isNobar(l) ? <span className="nx-badge nx-badge-nobar">نوبر</span> : null}
          <span className={cn("nx-badge", freshness.badge === "FRESH_PICKED" || freshness.badge === "FRESH" ? "nx-badge-fresh" : "nx-badge-muted")}>{FRESH_LABEL[freshness.badge]}</span>
        </div>
        <FavoriteToggle listingId={l.id} className="nx-card-fav" />
      </div>

      <div className="nx-card-body">
        <h3 className="nx-card-title">
          <Link href={"/l/" + l.id} className="nx-card-link">
            {l.title}
          </Link>
        </h3>
        <p className="nx-card-meta">
          <span className="nx-card-shop">{shop.name}</span>
          {shop.ratingCount ? (
            <span className="nx-card-rating">
              <Star className="size-3 fill-current" aria-hidden /> {shop.ratingAvg.toLocaleString("fa-IR")}
            </span>
          ) : null}
        </p>
        <p className="nx-card-eta">
          <Truck className="size-3.5" aria-hidden /> {eta === 0 ? "رسیدن امروز" : `رسیدن تا ${fa(eta)} روز`}
        </p>

        <div className="nx-card-foot">
          <div className="nx-card-price">
            <p className="nx-card-price-main">
              <Toman rial={offer.landedPerKgRial} unit={false} />
              <span>تومان</span>
            </p>
            <p className="nx-card-price-note">{goodsPerKg ? "هر کیلو، با ارسال" : firstPkg.label}</p>
          </div>
          <QuickAdd listingId={l.id} packageId={firstPkg.id} label={firstPkg.label} className="nx-card-add" />
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ hits, className }: { hits: SearchHit[]; className?: string }) {
  return (
    <div className={cn("nx-grid", className)}>
      {hits.map((h) => (
        <ListingCard key={h.listing.id} hit={h} />
      ))}
    </div>
  );
}

export function ListingRail({ hits }: { hits: SearchHit[] }) {
  return (
    <ul className="nx-rail">
      {hits.map((h) => (
        <li key={h.listing.id} className="nx-rail-item">
          <ListingCard hit={h} variant="row" />
        </li>
      ))}
    </ul>
  );
}
