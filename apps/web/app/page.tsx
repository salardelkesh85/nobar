"use client";

import { cityName, currentMonth, inSeason, isPeak, PRODUCE_TYPES, SHOPS, type SearchParams, type Shop } from "@nobar/demo";
import { Skeleton } from "@nobar/ui";
import { ArrowLeft, BadgeCheck, MapPin, Scale, ShieldCheck, Sprout, Star, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { type Promo, PromoCarousel } from "@/components/promo-carousel";
import { Recommendations } from "@/components/recommendations";
import { useCatalogSearch } from "@/lib/api-catalog";
import { API_URL } from "@/lib/api-config";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";

const RAIL = 12;
const fa = (n: number) => n.toLocaleString("fa-IR");

function Section({ title, sub, href, tone, children }: { title: string; sub?: string; href?: string; tone?: "nobar" | "brand"; children: ReactNode }) {
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
function ProductRow(props: { params: SearchParams; title: string; sub?: string; href: string; tone?: "nobar" | "brand" }) {
  const { result, loading } = useCatalogSearch(props.params, { pageSize: RAIL });
  const hits = result.hits.slice(0, RAIL);
  if (!loading && !hits.length) return null;
  return (
    <Section title={props.title} sub={props.sub} href={props.href} tone={props.tone}>
      {loading ? (
        <div className="nx-rail">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="nx-rail-item aspect-[3/5] rounded-xl" />
          ))}
        </div>
      ) : (
        <ListingRail hits={hits} />
      )}
    </Section>
  );
}

type ShopTile = Pick<Shop, "id" | "name" | "cityId" | "ratingAvg" | "ratingCount" | "emoji" | "hue" | "type">;

function useShops(): ShopTile[] {
  const [shops, setShops] = useState<ShopTile[]>(API_URL ? [] : [...SHOPS]);
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/v1/shops`)
      .then((r) => (r.ok ? (r.json() as Promise<ShopTile[]>) : []))
      .then(setShops)
      .catch(() => setShops([]));
  }, []);
  return useMemo(() => [...shops].sort((a, b) => b.ratingAvg * Math.log1p(b.ratingCount) - a.ratingAvg * Math.log1p(a.ratingCount)).slice(0, 10), [shops]);
}

const SHOP_TYPE: Record<string, string> = { GROWER: "باغدار", SHOP: "میوه‌فروشی", COOPERATIVE: "تعاونی" };

export default function HomePage() {
  const { dest } = useStore();
  const month = currentMonth();
  const seasonal = PRODUCE_TYPES.filter((t) => inSeason(t, month)).sort((a, b) => Number(isPeak(b, month)) - Number(isPeak(a, month)));
  const shops = useShops();
  const city = cityName(dest);

  const promos: Promo[] = [
    { href: "/search/?nobar=1", src: bannerSrc("banner-pomegranate"), title: "نوبرهای این هفته رسید", body: "اولین برداشت‌های فصل، مستقیم از باغ", cta: "دیدن نوبرها" },
    { href: "/search/?sort=landed", src: bannerSrc("banner-market"), title: `قیمت تمام‌شده تا ${city}`, body: "قیمت کالا و هزینه‌ی ارسال، پیش از خرید و یک‌جا", cta: "ارزان‌ترین‌ها" },
    { href: "/shops/", src: bannerSrc("banner-orchard"), title: "از باغدار بخرید، نه واسطه", body: "غرفه‌های تأییدشده از شهرهای ایران", cta: "غرفه‌گردی" },
    { href: "/baghboon/", src: bannerSrc("banner-harvest"), title: "باغبون، دستیار خرید شما", body: "بگویید برای چند نفر و با چه بودجه‌ای؛ سبد را می‌چیند", cta: "گفت‌وگو با باغبون" },
  ];

  return (
    <div className="nx-home">
      <PromoCarousel slides={promos} />

      <nav className="nx-cats" aria-label="محصولات فصل">
        {seasonal.slice(0, 9).map((t) => (
          <Link key={t.id} href={`/p/${t.id}/`} className="nx-cat">
            <Photo kind={t.id} alt="" fallback={{ emoji: t.emoji, hue: t.hue }} sizes="72px" className="nx-cat-photo" />
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

      <ProductRow params={{ dest, nobarOnly: true, sort: "newest" }} title="نوبرهای تازه" sub="اولین برداشت‌های فصل، به محض رسیدن" href="/search/?nobar=1" tone="nobar" />

      <ul className="nx-values" aria-label="چرا نوبر">
        <li>
          <Truck aria-hidden /> <span><strong>تازه می‌رسد</strong> فقط محصولی که تازه به {city} برسد</span>
        </li>
        <li>
          <Wallet aria-hidden /> <span><strong>قیمت تمام‌شده</strong> کالا و ارسال، پیش از خرید</span>
        </li>
        <li>
          <ShieldCheck aria-hidden /> <span><strong>پول در امانت</strong> تا تحویل و پایان مهلت شکایت</span>
        </li>
        <li>
          <BadgeCheck aria-hidden /> <span><strong>فروشنده‌ی تأییدشده</strong> با مدارک هویتی، پیش از فروش</span>
        </li>
      </ul>

      <Recommendations for={{ home: true }} title="پیشنهاد امروز برای شما" />

      <ProductRow params={{ dest, sort: "freshness" }} title={`تازه‌ترین‌ها برای ${city}`} sub="بیشترین روزهای تازگی هنگام رسیدن" href="/search/?sort=freshness&fresh=1" />

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

      <ProductRow params={{ dest, sort: "landed" }} title="به‌صرفه‌ترین تا درِ خانه" sub="ارزان‌ترین قیمت هر کیلو، با هزینه‌ی ارسال" href="/search/?sort=landed" tone="brand" />

      {shops.length ? (
        <Section title="غرفه‌های برتر" sub="باغدارها و فروشنده‌های محبوب" href="/shops/">
          <ul className="nx-rail">
            {shops.map((s) => (
              <li key={s.id} className="nx-rail-item nx-shop-item">
                <Link href={`/shop/${s.id}/`} className="nx-shop">
                  <span className="nx-shop-avatar" style={{ background: `hsl(${s.hue} 60% 92%)` }} aria-hidden>
                    {s.emoji}
                  </span>
                  <span className="nx-shop-name">{s.name}</span>
                  <span className="nx-shop-meta">
                    <MapPin className="size-3" aria-hidden /> {cityName(s.cityId)} · {SHOP_TYPE[s.type] ?? ""}
                  </span>
                  {s.ratingCount ? (
                    <span className="nx-shop-rating">
                      <Star className="size-3.5 fill-current" aria-hidden /> {s.ratingAvg.toLocaleString("fa-IR")} <span>({fa(s.ratingCount)} نظر)</span>
                    </span>
                  ) : (
                    <span className="nx-shop-rating nx-shop-new">غرفه‌ی تازه</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <ProductRow params={{ dest, sort: "rating" }} title="محبوب خریدارها" sub="از غرفه‌هایی با بهترین امتیاز" href="/search/?sort=rating" />

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
