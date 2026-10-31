"use client";

import { CATEGORIES, cityName, currentMonth, inSeason, isNobar, LISTINGS, PRODUCE_TYPES, ratingBayes, search, SHOPS, SHOP_TYPE_FA, type SearchHit } from "@nobar/demo";
import { ArrowLeft, BadgeCheck, CalendarDays, Leaf, MapPin, Scale, Sparkles, Star, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BannerCarousel, type Slide } from "@/components/banner-carousel";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";

function SectionHeading({ title, subtitle, href, eyebrow }: { title: string; subtitle?: string; href: string; eyebrow?: string }) {
  return (
    <div className="nobar-section-head">
      <div className="min-w-0">
        {eyebrow ? <span className="nobar-section-eyebrow">{eyebrow}</span> : null}
        <h2 className="text-lg font-black tracking-tight text-ink sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-ink-soft sm:text-sm">{subtitle}</p> : null}
      </div>
      <Link href={href} className="nobar-section-link group">
        مشاهده همه <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
      </Link>
    </div>
  );
}

function Rail({ title, subtitle, href, hits, eyebrow }: { title: string; subtitle?: string; href: string; hits: SearchHit[]; eyebrow?: string }) {
  if (!hits.length) return null;
  return (
    <section className="nobar-panel nobar-product-section">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <SectionHeading title={title} subtitle={subtitle} href={href} eyebrow={eyebrow} />
      </div>
      <div className="nobar-rail-divider"><ListingRail hits={hits} /></div>
    </section>
  );
}

function PromoCard({ href, src, eyebrow, title, body, tone = "dark" }: { href: string; src: string; eyebrow: string; title: string; body: string; tone?: "dark" | "green" }) {
  return (
    <Link href={href} className={"nobar-promo-card " + (tone === "green" ? "nobar-promo-green" : "nobar-promo-dark")}>
      <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="nobar-promo-image" />
      <span className="nobar-promo-shade" />
      <span className="nobar-promo-content">
        <span className="nobar-promo-eyebrow">{eyebrow}</span>
        <span className="nobar-promo-title">{title}</span>
        <span className="nobar-promo-copy">{body}</span>
        <span className="nobar-promo-cta">بیشتر ببینید <ArrowLeft className="size-4" /></span>
      </span>
    </Link>
  );
}

function BenefitStrip() {
  const benefits = [
    { icon: Leaf, title: "تازگی قابل مشاهده", text: "نشان تازگی هر محصول" },
    { icon: MapPin, title: "مبدأ روشن", text: "شهر و غرفه‌ی عرضه‌کننده" },
    { icon: Truck, title: "قیمت تا مقصد", text: "هزینه ارسال کنار قیمت" },
    { icon: Scale, title: "مقایسه آگاهانه", text: "پیشنهادها را کنار هم بسنج" },
  ];
  return (
    <section className="nobar-trust-strip" aria-label="مزیت‌های خرید از نوبر">
      {benefits.map(({ icon: Icon, title, text }, index) => (
        <div key={title} className="nobar-trust-item">
          <span className="nobar-trust-icon"><Icon className="size-5" strokeWidth={1.8} /></span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-ink sm:text-sm">{title}</span>
            <span className="mt-0.5 block text-[10px] text-ink-soft sm:text-xs">{text}</span>
          </span>
          {index < benefits.length - 1 ? <span className="nobar-trust-separator" aria-hidden /> : null}
        </div>
      ))}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { number: "۰۱", icon: MapPin, title: "مقصدت را انتخاب کن", text: "بازار را بر اساس شهری که می‌خواهی از آن خرید کنی ببین." },
    { number: "۰۲", icon: Leaf, title: "تازگی و مبدأ را ببین", text: "اطلاعات محصول و غرفه‌ی عرضه‌کننده را پیش از انتخاب بررسی کن." },
    { number: "۰۳", icon: Scale, title: "قیمت نهایی را مقایسه کن", text: "قیمت محصول و هزینه‌ی ارسال را کنار هم بسنج و انتخاب کن." },
  ];
  return (
    <section className="nobar-panel nobar-journey-panel">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <SectionHeading title="خرید تازه، با انتخابی آگاهانه" subtitle="مسیر خرید در نوبر ساده و شفاف طراحی شده است." href="/about" eyebrow="تجربه‌ی نوبر" />
      </div>
      <div className="nobar-journey-grid">
        {steps.map(({ number, icon: Icon, title, text }) => (
          <div key={number} className="nobar-journey-step">
            <div className="flex items-center justify-between">
              <span className="nobar-step-number">{number}</span>
              <span className="nobar-step-icon"><Icon className="size-5" /></span>
            </div>
            <h3 className="mt-4 text-sm font-black text-ink sm:text-base">{title}</h3>
            <p className="mt-1.5 text-xs leading-6 text-ink-soft sm:text-sm">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { dest } = useStore();
  const month = currentMonth();
  const all = search({ dest, sort: "newest" }).hits;
  const nobar = all.filter((h) => isNobar(h.listing));
  const nobarIds = new Set(nobar.map((h) => h.listing.id));
  const weekly = [...nobar, ...all.filter((h) => !nobarIds.has(h.listing.id) && inSeason(h.type, month))].slice(0, 12);
  const byCat = (cat: string) => all.filter((h) => h.type.categoryId === cat);
  const quick = PRODUCE_TYPES.filter((pt) => LISTINGS.some((l) => l.produceTypeId === pt.id));
  const topShops = [...SHOPS].sort((a, b) => ratingBayes(b) - ratingBayes(a)).slice(0, 6);

  const slides: Slide[] = [
    { href: "/search", src: bannerSrc("banner-orchard"), eyebrow: "از دل باغ، تا خانه‌ی شما", title: "تازگی را فقط نبین؛ انتخابش کن.", body: "محصول فصل را از غرفه‌های مبدأ پیدا کن؛ تازگی، شهر عرضه و قیمت تا مقصد را پیش از خرید کنار هم ببین.", cta: "کشف بازار تازه", tone: "green" },
    { href: "/p/pomegranate", src: bannerSrc("banner-pomegranate"), eyebrow: "فصلِ طعم‌های به‌یادماندنی", title: "هر فصل، یک طعمِ نوبر.", body: "از انارهای خوش‌رنگ تا میوه‌های رسیده‌ی باغ؛ انتخاب‌های تازه‌ی این فصل منتظر تو هستند.", cta: "دیدن انتخاب‌های فصل", tone: "red" },
    { href: "/origin/miandoab", src: bannerSrc("banner-market"), eyebrow: "خرید با شناخت مبدأ", title: "پشت هر محصول، یک سرزمین.", body: "غرفه‌ها و محصولات شهرهای مختلف را کشف کن و خریدت را با شناخت بیشتری انجام بده.", cta: "کشف مبدأها", tone: "dark" },
  ];

  return (
    <div className="nobar-home space-y-6 pb-5 sm:space-y-8">
      <div className="nobar-welcome-bar">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="nobar-welcome-mark"><Sparkles className="size-4" /></span>
          <span className="truncate text-xs font-bold sm:text-sm">از باغ تا سفره؛ قصه‌ی هر محصول را بشناس.</span>
        </div>
        <span className="nobar-welcome-city"><MapPin className="size-3.5" /> ارسال به <strong>{cityName(dest)}</strong></span>
      </div>

      <section className="nobar-hero-layout">
        <div className="nobar-hero-main"><BannerCarousel slides={slides} /></div>
        <div className="nobar-hero-side">
          <Link href="/origin/miandoab" className="nobar-origin-card">
            <Image src={bannerSrc("banner-harvest")} alt="" fill sizes="(max-width: 1024px) 100vw, 30vw" className="nobar-origin-image" />
            <span className="nobar-origin-shade" />
            <span className="nobar-origin-content">
              <span className="nobar-side-kicker"><MapPin className="size-3.5" /> قصه‌ی مبدأها</span>
              <span className="nobar-origin-title">از شهر خودش<br />به سفره‌ی تو.</span>
              <span className="nobar-side-link">گشت‌وگذار در مبدأها <ArrowLeft className="size-3.5" /></span>
            </span>
            <span className="nobar-origin-stamp"><Store className="size-4" /> غرفه‌های محلی</span>
          </Link>

          <Link href="/baghboon" className="nobar-baghboon-card">
            <span className="nobar-baghboon-orbit nobar-orbit-one" />
            <span className="nobar-baghboon-orbit nobar-orbit-two" />
            <span className="nobar-baghboon-top">
              <span className="nobar-baghboon-symbol"><Sparkles className="size-5" /></span>
              <span className="nobar-baghboon-label">دستیار هوشمند خرید</span>
            </span>
            <span className="nobar-baghboon-copy">
              <span className="nobar-baghboon-title">باغبون، همراه انتخاب تازه‌ی تو.</span>
              <span className="nobar-baghboon-text">بگو دنبال چه طعمی هستی؛ از بین پیشنهادها راحت‌تر انتخاب کن.</span>
            </span>
            <span className="nobar-baghboon-cta">گفت‌وگو با باغبون <ArrowLeft className="size-4" /></span>
          </Link>
        </div>
      </section>

      <BenefitStrip />

      <section className="nobar-panel nobar-category-panel">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="از کجا شروع کنیم؟" subtitle="طعم دلخواهت را پیدا کن." href="/categories" eyebrow="بازار نوبر" />
        </div>
        <ul className="nobar-quick-categories">
          {quick.slice(0, 8).map((pt) => (
            <li key={pt.id}>
              <Link href={"/p/" + pt.id} className="nobar-category-tile">
                <span className="nobar-category-image">
                  <Photo kind={pt.id} alt="" sizes="88px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="size-full rounded-full" />
                </span>
                <span className="nobar-category-name">{pt.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {weekly.length ? (
        <section className="nobar-fresh-section">
          <div className="nobar-fresh-heading">
            <div className="flex items-center gap-3">
              <span className="nobar-fresh-symbol"><Sparkles className="size-5" /></span>
              <div>
                <span className="nobar-fresh-eyebrow">تازه‌رسیده‌های این روزها</span>
                <h2 className="nobar-fresh-title">نوبر شد!</h2>
              </div>
            </div>
            <Link href="/search?nobar=1" className="nobar-fresh-link">همه‌ی نوبرها <ArrowLeft className="size-4" /></Link>
          </div>
          <div className="nobar-fresh-rail"><ListingRail hits={weekly} /></div>
        </section>
      ) : null}

      <section className="nobar-editorial-grid">
        <PromoCard href="/origin/miandoab" src={bannerSrc("banner-orchard")} eyebrow="از باغ تا خانه" title="طعم اصیل، از مبدأ خودش." body="با باغدارها و غرفه‌های شهرهای مختلف آشنا شو؛ هر محصول، داستانی برای گفتن دارد." tone="green" />
        <PromoCard href="/season" src={bannerSrc("banner-market")} eyebrow="راهنمای خرید فصلی" title="به وقتِ طعم‌های تازه." body="تقویم نوبر را ببین و انتخابت را با فصل هماهنگ کن." />
      </section>

      <Rail title="میوه‌های فصل" subtitle={"پیشنهادهای تازه برای " + cityName(dest)} href="/search?cat=fruit" hits={byCat("fruit")} eyebrow="انتخاب سردبیر نوبر" />
      <Rail title="مرکبات و میوه‌های آبدار" href="/search?cat=citrus" hits={byCat("citrus")} eyebrow="پرطرفدارهای بازار" />
      <Rail title="صیفی‌جات و سبزی‌های تازه" href="/search?cat=veg" hits={[...byCat("veg"), ...byCat("greens")]} eyebrow="تازه برای هر روز" />
      <Rail title="خشکبار و خرما" href="/search?cat=dried" hits={byCat("dried")} eyebrow="طعم‌های ماندگار" />

      <HowItWorks />

      <section className="nobar-panel nobar-all-categories">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="بازار را دسته‌به‌دسته بگرد" subtitle="هر آنچه برای یک خرید تازه لازم داری." href="/categories" eyebrow="همه‌ی انتخاب‌ها" />
        </div>
        <ul className="nobar-all-category-grid">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={"/search?cat=" + c.id} className="nobar-all-category-tile">
                <Photo kind={c.art} alt="" sizes="128px" className="nobar-all-category-art" />
                <span className="nobar-all-category-name">{c.name}</span>
                <ArrowLeft className="nobar-all-category-arrow size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="nobar-panel nobar-shops-panel">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="غرفه‌های منتخب نوبر" subtitle="فروشنده‌ها را بشناس و با خیال روشن‌تری انتخاب کن." href="/shops" eyebrow="آدم‌های پشت محصول" />
        </div>
        <ul className="nobar-shop-grid">
          {topShops.map((s) => (
            <li key={s.id}>
              <Link href={"/shop/" + s.id} className="nobar-shop-card">
                <span className="nobar-shop-art"><Photo kind={s.art} alt="" sizes="76px" className="size-full rounded-2xl" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">{s.name}</span>
                  <span className="mt-1 block truncate text-[10px] text-ink-soft">{SHOP_TYPE_FA[s.type]} · {cityName(s.cityId)}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ink"><Star className="size-3.5 fill-saffron text-saffron" /> {s.ratingAvg.toLocaleString("fa-IR")} <span className="font-normal text-ink-soft">({s.ratingCount.toLocaleString("fa-IR")})</span></span>
                </span>
                <ArrowLeft className="nobar-shop-arrow size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="nobar-seller-cta">
        <span className="nobar-seller-glow nobar-seller-glow-one" />
        <span className="nobar-seller-glow nobar-seller-glow-two" />
        <div className="nobar-seller-copy">
          <span className="nobar-seller-eyebrow"><Store className="size-4" /> برای باغدارها و غرفه‌دارها</span>
          <h2 className="nobar-seller-title">محصول خوبت، شایسته‌ی دیده‌شدنه.</h2>
          <p className="nobar-seller-text">غرفه‌ات را در نوبر معرفی کن و محصولاتت را به خریدارهایی که دنبال تازگی‌اند نشان بده.</p>
        </div>
        <Link href="/about/sell" className="nobar-seller-button">آشنایی با فروش در نوبر <ArrowLeft className="size-4" /></Link>
      </section>

      <div className="nobar-season-note">
        <span className="nobar-season-note-icon"><CalendarDays className="size-4" /></span>
        <span>نوبرِ هر فصل، قصه‌ی تازه‌ای دارد.</span>
        <Link href="/season">تقویم فصل‌ها <ArrowLeft className="size-3.5" /></Link>
      </div>
    </div>
  );
}
