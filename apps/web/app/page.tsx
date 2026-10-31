"use client";

import { CATEGORIES, cityName, currentMonth, inSeason, isNobar, LISTINGS, PRODUCE_TYPES, ratingBayes, search, SHOPS, SHOP_TYPE_FA, type SearchHit } from "@nobar/demo";
import { ArrowLeft, CalendarDays, Leaf, MapPin, PackageCheck, Scale, Sparkles, Star, Store, Truck } from "lucide-react";
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
      <Link href={href} className="nobar-section-link group">مشاهده همه <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /></Link>
    </div>
  );
}

function Rail({ title, subtitle, href, hits, eyebrow }: { title: string; subtitle?: string; href: string; hits: SearchHit[]; eyebrow?: string }) {
  if (!hits.length) return null;
  return (
    <section className="nobar-panel nobar-product-section nobar-v4-product-section">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <SectionHeading title={title} subtitle={subtitle} href={href} eyebrow={eyebrow} />
      </div>
      <div className="nobar-rail-divider"><ListingRail hits={hits} /></div>
    </section>
  );
}

function PromoCard({ href, src, eyebrow, title, body, tone = "dark" }: { href: string; src: string; eyebrow: string; title: string; body: string; tone?: "dark" | "green" }) {
  return (
    <Link href={href} className={"nobar-promo-card nobar-v4-promo-card " + (tone === "green" ? "nobar-promo-green" : "nobar-promo-dark")}>
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
    { icon: Truck, title: "قیمت تا مقصد", text: "هزینه‌ی ارسال کنار قیمت" },
    { icon: Scale, title: "مقایسه‌ی آگاهانه", text: "پیشنهادها را کنار هم بسنج" },
  ];
  return (
    <section className="nobar-trust-strip nobar-v4-trust" aria-label="مزیت‌های خرید از نوبر">
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
    <section className="nobar-panel nobar-journey-panel nobar-v4-journey">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <SectionHeading title="خرید تازه، با انتخابی آگاهانه" subtitle="مسیر خرید در نوبر ساده و شفاف طراحی شده است." href="/about" eyebrow="تجربه‌ی نوبر" />
      </div>
      <div className="nobar-journey-grid">
        {steps.map(({ number, icon: Icon, title, text }) => (
          <div key={number} className="nobar-journey-step nobar-v4-step">
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

function MarketStats({ products, shops, categories }: { products: number; shops: number; categories: number }) {
  const stats = [
    { value: products.toLocaleString("fa-IR"), label: "محصول قابل مشاهده", icon: PackageCheck },
    { value: shops.toLocaleString("fa-IR"), label: "غرفه‌ی بازار", icon: Store },
    { value: categories.toLocaleString("fa-IR"), label: "دسته‌ی اصلی", icon: Leaf },
  ];
  return (
    <section className="nobar-v4-market-stats" aria-label="بازار نوبر در یک نگاه">
      <div className="nobar-v4-stats-intro">
        <span className="nobar-v4-stats-kicker"><Sparkles className="size-4" /> بازار نوبر در یک نگاه</span>
        <strong>انتخاب تازه، از مبدأ واقعی.</strong>
        <span>محصول، غرفه و مسیر خرید را یک‌جا بشناس.</span>
      </div>
      {stats.map(({ value, label, icon: Icon }) => (
        <div key={label} className="nobar-v4-stat">
          <span className="nobar-v4-stat-icon"><Icon className="size-5" /></span>
          <strong>{value}</strong>
          <small>{label}</small>
        </div>
      ))}
    </section>
  );
}

function OriginDiscovery({ origins }: { origins: { cityId: string; count: number; featuredType: string }[] }) {
  if (!origins.length) return null;
  return (
    <section className="nobar-v4-origin-section">
      <div className="nobar-v4-origin-heading">
        <div>
          <span className="nobar-v4-eyebrow">از کجا به بازار رسیده‌اند؟</span>
          <h2>مبدأها را کشف کن</h2>
          <p>محصولات را با شناخت شهر و فروشنده انتخاب کن.</p>
        </div>
        <Link href="/shops" className="nobar-v4-origin-all">همه‌ی غرفه‌ها <ArrowLeft className="size-4" /></Link>
      </div>
      <div className="nobar-v4-origin-grid">
        {origins.map((origin, index) => (
          <Link key={origin.cityId} href={"/origin/" + origin.cityId} className={"nobar-v4-origin-card origin-" + index}>
            <Photo kind={origin.featuredType} alt="" sizes="(max-width: 760px) 70vw, 30vw" className="nobar-v4-origin-photo" />
            <span className="nobar-v4-origin-shade" />
            <span className="nobar-v4-origin-copy">
              <small><MapPin className="size-3.5" /> مبدأ محصولات</small>
              <strong>{cityName(origin.cityId)}</strong>
              <i>{origin.count.toLocaleString("fa-IR")} محصول در بازار <ArrowLeft className="size-4" /></i>
            </span>
            <span className="nobar-v4-origin-index">{"۰" + (index + 1).toLocaleString("fa-IR")}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { dest } = useStore();
  const month = currentMonth();
  const all = search({ dest, sort: "newest" }).hits;
  const nobar = all.filter((hit) => isNobar(hit.listing));
  const nobarIds = new Set(nobar.map((hit) => hit.listing.id));
  const weekly = [...nobar, ...all.filter((hit) => !nobarIds.has(hit.listing.id) && inSeason(hit.type, month))].slice(0, 12);
  const byCat = (categoryId: string) => all.filter((hit) => hit.type.categoryId === categoryId);
  const quick = PRODUCE_TYPES.filter((type) => LISTINGS.some((listing) => listing.produceTypeId === type.id && listing.status === "PUBLISHED"));
  const topShops = [...SHOPS].sort((a, b) => ratingBayes(b) - ratingBayes(a)).slice(0, 6);
  const originMap = new Map<string, { cityId: string; count: number; featuredType: string }>();
  for (const hit of all) {
    const current = originMap.get(hit.listing.originCityId) ?? { cityId: hit.listing.originCityId, count: 0, featuredType: hit.type.id };
    current.count += 1;
    originMap.set(hit.listing.originCityId, current);
  }
  const origins = [...originMap.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  const slides: Slide[] = [
    { href: "/search", src: bannerSrc("banner-market"), eyebrow: "بازار تازه، نزدیک‌تر از همیشه", title: "تازگی را از مبدأ انتخاب کن.", body: "محصولات بازار را از غرفه‌های واقعی پیدا کن؛ شهر عرضه، نشان تازگی و قیمت تا مقصد را پیش از خرید ببین.", cta: "ورود به بازار نوبر", tone: "green" },
    { href: "/p/pomegranate", src: bannerSrc("banner-pomegranate"), eyebrow: "فصل طعم‌های به‌یادماندنی", title: "هر فصل، یک طعم تازه.", body: "از انارهای خوش‌رنگ تا میوه‌های رسیده‌ی باغ؛ انتخاب‌های این فصل را کشف کن.", cta: "دیدن محصولات فصل", tone: "red" },
    { href: "/origin/miandoab", src: bannerSrc("banner-orchard"), eyebrow: "خرید با شناخت مبدأ", title: "پشت هر محصول، یک سرزمین.", body: "باغدارها و غرفه‌های شهرهای مختلف را بشناس و با خیال روشن‌تری انتخاب کن.", cta: "کشف شهرهای مبدأ", tone: "dark" },
  ];

  return (
    <div className="nobar-v4-home">
      <div className="nobar-welcome-bar nobar-v4-welcome">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="nobar-welcome-mark"><Sparkles className="size-4" /></span>
          <span className="truncate text-xs font-bold sm:text-sm">از باغ تا سفره؛ قصه‌ی هر محصول را بشناس.</span>
        </div>
        <span className="nobar-welcome-city"><MapPin className="size-3.5" /> ارسال به <strong>{cityName(dest)}</strong></span>
      </div>

      <section className="nobar-v4-hero-stage" aria-label="پیشنهادهای ویژه‌ی نوبر">
        <div className="nobar-v4-hero-main"><BannerCarousel slides={slides} /></div>
        <div className="nobar-v4-hero-side">
          <Link href="/origin/miandoab" className="nobar-v4-origin-feature">
            <Image src={bannerSrc("banner-harvest")} alt="" fill sizes="(max-width: 760px) 50vw, 28vw" className="nobar-v4-origin-feature-image" />
            <span className="nobar-v4-origin-feature-shade" />
            <span className="nobar-v4-origin-feature-content">
              <small><MapPin className="size-3.5" /> قصه‌ی مبدأها</small>
              <strong>از دست‌های باغدار،<br />تا سفره‌ی تو.</strong>
              <i>آشنایی با مبدأها <ArrowLeft className="size-4" /></i>
            </span>
            <span className="nobar-v4-origin-feature-stamp"><Store className="size-3.5" /> غرفه‌های محلی</span>
          </Link>
          <Link href="/baghboon" className="nobar-v4-baghboon-feature">
            <span className="nobar-v4-baghboon-orbit" />
            <span className="nobar-v4-baghboon-symbol"><Sparkles className="size-5" /></span>
            <span className="nobar-v4-baghboon-copy">
              <small>دستیار هوشمند خرید</small>
              <strong>باغبون، انتخاب تازه را ساده می‌کند.</strong>
              <i>گفت‌وگو با باغبون <ArrowLeft className="size-4" /></i>
            </span>
          </Link>
        </div>
      </section>

      <MarketStats products={all.length} shops={SHOPS.length} categories={CATEGORIES.length} />
      <BenefitStrip />

      <section className="nobar-panel nobar-category-panel nobar-v4-category-panel">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="از کجا شروع کنیم؟" subtitle="طعم دلخواهت را پیدا کن." href="/categories" eyebrow="دسته‌بندی سریع" />
        </div>
        <ul className="nobar-quick-categories nobar-v4-quick-categories">
          {quick.slice(0, 8).map((type) => (
            <li key={type.id}>
              <Link href={"/p/" + type.id} className="nobar-category-tile">
                <span className="nobar-category-image"><Photo kind={type.id} alt="" sizes="88px" fit="contain" fallback={{ emoji: type.emoji, hue: type.hue }} className="size-full rounded-full" /></span>
                <span className="nobar-category-name">{type.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {weekly.length ? (
        <section className="nobar-fresh-section nobar-v4-fresh">
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

      <section className="nobar-v4-season-stage">
        <div className="nobar-v4-season-copy">
          <span className="nobar-v4-season-eyebrow"><CalendarDays className="size-4" /> راهنمای خرید فصلی</span>
          <h2>طعم هر فصل،<br /><em>در وقت خودش.</em></h2>
          <p>محصولات را در فصل مناسب‌شان بشناس؛ از مبدأ، تازگی و شرایط نگهداری بیشتر بدان.</p>
          <Link href="/season">ورق زدن تقویم فصل‌ها <ArrowLeft className="size-4" /></Link>
        </div>
        <div className="nobar-v4-season-image">
          <Image src={bannerSrc("banner-pomegranate")} alt="برداشت محصول در باغ" fill sizes="(max-width: 760px) 100vw, 55vw" />
          <span className="nobar-v4-season-image-shade" />
          <span className="nobar-v4-season-image-note">از فصلش لذت ببر</span>
        </div>
      </section>

      <section className="nobar-v4-editorial">
        <PromoCard href="/origin/miandoab" src={bannerSrc("banner-orchard")} eyebrow="از باغ تا خانه" title="طعم اصیل، از مبدأ خودش." body="با باغدارها و غرفه‌های شهرهای مختلف آشنا شو؛ هر محصول، داستانی برای گفتن دارد." tone="green" />
        <PromoCard href="/shops" src={bannerSrc("banner-market")} eyebrow="آدم‌های پشت محصول" title="بازار را از نزدیک بشناس." body="غرفه‌های واقعی و محصولات تازه را در یک مسیر روشن پیدا کن." />
      </section>

      <Rail title="میوه‌های فصل" subtitle={"پیشنهادهای تازه برای " + cityName(dest)} href="/search?cat=fruit" hits={byCat("fruit")} eyebrow="انتخاب‌های بازار" />
      <Rail title="مرکبات و میوه‌های آبدار" href="/search?cat=citrus" hits={byCat("citrus")} eyebrow="طعم‌های محبوب" />
      <Rail title="صیفی‌جات و سبزی‌های تازه" href="/search?cat=veg" hits={[...byCat("veg"), ...byCat("greens")]} eyebrow="تازه برای هر روز" />
      <Rail title="خشکبار و خرما" href="/search?cat=dried" hits={byCat("dried")} eyebrow="طعم‌های ماندگار" />

      <OriginDiscovery origins={origins} />

      <section className="nobar-panel nobar-all-categories nobar-v4-all-categories">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="بازار را دسته‌به‌دسته بگرد" subtitle="هر آنچه برای یک خرید تازه لازم داری." href="/categories" eyebrow="همه‌ی انتخاب‌ها" />
        </div>
        <ul className="nobar-all-category-grid">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link href={"/search?cat=" + category.id} className="nobar-all-category-tile">
                <Photo kind={category.art} alt="" sizes="128px" fit="contain" className="nobar-all-category-art" />
                <span className="nobar-all-category-name">{category.name}</span>
                <ArrowLeft className="nobar-all-category-arrow size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <HowItWorks />

      <section className="nobar-panel nobar-shops-panel nobar-v4-shops">
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <SectionHeading title="غرفه‌های منتخب نوبر" subtitle="فروشنده‌ها را بشناس و با خیال روشن‌تری انتخاب کن." href="/shops" eyebrow="آدم‌های پشت محصول" />
        </div>
        <ul className="nobar-shop-grid">
          {topShops.map((shop) => (
            <li key={shop.id}>
              <Link href={"/shop/" + shop.id} className="nobar-shop-card">
                <span className="nobar-shop-art"><Photo kind={shop.art} alt="" sizes="76px" className="size-full rounded-2xl" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">{shop.name}</span>
                  <span className="mt-1 block truncate text-[10px] text-ink-soft">{SHOP_TYPE_FA[shop.type]} · {cityName(shop.cityId)}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ink"><Star className="size-3.5 fill-saffron text-saffron" /> {shop.ratingAvg.toLocaleString("fa-IR")} <span className="font-normal text-ink-soft">({shop.ratingCount.toLocaleString("fa-IR")})</span></span>
                </span>
                <ArrowLeft className="nobar-shop-arrow size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="nobar-seller-cta nobar-v4-seller">
        <span className="nobar-seller-glow nobar-seller-glow-one" />
        <span className="nobar-seller-glow nobar-seller-glow-two" />
        <div className="nobar-seller-copy">
          <span className="nobar-seller-eyebrow"><Store className="size-4" /> برای باغدارها و غرفه‌دارها</span>
          <h2 className="nobar-seller-title">محصول خوبت، شایسته‌ی دیده‌شدنه.</h2>
          <p className="nobar-seller-text">غرفه‌ات را در نوبر معرفی کن و محصولاتت را به خریدارهایی که دنبال تازگی‌اند نشان بده.</p>
        </div>
        <Link href="/about/sell" className="nobar-seller-button">آشنایی با فروش در نوبر <ArrowLeft className="size-4" /></Link>
      </section>

      <div className="nobar-season-note nobar-v4-season-note">
        <span className="nobar-season-note-icon"><CalendarDays className="size-4" /></span>
        <span>نوبرِ هر فصل، قصه‌ی تازه‌ای دارد.</span>
        <Link href="/season">تقویم فصل‌ها <ArrowLeft className="size-3.5" /></Link>
      </div>
    </div>
  );
}
