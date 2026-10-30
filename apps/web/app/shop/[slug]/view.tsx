"use client";

import { cityName, METHOD_FA, provinceOfCity, reviewsForShop, search, SHOP_TYPE_FA, shopBySlug } from "@nobar/demo";
import { Badge, EmptyState, RatingStars, RelativeDay } from "@nobar/ui";
import { BadgeCheck, Check, Clock, MapPin, Star, Truck } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc, type BannerPhoto } from "@/lib/photos";
import { useStore } from "@/lib/store";

const coverFor = (art: string): BannerPhoto =>
  ["pomegranate", "quince", "barberry"].includes(art) ? "banner-pomegranate" : ["apple-red", "apple-yellow", "grape-white", "walnut"].includes(art) ? "banner-orchard" : "banner-market";

export function ShopView({ id }: { id: string }) {
  const shop = shopBySlug(id);
  if (!shop) notFound();
  const { dest } = useStore();
  const res = search({ dest, shopId: shop.id, sort: "newest" });
  const reviews = reviewsForShop(shop.id);
  const fa = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });
  const stats: Array<[string, string]> = [
    ["امتیاز تازگی", `${shop.freshnessRatingAvg.toLocaleString("fa-IR")} از ۵`],
    ["تأیید سفارش", `تا ${fa(shop.acceptanceSlaHours)} ساعت`],
    ["آماده‌سازی", shop.handlingDays === 0 ? "همان روز" : `${fa(shop.handlingDays)} روز`],
    ["لغو در ۹۰ روز", fa(shop.cancellations90d)],
  ];

  return (
    <div className="space-y-4">
      {/* Shop header */}
      <header className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="relative h-32 sm:h-44">
          <Image src={bannerSrc(coverFor(shop.art))} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/45 to-transparent" />
        </div>
        <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:px-6">
          <Photo kind={shop.art} alt="" sizes="112px" fallback={{ emoji: shop.emoji, hue: shop.hue }} className="-mt-12 size-24 shrink-0 rounded-full border-4 border-surface sm:size-28" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold sm:text-2xl">{shop.name}</h1>
              <BadgeCheck className="size-5 text-brand" aria-label="هویت تأییدشده" />
              <Badge tone="brand">{SHOP_TYPE_FA[shop.type]}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden />
                {cityName(shop.cityId)}، {provinceOfCity(shop.cityId)?.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-saffron text-saffron" aria-hidden />
                <span className="font-bold text-ink">{shop.ratingAvg.toLocaleString("fa-IR")}</span>({shop.ratingCount.toLocaleString("fa-IR")} نظر)
              </span>
              <span>در نوبر از {fa(shop.joinedYear)}</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {stats.map(([k, v], i) => (
            <div key={k} className={`px-4 py-3 text-center ${i % 2 ? "" : "border-e border-line"} sm:border-e sm:last:border-e-0`}>
              <dt className="text-xs text-ink-soft">{k}</dt>
              <dd className="mt-0.5 font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Products */}
      <section>
        <h2 className="mb-3 text-lg font-extrabold">محصولات غرفه ({res.hits.length.toLocaleString("fa-IR")})</h2>
        {res.hits.length ? (
          <ListingGrid hits={res.hits} />
        ) : (
          <EmptyState title={`محصولات این غرفه تا ${cityName(dest)} تازه نمی‌رسد`} body="شهر مقصد را عوض کنید تا محصولات را ببینید." />
        )}
        {res.notDeliverable.length ? (
          <p className="mt-2 text-xs text-ink-soft">
            {res.notDeliverable.length.toLocaleString("fa-IR")} محصول دیگر این غرفه فقط برای ارسال به شهرهای نزدیک {cityName(shop.cityId)} فعال است.
          </p>
        ) : null}
      </section>

      {/* Farm story + facts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-card border border-line bg-surface p-5 sm:p-6 lg:col-span-2">
          <p className="text-xs font-bold text-brand">باغ‌نامه</p>
          <h2 className="mt-1 text-xl font-extrabold">{shop.story.title}</h2>
          <div className="mt-3 space-y-3 leading-8 text-ink">
            {shop.story.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">در نسخه‌ی واقعی، عکس‌های خود باغ و غرفه‌دار اینجا نمایش داده می‌شود.</p>
        </article>
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-surface p-5">
            <h3 className="mb-3 font-extrabold">روش کار ما</h3>
            <ul className="space-y-2">
              {shop.story.practices.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-brand" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">از سال {fa(shop.story.sinceYear)}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <h3 className="mb-3 flex items-center gap-1.5 font-extrabold">
              <Truck className="size-5 text-brand" aria-hidden />
              روش‌های ارسال
            </h3>
            <ul className="space-y-2 text-sm">
              {shop.shipping.map((r) => (
                <li key={r.method} className="flex items-center gap-2">
                  <Clock className="size-4 text-ink-soft" aria-hidden />
                  {METHOD_FA[r.method]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {reviews.length ? (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-3 text-lg font-extrabold">نظر خریدارها</h2>
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <RatingStars value={r.rating} />
                  <span className="font-bold">{r.buyerName}</span>
                  <span className="text-ink-soft">از {r.buyerCity}</span>
                  <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
                </div>
                <p className="mt-1.5 leading-7">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
