"use client";

import {
  CATEGORIES,
  cityName,
  currentMonth,
  inSeason,
  isPeak,
  PRODUCE_TYPES,
  SHOPS,
  type SearchHit,
  type SearchParams,
  type Shop,
} from "@nobar/demo";
import { LogoMark, Skeleton, Toman } from "@nobar/ui";
import {
  ArrowLeft,
  CalendarDays,
  Leaf,
  MapPin,
  Scale,
  Sparkles,
  Sprout,
  Star,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ListingCard, ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { type Promo, PromoCarousel } from "@/components/promo-carousel";
import { Recommendations } from "@/components/recommendations";
import { useCatalogSearch } from "@/lib/api-catalog";
import { API_URL } from "@/lib/api-config";
import { bannerSrc, type BannerPhoto } from "@/lib/photos";
import { useStore } from "@/lib/store";

const RAIL = 12;

/** Four picture tiles under the strip; each opens a real page or filter. */
const TILES: Array<{ href: string; src: BannerPhoto; title: string; body: string }> = [
  { href: "/baghboon/", src: "banner-harvest", title: "سبد میوه با باغبون", body: "بگویید برای چند نفر و با چه بودجه‌ای" },
  { href: "/shops/", src: "banner-orchard", title: "از باغدار بخرید", body: "غرفه‌های تأییدشده از شهرهای ایران" },
  { href: "/season/", src: "banner-pomegranate", title: "تقویم فصل", body: "هر میوه، کی در اوج است" },
  { href: "/search/?sort=freshness&fresh=1", src: "banner-market", title: "تازه‌چین‌ها", body: "بیشترین روزهای تازگی تا درِ خانه" },
];
const fa = (n: number) => n.toLocaleString("fa-IR");

function Section({
  title,
  sub,
  href,
  tone,
  children,
}: {
  title: string;
  sub?: string;
  href?: string;
  tone?: "brand";
  children: ReactNode;
}) {
  return (
    <section className={tone ? `nx-section nx-section-${tone}` : "nx-section"}>
      <div className="nx-section-head">
        <div>
          <h2 className="nx-section-title">{title}</h2>
          {sub ? <p className="nx-section-sub">{sub}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="nx-section-more">
            مشاهده همه <ArrowLeft className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** One row of products from the catalog (the API in API mode, the demo data otherwise). */
function ProductRow(props: {
  params: SearchParams;
  title: string;
  sub?: string;
  href: string;
  tone?: "brand";
}) {
  const { result, loading } = useCatalogSearch(props.params, {
    pageSize: RAIL,
  });
  const hits = result.hits.slice(0, RAIL);
  if (!loading && !hits.length) return null;
  return (
    <Section
      title={props.title}
      sub={props.sub}
      href={props.href}
      tone={props.tone}
    >
      {loading ? (
        <div className="nx-rail">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              key={i}
              className="nx-rail-item aspect-[3/5] rounded-xl"
            />
          ))}
        </div>
      ) : (
        <ListingRail hits={hits} />
      )}
    </Section>
  );
}

/**
 * The "fresh nobars" strip: a red frame with an intro block, joined product cards and a "see all" card that fills
 * the remaining width. Only real first-harvest listings appear; no countdown or discount is shown because Nobar has none.
 */
function NobarStrip({ params }: { params: SearchParams }) {
  const { result, loading } = useCatalogSearch(params, { pageSize: RAIL });
  const hits = result.hits.slice(0, RAIL);
  if (!loading && !hits.length) return null;
  return (
    <section className="nx-amazing" aria-labelledby="nx-amazing-title">
      <ul className="nx-amazing-rail">
        <li className="nx-amazing-intro">
          <LogoMark className="nx-amazing-mark" />
          <h2 id="nx-amazing-title" className="nx-amazing-title">
            نوبرهای
            <br />
            تازه
          </h2>
          <p className="nx-amazing-sub">اولین برداشت‌های فصل</p>
          <Link href="/search/?nobar=1" className="nx-amazing-all">
            مشاهده همه <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </li>
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="nx-amazing-item">
                <Skeleton className="h-full min-h-72 w-full rounded-none" />
              </li>
            ))
          : hits.map((h) => (
              <li key={h.listing.id} className="nx-amazing-item">
                <ListingCard hit={h} variant="row" />
              </li>
            ))}
        <li className="nx-amazing-end">
          <Link
            href="/search/?nobar=1"
            className="nx-amazing-end-link"
            style={{
              backgroundImage: `linear-gradient(0deg, rgb(20 10 14 / 0.72), rgb(20 10 14 / 0.25)), url(${bannerSrc("banner-pomegranate")})`,
            }}
          >
            <span className="nx-amazing-end-icon" aria-hidden>
              <ArrowLeft className="size-6" />
            </span>
            همه‌ی نوبرهای فصل
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Shortcuts under the banner. Each one opens a real filter or page. */
const QUICK: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { href: "/search/?nobar=1", label: "نوبرها", icon: Sparkles, tone: "nobar" },
  { href: "/search/?fresh=1", label: "تازه‌چین", icon: Leaf, tone: "brand" },
  { href: "/search/?organic=1", label: "ارگانیک", icon: Sprout, tone: "lime" },
  {
    href: "/search/?sort=landed",
    label: "به‌صرفه‌ها",
    icon: Wallet,
    tone: "saffron",
  },
  { href: "/shops/", label: "غرفه‌ها", icon: Store, tone: "sky" },
  { href: "/season/", label: "تقویم فصل", icon: CalendarDays, tone: "violet" },
  { href: "/compare/", label: "مقایسه", icon: Scale, tone: "teal" },
  { href: "/baghboon/", label: "باغبون", icon: Sprout, tone: "brand" },
];

function RankedItem({ hit, rank }: { hit: SearchHit; rank: number }) {
  const { listing: l, shop, type, offer } = hit;
  return (
    <li>
      <Link href={`/l/${l.id}/`} className="nx-rank-item">
        <Photo
          kind={type.id}
          alt=""
          fallback={{ emoji: type.emoji, hue: type.hue }}
          sizes="72px"
          className="nx-rank-photo"
        />
        <span className="nx-rank-no" aria-hidden>
          {fa(rank)}
        </span>
        <span className="nx-rank-text">
          <span className="nx-rank-title">{l.title}</span>
          <span className="nx-rank-meta">
            {shop.name}
            {shop.ratingCount ? (
              <span className="nx-rank-rating">
                <Star className="size-3 fill-current" aria-hidden />{" "}
                {shop.ratingAvg.toLocaleString("fa-IR")}
              </span>
            ) : null}
          </span>
          <span className="nx-rank-price">
            <Toman rial={offer.landedPerKgRial} unit={false} />{" "}
            <small>تومان هر کیلو، با ارسال</small>
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Nine listings from the best-rated shops, numbered, three columns on desktop. */
function RankedList({
  params,
  title,
  sub,
  href,
}: {
  params: SearchParams;
  title: string;
  sub: string;
  href: string;
}) {
  const { result, loading } = useCatalogSearch(params, { pageSize: 9 });
  const hits = result.hits.slice(0, 9);
  if (loading || hits.length < 3) return null;
  return (
    <Section title={title} sub={sub} href={href}>
      <ol className="nx-rank">
        {hits.map((h, i) => (
          <RankedItem key={h.listing.id} hit={h} rank={i + 1} />
        ))}
      </ol>
    </Section>
  );
}

type ShopTile = Pick<Shop, "id" | "name" | "cityId" | "ratingAvg" | "ratingCount" | "hue" | "type"> & { art?: string };

function useShops(): ShopTile[] {
  const [shops, setShops] = useState<ShopTile[]>(API_URL ? [] : [...SHOPS]);
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/v1/shops`)
      .then((r) => (r.ok ? (r.json() as Promise<ShopTile[]>) : []))
      .then(setShops)
      .catch(() => setShops([]));
  }, []);
  return useMemo(
    () =>
      [...shops]
        .sort(
          (a, b) =>
            b.ratingAvg * Math.log1p(b.ratingCount) -
            a.ratingAvg * Math.log1p(a.ratingCount),
        )
        .slice(0, 10),
    [shops],
  );
}

const SHOP_TYPE: Record<string, string> = {
  GROWER: "باغدار",
  SHOP: "میوه‌فروشی",
  COOPERATIVE: "تعاونی",
};

export default function HomePage() {
  const { dest } = useStore();
  const month = currentMonth();
  const seasonal = PRODUCE_TYPES.filter((t) => inSeason(t, month)).sort(
    (a, b) => Number(isPeak(b, month)) - Number(isPeak(a, month)),
  );
  const shops = useShops();
  const city = cityName(dest);
  const origins = useMemo(() => {
    // the shop list per city comes from the demo data; with the API the section stays hidden
    if (API_URL) return [];
    const count = new Map<string, number>();
    for (const sh of SHOPS)
      if (sh.status === "ACTIVE")
        count.set(sh.cityId, (count.get(sh.cityId) ?? 0) + 1);
    return [...count]
      .map(([id, n]) => ({ id, count: n }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const promos: Promo[] = [
    {
      href: "/search/?nobar=1",
      src: bannerSrc("banner-pomegranate"),
      title: "نوبرهای این هفته رسید",
      body: "اولین برداشت‌های فصل، مستقیم از باغ",
      cta: "دیدن نوبرها",
    },
    {
      href: "/search/?sort=landed",
      src: bannerSrc("banner-market"),
      title: `قیمت تمام‌شده تا ${city}`,
      body: "قیمت کالا و هزینه‌ی ارسال، پیش از خرید و یک‌جا",
      cta: "ارزان‌ترین‌ها",
    },
    {
      href: "/shops/",
      src: bannerSrc("banner-orchard"),
      title: "از باغدار بخرید، نه واسطه",
      body: "غرفه‌های تأییدشده از شهرهای ایران",
      cta: "غرفه‌گردی",
    },
    {
      href: "/baghboon/",
      src: bannerSrc("banner-harvest"),
      title: "باغبون، دستیار خرید شما",
      body: "بگویید برای چند نفر و با چه بودجه‌ای؛ سبد را می‌چیند",
      cta: "گفت‌وگو با باغبون",
    },
  ];

  return (
    <div className="nx-home">
      <PromoCarousel slides={promos} />

      <nav className="nx-quick" aria-label="دسترسی سریع">
        {QUICK.map(({ href, label, icon: Icon, tone }) => (
          <Link key={href} href={href} className="nx-quick-item">
            <span className={`nx-quick-icon nx-tone-${tone}`} aria-hidden>
              <Icon className="size-6" strokeWidth={1.8} />
            </span>
            <span className="nx-quick-label">{label}</span>
          </Link>
        ))}
      </nav>

      <NobarStrip params={{ dest, nobarOnly: true, sort: "newest" }} />



      <ul className="nx-banners" aria-label="پیشنهادها">
        {TILES.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="nx-banner">
              <Image src={bannerSrc(t.src)} alt="" fill sizes="(max-width: 768px) 50vw, 330px" className="nx-banner-image" />
              <span className="nx-banner-shade" />
              <span className="nx-banner-text">
                <strong>{t.title}</strong>
                <span>{t.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Section
        title="میوه و سبزی فصل"
        sub="آنچه این روزها می‌رسد"
        href="/season/"
      >
        <nav className="nx-cats" aria-label="محصولات فصل">
          {seasonal.slice(0, 9).map((t) => (
            <Link key={t.id} href={`/p/${t.id}/`} className="nx-cat">
              <Photo
                kind={t.id}
                alt=""
                fallback={{ emoji: t.emoji, hue: t.hue }}
                sizes="72px"
                className="nx-cat-photo"
              />
              <span className="nx-cat-name">{t.name}</span>
            </Link>
          ))}
          <Link href="/categories/" className="nx-cat nx-cat-all">
            <span className="nx-cat-photo nx-cat-all-icon" aria-hidden>
              <ArrowLeft className="size-6" />
            </span>
            <span className="nx-cat-name">همه‌ی دسته‌ها</span>
          </Link>
        </nav>
      </Section>

      <Section title="خرید بر اساس دسته‌بندی">
        <ul className="nx-cattiles">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={`/search/?cat=${c.id}`} className="nx-cattile">
                <Photo
                  kind={c.art}
                  alt=""
                  fallback={{ emoji: c.emoji, hue: 120 }}
                  sizes="(max-width: 640px) 30vw, 180px"
                  className="nx-cattile-photo"
                />
                <span className="nx-cattile-name">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Recommendations for={{ home: true }} title="پیشنهاد امروز برای شما" />

      <ProductRow
        params={{ dest, sort: "freshness" }}
        title={`تازه‌ترین‌ها برای ${city}`}
        sub="بیشترین روزهای تازگی هنگام رسیدن"
        href="/search/?sort=freshness&fresh=1"
      />

      <div className="nx-duo">
        <Link href="/baghboon/" className="nx-duo-card nx-duo-brand">
          <Sprout className="nx-duo-icon" aria-hidden />
          <span>
            <strong>از باغبون بپرسید</strong>
            <span>«سبد میوه برای ۶ نفر با ۸۰۰ هزار تومان»</span>
          </span>
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Link href="/compare/" className="nx-duo-card nx-duo-saffron">
          <Scale className="nx-duo-icon" aria-hidden />
          <span>
            <strong>مقایسه‌ی غرفه‌ها</strong>
            <span>قیمت تمام‌شده، تازگی و زمان رسیدن کنار هم</span>
          </span>
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
      </div>

      <ProductRow
        params={{ dest, sort: "landed" }}
        title="به‌صرفه‌ترین تا درِ خانه"
        sub="ارزان‌ترین قیمت هر کیلو، با هزینه‌ی ارسال"
        href="/search/?sort=landed"
        tone="brand"
      />

      {shops.length ? (
        <Section
          title="غرفه‌های برتر"
          sub="باغدارها و فروشنده‌های محبوب"
          href="/shops/"
        >
          <ul className="nx-rail">
            {shops.map((s) => (
              <li key={s.id} className="nx-rail-item nx-shop-item">
                <Link href={`/shop/${s.id}/`} className="nx-shop">
                  {s.art ? (
                    <Photo kind={s.art} alt="" fallback={{ emoji: "🧺", hue: s.hue }} sizes="64px" className="nx-shop-avatar" />
                  ) : (
                    <span className="nx-shop-avatar nx-shop-avatar-icon" aria-hidden>
                      <Store className="size-6" strokeWidth={1.7} />
                    </span>
                  )}
                  <span className="nx-shop-name">{s.name}</span>
                  <span className="nx-shop-meta">
                    <MapPin className="size-3" aria-hidden />{" "}
                    {cityName(s.cityId)} · {SHOP_TYPE[s.type] ?? ""}
                  </span>
                  {s.ratingCount ? (
                    <span className="nx-shop-rating">
                      <Star className="size-3.5 fill-current" aria-hidden />{" "}
                      {s.ratingAvg.toLocaleString("fa-IR")}{" "}
                      <span>({fa(s.ratingCount)} نظر)</span>
                    </span>
                  ) : (
                    <span className="nx-shop-rating nx-shop-new">
                      غرفه‌ی تازه
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <RankedList
        params={{ dest, sort: "rating" }}
        title="از غرفه‌های با بهترین امتیاز"
        sub="به ترتیب امتیاز خریدارها به غرفه"
        href="/search/?sort=rating"
      />

      {origins.length ? (
        <Section title="خرید از مبدأ" sub="محصول هر شهر، از باغدارهای همان‌جا">
          <ul className="nx-origins">
            {origins.map((o) => (
              <li key={o.id}>
                <Link href={`/origin/${o.id}/`} className="nx-origin">
                  <MapPin className="size-4" aria-hidden />
                  <span>{cityName(o.id)}</span>
                  <small>{fa(o.count)} غرفه</small>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Link href="/about/sell/" className="nx-sell-banner">
        <span>
          <strong>باغ یا مغازه‌ی میوه دارید؟</strong>
          <span>در نوبر مستقیم به خریدارهای سراسر ایران بفروشید.</span>
        </span>
        <span className="nx-sell-cta">
          ثبت غرفه <ArrowLeft className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
