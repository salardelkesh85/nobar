import { cityName, etaPhrase, isNobar, minPricePerKg, type SearchHit } from "@nobar/demo";
import { Badge, FreshnessBadge, NobarBadge, ProduceArt, Toman } from "@nobar/ui";
import { Leaf, MapPin, Star, Truck } from "lucide-react";
import Link from "next/link";
import { CompareToggle, QuickAdd } from "./actions";

/** Product card: freshness, origin, price per kg and the landed price per kg to the buyer's city. */
export function ListingCard({ hit }: { hit: SearchHit }) {
  const { listing: l, shop, type, freshness, offer } = hit;
  const perKg = minPricePerKg(l);
  const firstPkg = l.packages[0]!;
  return (
    <article className="group relative flex flex-col rounded-card border border-line bg-surface p-2 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift">
      <div className="relative">
        <ProduceArt emoji={type.emoji} hue={type.hue} kind={type.id} size="lg" className="aspect-[5/4] w-full rounded-tile" label={l.title} />
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {isNobar(l) ? <NobarBadge /> : null}
          <FreshnessBadge level={freshness.badge} className="shadow-soft" />
        </div>
        <CompareToggle listingId={l.id} label={false} className="absolute end-2 top-2 z-10 size-9 justify-center bg-surface/90 backdrop-blur" />
        <QuickAdd listingId={l.id} packageId={firstPkg.id} label={firstPkg.label} className="absolute -bottom-4 end-3 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-3">
        <p className="flex items-center gap-1 text-[0.72rem] text-ink-soft">
          <MapPin className="size-3.5 text-brand" aria-hidden />
          {cityName(l.originCityId)} · {shop.name}
        </p>
        <h3 className="line-clamp-2 min-h-[3.1em] text-[0.95rem] font-bold leading-snug">
          <Link href={`/l/${l.slug}`} className="after:absolute after:inset-0 after:rounded-card">
            {l.title}
          </Link>
        </h3>
        <div className="flex items-center gap-2 text-[0.72rem] text-ink-soft">
          <span className="inline-flex items-center gap-0.5 font-bold text-ink">
            <Star className="size-3.5 fill-saffron text-saffron" aria-hidden />
            {shop.ratingAvg.toLocaleString("fa-IR")}
          </span>
          <span>({shop.ratingCount.toLocaleString("fa-IR")})</span>
          {l.isOrganic ? (
            <Badge tone="brand" className="ms-auto">
              <Leaf className="size-3" aria-hidden />
              ارگانیک
            </Badge>
          ) : null}
        </div>
        <div className="mt-auto pt-1">
          <p className="flex items-baseline gap-1">
            <Toman rial={perKg ?? firstPkg.priceRial} className="text-lg font-black tracking-tight" />
            <span className="text-[0.72rem] text-ink-soft">{perKg ? "/ کیلو" : `/ ${firstPkg.label}`}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[0.7rem] text-brand-strong">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              تا درِ خانه <Toman rial={offer.landedPerKgRial} className="font-bold" /> · {etaPhrase(offer.delivery)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ hits }: { hits: SearchHit[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 simple:grid-cols-1 sm:grid-cols-3 sm:gap-4 sm:simple:grid-cols-2 lg:grid-cols-4 lg:simple:grid-cols-3 xl:grid-cols-5">
      {hits.map((h) => (
        <ListingCard key={h.listing.id} hit={h} />
      ))}
    </div>
  );
}
