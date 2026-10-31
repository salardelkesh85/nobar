"use client";

import { CATEGORIES, cityName, currentMonth, inSeason, isNobar, LISTINGS, PRODUCE_TYPES, ratingBayes, search, SHOPS, SHOP_TYPE_FA, type SearchHit } from "@nobar/demo";
import { ArrowLeft, BadgeCheck, Leaf, MapPin, Sparkles, Star, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BannerCarousel, type Slide } from "@/components/banner-carousel";
import { ListingCard, ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";

function SectionHeading({ title, subtitle, href, eyebrow }: { title: string; subtitle?: string; href: string; eyebrow?: string }) {
  return (
    <div className="nobar-v3-section-heading">
      <div className="min-w-0">
        {eyebrow ? <span className="nobar-v3-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <Link href={href} className="nobar-v3-see-all">مشاهده همه <ArrowLeft className="size-4" /></Link>
    </div>
  );
}

function ProductRail({ title, subtitle, href, hits, eyebrow }: { title: string; subtitle?: string; href: string; hits: SearchHit[]; eyebrow?: string }) {
  if (!hits.length) return null;
  return (
    <section className="nobar-v3-rail-section">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <SectionHeading title={title} subtitle={subtitle} href={href} eyebrow={eyebrow} />
      </div>
      <div className="nobar-v3-rail-body"><ListingRail hits={hits} /></div>
    </section>
  );
}

function PromoCard({ href, src, eyebrow, title, body, tone = "green" }: { href: string; src: string; eyebrow: string; title: string; body: string; tone?: "green" | "berry" }) {
  return (
    <Link href={href} className={"nobar-v3-promo-card " + (tone === "berry" ? "is-berry" : "is-green")}>
      <Image src={src} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" className="nobar-v3-promo-image" />
      <span className="nobar-v3-promo-overlay" />
      <span className="nobar-v3-promo-content">
        <span className="nobar-v3-promo-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <span>{body}</span>
        <span className="nobar-v3-promo-link">بیشتر ببینید <ArrowLeft className="size-4" /></span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { dest } = useStore();
  const month = currentMonth();
  const all = search({ dest, sort: "newest" }).hits;
  const nobarHits = all.filter((hit) => isNobar(hit.listing));
  const nobarIds = new Set(nobarHits.map((hit) => hit.listing.id));
  const seasonalHits = all.filter((hit) => inSeason(hit.type, month) && !nobarIds.has(hit.listing.id));
  const specialHits = [...nobarHits, ...seasonalHits].slice(0, 4);
  const byCat = (categoryId: string) => all.filter((hit) => hit.type.categoryId === categoryId);
  const quickTypes = PRODUCE_TYPES.filter((type) => LISTINGS.some((listing) => listing.produceTypeId === type.id)).slice(0, 10);
  const topShops = [...SHOPS].sort((a, b) => ratingBayes(b) - ratingBayes(a)).slice(0, 4);

  const slides: Slide[] = [
    { href: "/search", src: bannerSrc("banner-orchard"), eyebrow: "از دل باغ، تا خانه‌ی شما", title: "تازگی را از مبدأ انتخاب کن.", body: "محصول فصل را از غرفه‌های واقعی پیدا کن؛ شهر عرضه، تازگی و قیمت تا مقصد را پیش از خرید ببین.", cta: "ورود به بازار نوبر", tone: "green" },
    { href: "/p/pomegranate", src: bannerSrc("banner-pomegranate"), eyebrow: "فصل طعم‌های به‌یادماندنی", title: "هر فصل، یک طعم تازه.", body: "از انارهای خوش‌رنگ تا میوه‌های رسیده‌ی باغ؛ انتخاب‌های این فصل را کشف کن.", cta: "دیدن محصولات فصل", tone: "red" },
    { href: "/origin/miandoab", src: bannerSrc("banner-market"), eyebrow: "خرید با شناخت مبدأ", title: "پشت هر محصول، یک سرزمین.", body: "باغدارها و غرفه‌های شهرهای مختلف را بشناس و با خیال روشن‌تری انتخاب کن.", cta: "کشف شهرهای مبدأ", tone: "dark" },
  ];

  return (
    <div className="nobar-v3-home">
      <div className="nobar-v3-welcome">
        <span><Sparkles className="size-4" /> بازار تازه‌ی نوبر، مستقیم از مبدأ</span>
        <span><MapPin className="size-3.5" /> ارسال به <strong>{cityName(dest)}</strong></span>
      </div>

      <section className="nobar-v3-hero-layout" aria-label="پیشنهادهای ویژه نوبر">
        <div className="nobar-v3-hero-main"><BannerCarousel slides={slides} /></div>
        <div className="nobar-v3-hero-side">
          <Link href="/origin/miandoab" className="nobar-v3-side-card nobar-v3-origin-card">
            <Image src={bannerSrc("banner-harvest")} alt="" fill sizes="(max-width: 760px) 50vw, 30vw" className="nobar-v3-side-image" />
            <span className="nobar-v3-side-overlay" />
            <span className="nobar-v3-side-copy">
              <small><MapPin className="size-3.5" /> قصه‌ی مبدأها</small>
              <strong>از شهر خودش،<br />به سفره‌ی تو.</strong>
              <i>گشت‌وگذار در مبدأها <ArrowLeft className="size-4" /></i>
            </span>
          </Link>
          <Link href="/baghboon" className="nobar-v3-side-card nobar-v3-baghboon-card">
            <span className="nobar-v3-baghboon-orbit" />
            <span className="nobar-v3-baghboon-icon"><Sparkles className="size-5" /></span>
            <span className="nobar-v3-baghboon-copy">
              <small>دستیار هوشمند خرید</small>
              <strong>باغبون، انتخاب تازه را ساده می‌کند.</strong>
              <i>گفت‌وگو با باغبون <ArrowLeft className="size-4" /></i>
            </span>
          </Link>
        </div>
      </section>

      <section className="nobar-v3-category-section">
        <div className="nobar-v3-section-heading">
          <div>
            <span className="nobar-v3-eyebrow">سریع و ساده پیدا کن</span>
            <h2>دسته‌بندی‌های بازار</h2>
            <p>از میوه‌ی باغ تا سبزی تازه‌ی روز</p>
          </div>
          <Link href="/categories" className="nobar-v3-see-all">همه دسته‌ها <ArrowLeft className="size-4" /></Link>
        </div>
        <div className="nobar-v3-category-grid">
          {CATEGORIES.map((category) => {
            const count = PRODUCE_TYPES.filter((type) => type.categoryId === category.id && LISTINGS.some((listing) => listing.produceTypeId === type.id)).length;
            return (
              <Link key={category.id} href={"/search?cat=" + category.id} className="nobar-v3-category-card">
                <span className="nobar-v3-category-art"><Photo kind={category.art} alt="" sizes="88px" className="size-full" /></span>
                <strong>{category.name}</strong>
                <small>{count.toLocaleString("fa-IR")} نوع محصول</small>
                <ArrowLeft className="nobar-v3-category-arrow size-4" />
              </Link>
            );
          })}
        </div>
      </section>

      {specialHits.length ? (
        <section className="nobar-v3-special-section">
          <div className="nobar-v3-special-intro">
            <span className="nobar-v3-special-mark"><Sparkles className="size-6" /></span>
            <span className="nobar-v3-special-kicker">منتخب‌های تازه و فصلی</span>
            <h2>شگفت‌انگیزهای نوبر</h2>
            <p>محصولات تازه و منتخب از غرفه‌های بازار؛ با شناخت مبدأ و قیمت تا مقصد انتخاب کن.</p>
            <Link href="/search?nobar=1" className="nobar-v3-special-cta">دیدن همه‌ی نوبرها <ArrowLeft className="size-4" /></Link>
            <span className="nobar-v3-special-decoration" aria-hidden />
          </div>
          <div className="nobar-v3-special-products">
            {specialHits.map((hit) => <ListingCard key={hit.listing.id} hit={hit} />)}
          </div>
        </section>
      ) : null}

      <section className="nobar-v3-promise-strip" aria-label="مزیت‌های نوبر">
        <div><span><Leaf className="size-5" /></span><strong>تازگی قابل مشاهده</strong><small>نشان تازگی هر محصول</small></div>
        <div><span><MapPin className="size-5" /></span><strong>مبدأ روشن</strong><small>شهر و غرفه‌ی عرضه‌کننده</small></div>
        <div><span><Truck className="size-5" /></span><strong>قیمت تا مقصد</strong><small>هزینه ارسال کنار قیمت</small></div>
        <div><span><BadgeCheck className="size-5" /></span><strong>غرفه‌های شناخته‌شده</strong><small>اطلاعات فروشنده پیش از خرید</small></div>
      </section>

      <section className="nobar-v3-promo-grid">
        <PromoCard href="/origin/miandoab" src={bannerSrc("banner-orchard")} eyebrow="از باغ تا خانه" title="طعم اصیل، از مبدأ خودش." body="باغدارها و غرفه‌های شهرهای مختلف را کشف کن." />
        <PromoCard href="/season" src={bannerSrc("banner-market")} eyebrow="راهنمای خرید فصلی" title="به وقتِ طعم‌های تازه." body="تقویم نوبر را ببین و انتخابت را با فصل هماهنگ کن." tone="berry" />
      </section>

      <ProductRail title="میوه‌های فصل" subtitle={"پیشنهادهای تازه برای " + cityName(dest)} href="/search?cat=fruit" hits={byCat("fruit")} eyebrow="انتخاب‌های بازار" />
      <ProductRail title="مرکبات و میوه‌های آبدار" href="/search?cat=citrus" hits={byCat("citrus")} eyebrow="طعم‌های محبوب" />
      <ProductRail title="صیفی‌جات و سبزی‌های تازه" href="/search?cat=veg" hits={[...byCat("veg"), ...byCat("greens")]} eyebrow="تازه برای هر روز" />
      <ProductRail title="خشکبار و خرما" href="/search?cat=dried" hits={byCat("dried")} eyebrow="طعم‌های ماندگار" />

      <section className="nobar-v3-shops-section">
        <SectionHeading title="غرفه‌های منتخب نوبر" subtitle="آدم‌های پشت محصول را بشناس." href="/shops" eyebrow="فروشنده‌های بازار" />
        <div className="nobar-v3-shop-grid">
          {topShops.map((shop) => (
            <Link key={shop.id} href={"/shop/" + shop.id} className="nobar-v3-shop-card">
              <Photo kind={shop.art} alt="" sizes="76px" className="nobar-v3-shop-art" />
              <span className="min-w-0 flex-1">
                <strong>{shop.name}</strong>
                <small>{SHOP_TYPE_FA[shop.type]} · {cityName(shop.cityId)}</small>
                <i><Star className="size-3.5 fill-current" /> {shop.ratingAvg.toLocaleString("fa-IR")} <span>({shop.ratingCount.toLocaleString("fa-IR")})</span></i>
              </span>
              <ArrowLeft className="size-4" />
            </Link>
          ))}
        </div>
      </section>

      <section className="nobar-v3-seller-cta">
        <span className="nobar-v3-seller-icon"><Store className="size-6" /></span>
        <div>
          <span>برای باغدارها و غرفه‌دارها</span>
          <h2>محصول خوبت، شایسته‌ی دیده‌شدنه.</h2>
          <p>غرفه‌ات را در نوبر معرفی کن و محصولاتت را به خریدارهایی که دنبال تازگی‌اند نشان بده.</p>
        </div>
        <Link href="/about/sell">آشنایی با فروش در نوبر <ArrowLeft className="size-4" /></Link>
      </section>

      <div className="nobar-v3-season-note">
        <Leaf className="size-4" /> نوبرِ هر فصل، قصه‌ی تازه‌ای دارد.
        <Link href="/season">تقویم فصل‌ها <ArrowLeft className="size-3.5" /></Link>
      </div>
    </div>
  );
}
