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
  quoteDelivery,
  REASON_FA,
  reviewsForListing,
  SHOP_TYPE_FA,
  shopById,
} from "@nobar/demo";
import { formatToman } from "@nobar/fa";
import { Badge, ButtonLink, Card, FreshnessBadge, FreshnessMeter, JalaliDate, NobarBadge, ProduceArt, RatingStars, RelativeDay, Toman, Weight } from "@nobar/ui";
import { BookOpen, ChevronLeft, Info, Leaf, Scale, ShieldCheck, Snowflake, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox, CompareToggle } from "@/components/actions";
import { decodeSlug, getDestination } from "@/lib/server";

type Params = Promise<{ slug: string }>;

const GRADE_FA = { PREMIUM: "ممتاز", GRADE_1: "درجه‌یک", GRADE_2: "درجه‌دو", PROCESSING: "آبمیوه‌ای / صنعتی" } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = listingBySlug(decodeSlug((await params).slug));
  if (!l) return {};
  const shop = shopById(l.shopId);
  return { title: l.title, description: `${l.description} از ${shop?.name}، ${cityName(l.originCityId)}.` };
}

export default async function ListingPage({ params }: { params: Params }) {
  const l = listingBySlug(decodeSlug((await params).slug));
  if (!l) notFound();
  const shop = shopById(l.shopId)!;
  const pt = produceTypeById(l.produceTypeId)!;
  const cat = categoryById(pt.categoryId);
  const dest = await getDestination();
  const fresh = freshnessOf(l);
  const quote = quoteDelivery(l, dest);
  const first = l.packages[0]!;
  const reviews = reviewsForListing(l.id);
  const stat = marketStat(pt.id);
  const position = pricePosition(l);
  const perKg = minPricePerKg(l);
  const landedPerKg = quote.best ? pricePerKg(first.priceRial + quote.best.costRial, packageGrams(first)) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: l.title,
        description: l.description,
        brand: { "@type": "Brand", name: shop.name },
        offers: l.packages.map((p) => ({ "@type": "Offer", name: p.label, priceCurrency: "IRR", price: String(p.priceRial), availability: "https://schema.org/InStock" })),
        aggregateRating: { "@type": "AggregateRating", ratingValue: shop.ratingAvg, reviewCount: shop.ratingCount },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "نوبر", item: "/" },
          { "@type": "ListItem", position: 2, name: cat?.name, item: `/search?cat=${cat?.id}` },
          { "@type": "ListItem", position: 3, name: pt.name, item: `/p/${pt.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="مسیر" className="flex flex-wrap items-center gap-1 text-sm text-ink-soft">
        <Link href="/" className="hover:text-brand">خانه</Link>
        <ChevronLeft className="size-4" aria-hidden />
        <Link href={`/search?cat=${cat?.id}`} className="hover:text-brand">{cat?.name}</Link>
        <ChevronLeft className="size-4" aria-hidden />
        <Link href={`/p/${pt.slug}`} className="hover:text-brand">{pt.name}</Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <div>
          <ProduceArt emoji={pt.emoji} kind={pt.id} hue={pt.hue} size="xl" className="aspect-[16/10] w-full rounded-card lg:aspect-square" label={l.title} />
          <div className="mt-3 hidden grid-cols-4 gap-2 sm:grid">
            {[0, 1, 2, 3].map((i) => (
              <ProduceArt key={i} emoji={pt.emoji} kind={pt.id} hue={pt.hue + i * 12} size="sm" className="aspect-square rounded-control opacity-80" />
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
            <Info className="size-3.5" aria-hidden />
            در نسخه‌ی واقعی اینجا عکس‌های واقعی غرفه‌دار نمایش داده می‌شود (حداقل دو عکس).
          </p>
        </div>

        {/* Summary + buy */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {isNobar(l) ? <NobarBadge /> : null}
            <FreshnessBadge level={fresh.badge} detail={fresh.badge !== "PREORDER" ? harvestPhrase(fresh) : undefined} />
            <Badge tone="neutral">{GRADE_FA[l.grade]}</Badge>
            {l.isOrganic ? (
              <Badge tone="brand">
                <Leaf className="size-3" aria-hidden /> ارگانیک (ادعای فروشنده، گواهی در حال بررسی)
              </Badge>
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-black leading-snug sm:text-3xl">{l.title}</h1>
            <p className="mt-2 text-ink-soft">
              {l.variety ? <>رقم {l.variety} · </> : null}
              مبدأ: <Link href={`/origin/${l.originCityId}`} className="font-bold text-brand hover:underline">{cityName(l.originCityId)}</Link>
              {" · "}
              <Link href={`/shop/${shop.slug}`} className="font-bold text-brand hover:underline">{shop.name}</Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <RatingStars value={shop.ratingAvg} count={shop.ratingCount} />
              <span className="text-sm text-ink-soft">امتیاز تازگی {shop.freshnessRatingAvg.toLocaleString("fa-IR")} از ۵</span>
            </div>
          </div>

          <Card className="space-y-3 p-4">
            {fresh.badge === "PREORDER" ? (
              <p className="font-bold">
                پیش‌فروش — ارسال از <JalaliDate date={l.preorderDispatchFrom!} />
              </p>
            ) : (
              <>
                <p className="text-sm">
                  تاریخ برداشت: <JalaliDate date={l.harvestedAt} className="font-bold" /> (<RelativeDay date={l.harvestedAt} />)
                </p>
                <FreshnessMeter ratio={fresh.ratio} label={`${fresh.daysLeft.toLocaleString("fa-IR")} روز تازگی باقی‌مانده از ${fresh.shelfDays.toLocaleString("fa-IR")} روز`} />
              </>
            )}
            {pt.storage !== "AMBIENT" ? (
              <p className="flex items-center gap-1 text-xs text-ink-soft">
                <Snowflake className="size-3.5" aria-hidden />
                {pt.storage === "COLD" ? "به زنجیره‌ی سرد نیاز دارد؛ فقط ارسال درون‌شهری." : "در جای خنک نگه دارید."}
              </p>
            ) : null}
          </Card>

          <BuyBox listing={l} disabled={!quote.deliverable} disabledReason={quote.reason ? `این محصول ${REASON_FA[quote.reason]}. شهر مقصد را عوض کنید یا محصول نزدیک‌تری انتخاب کنید.` : undefined} />

          {/* Delivery checker */}
          <Card className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold">
              <Truck className="size-5 text-brand" aria-hidden />
              ارسال به {cityName(dest)}
            </h2>
            {quote.deliverable ? (
              <ul className="space-y-2">
                {quote.options.map((o, i) => (
                  <li key={o.method} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-bold">{o.label}</span>
                      {i === 0 ? <Badge tone="brand" className="ms-2">پیشنهادی</Badge> : null}
                      <span className="block text-xs text-ink-soft">
                        رسیدن {etaPhrase(o)} (تا <JalaliDate date={o.etaTo} format="short" />) · هنگام رسیدن {o.freshOnArrivalDays.toLocaleString("fa-IR")} روز تازه می‌ماند
                      </span>
                    </span>
                    <span className="font-bold">{o.costRial === 0 ? "رایگان" : formatToman(o.costRial)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-control bg-danger-soft p-3 text-sm text-danger">
                این محصول تا {cityName(dest)} تازه نمی‌رسد؛ فقط برای ارسال به شهرهای نزدیک {cityName(shop.cityId)} فعال است.
              </p>
            )}
            {landedPerKg && first.netGrams ? (
              <div className="mt-3 rounded-control border border-brand/30 bg-brand-soft p-3 text-sm">
                <p className="font-bold text-brand-strong">قیمت تمام‌شده‌ی هر کیلو تا درِ خانه: {formatToman(landedPerKg)}</p>
                <p className="text-xs text-ink-soft">
                  برای {first.label}: <Toman rial={first.priceRial} /> + ارسال <Toman rial={quote.best!.costRial} /> ÷ <Weight grams={first.netGrams} />
                </p>
              </div>
            ) : null}
          </Card>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/compare?type=${pt.slug}`} variant="secondary">
              <Scale className="size-4" aria-hidden />
              مقایسه با غرفه‌های دیگر
            </ButtonLink>
            <CompareToggle listingId={l.id} className="min-h-11 px-4 text-sm" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-extrabold">درباره‌ی این محصول</h2>
            <p className="leading-8">{l.description}</p>
            {l.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {l.tags.map((t) => (
                  <Badge key={t} tone="neutral">{t}</Badge>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-extrabold">نظر خریدارها ({reviews.length.toLocaleString("fa-IR")})</h2>
            {reviews.length ? (
              <ul className="divide-y divide-line">
                {reviews.map((r) => (
                  <li key={r.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold">{r.buyerName}</span>
                      <span className="text-ink-soft">از {r.buyerCity}</span>
                      <RatingStars value={r.rating} />
                      <Badge tone="brand">تازگی {r.freshnessRating.toLocaleString("fa-IR")} از ۵</Badge>
                      <Badge tone="neutral">خرید تأییدشده</Badge>
                      <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
                    </div>
                    <p className="mt-2 leading-7">{r.text}</p>
                    {r.sellerReply ? (
                      <p className="mt-2 rounded-control bg-surface-2 p-3 text-sm">
                        <span className="font-bold">پاسخ غرفه‌دار: </span>
                        {r.sellerReply}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">هنوز نظری ثبت نشده است. بعد از تحویل، خریدارها می‌توانند نظر بدهند.</p>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <ProduceArt emoji={shop.emoji} kind={shop.art} hue={shop.hue} size="md" className="h-24 w-full" />
            <div className="p-4">
              <p className="text-xs text-ink-soft">{SHOP_TYPE_FA[shop.type]} در {cityName(shop.cityId)} · از سال {shop.story.sinceYear.toLocaleString("fa-IR", { useGrouping: false })}</p>
              <h2 className="text-lg font-extrabold">{shop.name}</h2>
              <p className="mt-1 text-sm font-bold text-brand-strong">{shop.story.title}</p>
              <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-soft">{shop.story.body[0]}</p>
              <ButtonLink href={`/shop/${shop.slug}`} variant="secondary" size="sm" className="mt-3">
                <BookOpen className="size-4" aria-hidden />
                باغ‌نامه و همه‌ی محصولات
              </ButtonLink>
            </div>
          </Card>

          {perKg ? (
            <Card className="p-4">
              <h2 className="mb-2 font-extrabold">قیمت در بازار نوبر</h2>
              {stat ? (
                <>
                  <p className="text-sm">
                    میانه‌ی قیمت هر کیلو {pt.name}: <Toman rial={stat.median} className="font-bold" />
                  </p>
                  <p className="text-xs text-ink-soft">
                    بازه‌ی رایج <Toman rial={stat.p25} /> تا <Toman rial={stat.p75} /> ({stat.count.toLocaleString("fa-IR")} غرفه)
                  </p>
                  <Badge tone={position === "ABOVE" ? "saffron" : "brand"} className="mt-2">{PRICE_POSITION_FA[position]}</Badge>
                </>
              ) : (
                <p className="text-sm text-ink-soft">برای این محصول هنوز آمار کافی نداریم (کمتر از ۵ غرفه).</p>
              )}
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="mb-2 font-extrabold">فصل {pt.name}</h2>
            <p className="text-sm text-ink-soft">{pt.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")}</p>
            <h3 className="mt-3 text-sm font-bold">نگهداری</h3>
            <p className="text-sm leading-7 text-ink-soft">{pt.storageTips}</p>
          </Card>

          <Card className="flex gap-3 p-4">
            <ShieldCheck className="size-6 shrink-0 text-brand" aria-hidden />
            <p className="text-sm leading-7 text-ink-soft">
              پول شما تا {Math.round(pt.complaintWindowHours).toLocaleString("fa-IR")} ساعت بعد از تحویل نزد نوبر می‌ماند. اگر محصول خراب یا کم‌وزن بود، با عکس گزارش کنید.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
