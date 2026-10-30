import { cityName, provinceOfCity, reviewsForShop, search, SHOP_TYPE_FA, shopBySlug, METHOD_FA } from "@nobar/demo";
import { Badge, Card, EmptyState, RatingStars, RelativeDay, Stat } from "@nobar/ui";
import { BadgeCheck, Check, Clock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { decodeSlug, getDestination } from "@/lib/server";
import { Photo } from "@/components/photo";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = shopBySlug(decodeSlug((await params).slug));
  return s ? { title: `${s.name} — باغ‌نامه`, description: s.story.title } : {};
}

export default async function ShopPage({ params }: { params: Params }) {
  const shop = shopBySlug(decodeSlug((await params).slug));
  if (!shop) notFound();
  const dest = await getDestination();
  const res = search({ dest, shopId: shop.id, sort: "newest" });
  const reviews = reviewsForShop(shop.id);
  const fa = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-card border border-line bg-surface">
        <Photo kind={shop.art} alt="" className="h-40 w-full sm:h-56" fallback={{ emoji: shop.emoji, hue: shop.hue }} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{SHOP_TYPE_FA[shop.type]}</Badge>
            <Badge tone="neutral">
              <BadgeCheck className="size-3" aria-hidden /> هویت تأییدشده
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-black">{shop.name}</h1>
          <p className="text-ink-soft">
            {cityName(shop.cityId)}، {provinceOfCity(shop.cityId)?.name} · {shop.ownerName} · در نوبر از {fa(shop.joinedYear)}
          </p>
          <RatingStars value={shop.ratingAvg} count={shop.ratingCount} className="mt-2" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="امتیاز تازگی" value={`${shop.freshnessRatingAvg.toLocaleString("fa-IR")} از ۵`} tone="brand" />
        <Stat label="زمان تأیید سفارش" value={`تا ${fa(shop.acceptanceSlaHours)} ساعت`} />
        <Stat label="آماده‌سازی و ارسال" value={shop.handlingDays === 0 ? "همان روز" : `${fa(shop.handlingDays)} روز`} />
        <Stat label="لغو در ۹۰ روز" value={fa(shop.cancellations90d)} />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <p className="text-sm font-bold text-brand">باغ‌نامه</p>
          <h2 className="mt-1 text-2xl font-black">{shop.story.title}</h2>
          <div className="mt-4 space-y-3 leading-8">
            {shop.story.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Photo kind={shop.art} alt="" className="aspect-[4/3] rounded-control" fallback={{ emoji: shop.emoji, hue: shop.hue + i * 18 }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">عکس‌های واقعی باغ و غرفه‌دار در نسخه‌ی واقعی اینجا نمایش داده می‌شود.</p>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-extrabold">روش کار ما</h3>
            <ul className="space-y-2">
              {shop.story.practices.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-brand" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">از سال {fa(shop.story.sinceYear)}</p>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-extrabold">روش‌های ارسال</h3>
            <ul className="space-y-2 text-sm">
              {shop.shipping.map((r) => (
                <li key={r.method} className="flex items-center gap-2">
                  <Clock className="size-4 text-ink-soft" aria-hidden />
                  {METHOD_FA[r.method]}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">محصولات این غرفه</h2>
        {res.hits.length ? <ListingGrid hits={res.hits} /> : <EmptyState title={`محصولات این غرفه تا ${cityName(dest)} تازه نمی‌رسد`} body="شهر مقصد را عوض کنید تا محصولات را ببینید." />}
        {res.notDeliverable.length ? (
          <p className="mt-3 text-sm text-ink-soft">
            {res.notDeliverable.length.toLocaleString("fa-IR")} محصول دیگر این غرفه فقط برای ارسال به شهرهای نزدیک {cityName(shop.cityId)} فعال است.
          </p>
        ) : null}
      </section>

      {reviews.length ? (
        <section>
          <h2 className="mb-3 text-xl font-extrabold">نظر خریدارها</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <Card className="h-full p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{r.buyerName}</span>
                    <span className="text-ink-soft">از {r.buyerCity}</span>
                    <RatingStars value={r.rating} />
                    <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
                  </div>
                  <p className="mt-2 leading-7">{r.text}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
