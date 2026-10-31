"use client";

import { cityById, cityName, LISTINGS, provinceOfCity, search, SHOPS, SHOP_TYPE_FA } from "@nobar/demo";
import { Card, EmptyState, RatingStars } from "@nobar/ui";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";

export function OriginView({ id }: { id: string }) {
  const city = cityById(id);
  if (!city) notFound();
  const { dest } = useStore();
  const res = search({ dest });
  const hits = res.hits.filter((h) => h.listing.originCityId === city.id);
  const shops = SHOPS.filter((s) => s.cityId === city.id);
  const total = LISTINGS.filter((l) => l.originCityId === city.id).length;

  return (
    <div className="space-y-4">
      <header className="studio-origin-profile relative isolate overflow-hidden rounded-card">
        <Image src={bannerSrc(city.provinceId === "mrk" ? "banner-pomegranate" : city.provinceId === "azg" ? "banner-orchard" : "banner-market")} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-l from-black/75 via-black/45 to-black/10" />
        <div className="px-5 py-8 text-white sm:px-8 sm:py-12">
          <p className="text-sm text-white/80">{provinceOfCity(city.id)?.name}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">از باغ‌های {city.name}</h1>
          <p className="mt-2 max-w-lg text-sm leading-7 text-white/85">
            {total.toLocaleString("fa-IR")} محصول از {shops.length.toLocaleString("fa-IR")} غرفه؛ {hits.length.toLocaleString("fa-IR")} محصول تازه به {cityName(dest)} می‌رسد.
          </p>
        </div>
      </header>
      {shops.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={`/shop/${s.id}`}>
                <Card className="flex items-center gap-3 p-3 hover:border-brand shadow-none">
                  <Photo kind={s.art} alt="" sizes="56px" className="size-14 shrink-0 rounded-full" fallback={{ emoji: s.emoji, hue: s.hue }} />
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
