import { cityById, cityName, LISTINGS, provinceOfCity, search, SHOPS, SHOP_TYPE_FA } from "@nobar/demo";
import { Card, EmptyState, ProduceArt, RatingStars } from "@nobar/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { decodeSlug, getDestination } from "@/lib/server";

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = cityById(decodeSlug((await params).city));
  return c ? { title: `محصولات ${c.name}، مستقیم از باغ` } : {};
}

export default async function OriginPage({ params }: { params: Params }) {
  const city = cityById(decodeSlug((await params).city));
  if (!city) notFound();
  const dest = await getDestination();
  const res = search({ dest });
  const hits = res.hits.filter((h) => h.listing.originCityId === city.id);
  const shops = SHOPS.filter((s) => s.cityId === city.id);
  const total = LISTINGS.filter((l) => l.originCityId === city.id).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-soft">{provinceOfCity(city.id)?.name}</p>
        <h1 className="text-3xl font-black">از باغ‌های {city.name}</h1>
        <p className="mt-1 text-ink-soft">
          {total.toLocaleString("fa-IR")} محصول از {shops.length.toLocaleString("fa-IR")} غرفه؛ {hits.length.toLocaleString("fa-IR")} محصول تازه به {cityName(dest)} می‌رسد.
        </p>
      </header>
      {shops.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={`/shop/${s.slug}`}>
                <Card className="flex items-center gap-3 p-3 hover:border-brand">
                  <ProduceArt emoji={s.emoji} kind={s.art} hue={s.hue} size="sm" className="size-14 shrink-0 rounded-control" />
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-ink-soft">{SHOP_TYPE_FA[s.type]}</p>
                    <RatingStars value={s.ratingAvg} count={s.ratingCount} className="text-xs" />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {hits.length ? <ListingGrid hits={hits} /> : <EmptyState title={`محصولات ${city.name} تا ${cityName(dest)} تازه نمی‌رسد`} body="شهر مقصد را عوض کنید یا محصولات نزدیک‌تر را ببینید." />}
    </div>
  );
}
