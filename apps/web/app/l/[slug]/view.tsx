"use client";

import {
  categoryById,
  cityName,
  etaPhrase,
  freshnessOf,
  harvestPhrase,
  isNobar,
  JALALI_MONTHS,
  listingBySlug,
  marketStat,
  minPricePerKg,
  packageGrams,
  PRICE_POSITION_FA,
  pricePerKg,
  pricePosition,
  produceTypeById,
  search,
  quoteDelivery,
  REASON_FA,
  reviewsForListing,
  SHOP_TYPE_FA,
  shopById,
} from "@nobar/demo";
import { formatToman } from "@nobar/fa";
import { Badge, ButtonLink, FreshnessBadge, FreshnessMeter, JalaliDate, RatingStars, RelativeDay, Toman, Weight } from "@nobar/ui";
import { BadgeCheck, ChevronLeft, Info, Leaf, Scale, ShieldCheck, Snowflake, Star, Store, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BuyBox, CompareToggle, FavoriteToggle } from "@/components/actions";
import { Gallery, QandA, RatingSummary, ReviewForm, SectionTabs, ShareButton, StickyBuyBar } from "@/components/product-extras";
import type { BannerPhoto } from "@/lib/photos";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { useStore } from "@/lib/store";

const coverFor = (art: string): BannerPhoto =>
  ["pomegranate", "quince", "barberry"].includes(art) ? "banner-pomegranate" : ["apple-red", "apple-yellow", "grape-white", "walnut"].includes(art) ? "banner-orchard" : "banner-market";

const GRADE_FA = { PREMIUM: "ممتاز", GRADE_1: "درجه‌یک", GRADE_2: "درجه‌دو", PROCESSING: "آبمیوه‌ای / صنعتی" } as const;

export function ListingView({ id }: { id: string }) {
  const l = listingBySlug(id);
  if (!l) notFound();
  const shop = shopById(l.shopId)!;
  const pt = produceTypeById(l.produceTypeId)!;
  const cat = categoryById(pt.categoryId);
  const { dest } = useStore();
  const fresh = freshnessOf(l);
  const quote = quoteDelivery(l, dest);
  const first = l.packages[0]!;
  const reviews = reviewsForListing(l.id);
  const stat = marketStat(pt.id);
  const position = pricePosition(l);
  const perKg = minPricePerKg(l);
  const similar = search({ dest, produceType: pt.id }).hits.filter((h) => h.listing.id !== l.id);
  const landedPerKg = quote.best ? pricePerKg(first.priceRial + quote.best.costRial, packageGrams(first)) : null;


  const specs: Array<[string, ReactNode]> = [
    ["مبدأ", <Link key="o" href={`/origin/${l.originCityId}`} className="text-brand hover:underline">{cityName(l.originCityId)}</Link>],
    ["رقم", l.variety ?? "—"],
    ["درجه", GRADE_FA[l.grade]],
    [
      "تاریخ برداشت",
      fresh.badge === "PREORDER" ? (
        <span key="p">
          ارسال از <JalaliDate date={l.preorderDispatchFrom!} />
        </span>
      ) : (
        <span key="h">
          <JalaliDate date={l.harvestedAt} /> (<RelativeDay date={l.harvestedAt} />)
        </span>
      ),
    ],
    ["نگهداری", pt.storage === "COLD" ? "زنجیره‌ی سرد" : pt.storage === "COOL" ? "جای خنک / یخچال" : "دمای اتاق"],
    ["فصل", pt.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")],
  ];

  return (
    <div className="space-y-4">
      <nav aria-label="مسیر" className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">نوبر</Link>
        <ChevronLeft className="size-3.5" aria-hidden />
        <Link href={`/search?cat=${cat?.id}`} className="hover:text-brand">{cat?.name}</Link>
        <ChevronLeft className="size-3.5" aria-hidden />
        <Link href={`/p/${pt.id}`} className="hover:text-brand">{pt.name}</Link>
      </nav>

      <div className="studio-product-layout grid gap-4 rounded-card border border-line bg-surface p-4 lg:grid-cols-12 lg:gap-6 lg:p-6">
        {/* Gallery */}
        <div className="lg:col-span-4">
          <div className="relative">
            <Gallery kind={pt.id} title={l.title} cover={coverFor(shop.art)} />
            {isNobar(l) ? <span className="pointer-events-none absolute start-3 top-3 rounded-md bg-nobar-solid px-2 py-1 text-xs font-extrabold text-white">نوبر شد!</span> : null}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 lg:col-span-4 xl:col-span-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <Link href={`/shop/${shop.id}`} className="font-bold text-brand hover:underline">{shop.name}</Link>
              <span className="flex gap-1.5">
                <FavoriteToggle listingId={l.id} withLabel />
                <ShareButton title={l.title} />
              </span>
            </div>
            <h1 className="text-xl font-extrabold leading-9 sm:text-2xl">{l.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-saffron text-saffron" aria-hidden />
                <span className="font-bold">{shop.ratingAvg.toLocaleString("fa-IR")}</span>
                <a href="#reviews" className="text-brand hover:underline">
                  ({reviews.length.toLocaleString("fa-IR")} دیدگاه)
                </a>
              </span>
              <span className="text-ink-soft">امتیاز تازگی {shop.freshnessRatingAvg.toLocaleString("fa-IR")}</span>
              {l.isOrganic ? (
                <Badge tone="brand">
                  <Leaf className="size-3" aria-hidden /> ارگانیک (ادعای فروشنده)
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="rounded-control bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <FreshnessBadge level={fresh.badge} detail={fresh.badge !== "PREORDER" ? harvestPhrase(fresh) : undefined} />
              {pt.storage !== "AMBIENT" ? (
                <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                  <Snowflake className="size-3.5" aria-hidden />
                  {pt.storage === "COLD" ? "زنجیره‌ی سرد" : "جای خنک"}
                </span>
              ) : null}
            </div>
            {fresh.badge !== "PREORDER" ? (
              <FreshnessMeter ratio={fresh.ratio} label={`${fresh.daysLeft.toLocaleString("fa-IR")} روز از ${fresh.shelfDays.toLocaleString("fa-IR")} روز تازگی باقی است`} />
            ) : null}
          </div>

          <div>
            <h2 className="mb-2 font-bold">ویژگی‌ها</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="rounded-control bg-surface-2 px-3 py-2">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-sm leading-8 text-ink-soft">{l.description}</p>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/compare?type=${pt.id}`} variant="secondary" size="sm">
              <Scale className="size-4" aria-hidden />
              مقایسه با غرفه‌های دیگر
            </ButtonLink>
            <CompareToggle listingId={l.id} className="min-h-9 px-3 text-sm" />
          </div>
        </div>

        {/* Buy box */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="space-y-4 rounded-card border border-line bg-surface-2/60 p-4 lg:sticky lg:top-36">
            <Link href={`/shop/${shop.id}`} className="flex items-center gap-3 border-b border-line pb-3">
              <Store className="size-6 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{shop.name}</span>
                <span className="block text-xs text-ink-soft">
                  {SHOP_TYPE_FA[shop.type]} · {cityName(shop.cityId)}
                </span>
              </span>
              <BadgeCheck className="size-5 text-brand" aria-label="هویت تأییدشده" />
            </Link>

            <div className="space-y-1.5 border-b border-line pb-3 text-sm">
              <p className="flex items-center gap-1.5 font-bold">
                <Truck className="size-4 text-brand" aria-hidden />
                ارسال به {cityName(dest)}
              </p>
              {quote.best ? (
                <>
                  <p className="text-xs text-ink-soft">
                    {quote.best.label}، رسیدن {etaPhrase(quote.best)} (تا <JalaliDate date={quote.best.etaTo} format="short" />)
                  </p>
                  <p className="text-xs text-ink-soft">هنگام رسیدن {quote.best.freshOnArrivalDays.toLocaleString("fa-IR")} روز تازه می‌ماند</p>
                </>
              ) : (
                <p className="text-xs text-danger">تا {cityName(dest)} تازه نمی‌رسد؛ شهر مقصد را عوض کنید.</p>
              )}
            </div>

            {landedPerKg && first.netGrams ? (
              <div className="rounded-control bg-brand-soft p-2.5 text-xs leading-6">
                <p className="font-bold text-brand-strong">قیمت تمام‌شده‌ی هر کیلو تا درِ خانه: {formatToman(landedPerKg)}</p>
                <p className="text-ink-soft">
                  {first.label} <Toman rial={first.priceRial} /> + ارسال <Toman rial={quote.best!.costRial} /> ÷ <Weight grams={first.netGrams} />
                </p>
              </div>
            ) : null}

            <BuyBox listing={l} disabled={!quote.deliverable} disabledReason={quote.reason ? `این محصول ${REASON_FA[quote.reason]}.` : undefined} />

            <p className="flex gap-2 text-[0.72rem] leading-5 text-ink-soft">
              <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden />
              پول شما تا {pt.complaintWindowHours.toLocaleString("fa-IR")} ساعت بعد از تحویل نزد نوبر امانت می‌ماند.
            </p>
          </div>
        </aside>
      </div>

      <SectionTabs items={[["reviews", "دیدگاه‌ها"], ["questions", "پرسش و پاسخ"], ["story", "باغ‌نامه"], ["similar", "پیشنهادهای مشابه"]]} />

      {similar.length ? (
        <section id="similar" className="scroll-mt-48 overflow-hidden rounded-card border border-line bg-surface">
          <h2 className="px-4 pt-4 text-lg font-extrabold">{pt.name} از غرفه‌های دیگر</h2>
          <ListingRail hits={similar} />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
        <section id="reviews" className="scroll-mt-48 rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-lg font-extrabold">دیدگاه خریدارها</h2>
          <div className="mb-5 border-b border-line pb-5">
            <RatingSummary reviews={reviews} fallback={shop.ratingAvg} />
          </div>
          <div className="mb-5">
            <ReviewForm listingId={l.id} />
          </div>
          {reviews.length ? (
            <ul className="divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <RatingStars value={r.rating} />
                    <span className="font-bold">{r.buyerName}</span>
                    <span className="text-ink-soft">از {r.buyerCity}</span>
                    <Badge tone="neutral">خرید تأییدشده</Badge>
                    <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
                  </div>
                  <p className="mt-2 leading-7">{r.text}</p>
                  {r.sellerReply ? (
                    <p className="mt-2 rounded-control border-s-2 border-brand bg-surface-2 p-3 text-sm">
                      <span className="font-bold">پاسخ غرفه‌دار: </span>
                      {r.sellerReply}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">هنوز دیدگاهی ثبت نشده است.</p>
          )}
        </section>
        <section id="questions" className="scroll-mt-48 rounded-card border border-line bg-surface p-5">
          <h2 className="mb-2 text-lg font-extrabold">پرسش و پاسخ</h2>
          <QandA listing={l} shopName={shop.name} />
        </section>
        </div>

        <aside className="space-y-4">
          <section id="story" className="scroll-mt-48 rounded-card border border-line bg-surface p-5">
            <p className="text-xs font-bold text-brand">باغ‌نامه</p>
            <h2 className="mt-1 font-extrabold">{shop.story.title}</h2>
            <p className="mt-2 line-clamp-4 text-sm leading-7 text-ink-soft">{shop.story.body[0]}</p>
            <Link href={`/shop/${shop.id}`} className="mt-3 inline-flex items-center gap-0.5 text-sm font-bold text-brand hover:underline">
              داستان کامل باغ
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </section>
          {perKg ? (
            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="mb-2 font-extrabold">قیمت در بازار نوبر</h2>
              {stat ? (
                <>
                  <p className="text-sm">
                    میانه‌ی هر کیلو {pt.name}: <Toman rial={stat.median} className="font-bold" />
                  </p>
                  <p className="text-xs text-ink-soft">
                    بازه‌ی رایج <Toman rial={stat.p25} /> تا <Toman rial={stat.p75} />
                  </p>
                  <Badge tone={position === "ABOVE" ? "saffron" : "brand"} className="mt-2">
                    {PRICE_POSITION_FA[position]}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-ink-soft">برای این محصول هنوز آمار کافی نداریم.</p>
              )}
            </section>
          ) : null}
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-2 font-extrabold">نگهداری</h2>
            <p className="text-sm leading-7 text-ink-soft">{pt.storageTips}</p>
          </section>
        </aside>
      </div>
      <StickyBuyBar listing={l} disabled={!quote.deliverable} />
    </div>
  );
}
