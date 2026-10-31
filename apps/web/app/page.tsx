"use client";

import { CATEGORIES, cityName, currentMonth, inSeason, isNobar, LISTINGS, PRODUCE_TYPES, ratingBayes, search, SHOPS, SHOP_TYPE_FA, type SearchHit } from "@nobar/demo";
import { ArrowLeft, BadgeCheck, Leaf, MapPin, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BannerCarousel, type Slide } from "@/components/banner-carousel";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";

function SectionHeading({ title, subtitle, href }: { title: string; subtitle?: string; href: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-ink sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-ink-soft sm:text-sm">{subtitle}</p> : null}
      </div>
      <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-brand sm:text-sm">
        مشاهده همه <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
      </Link>
    </div>
  );
}

function Rail({ title, subtitle, href, hits }: { title: string; subtitle?: string; href: string; hits: SearchHit[] }) {
  if (!hits.length) return null;
  return (
    <section className="nobar-section">
      <div className="px-4 pt-5 sm:px-5">
        <SectionHeading title={title} subtitle={subtitle} href={href} />
      </div>
      <div className="border-t border-line"><ListingRail hits={hits} /></div>
    </section>
  );
}

function PromoCard({ href, src, eyebrow, title, body, tone = "dark" }: { href: string; src: string; eyebrow: string; title: string; body: string; tone?: "dark" | "green" }) {
  return (
    <Link href={href} className="group relative isolate flex min-h-44 overflow-hidden rounded-2xl p-5 text-white shadow-soft sm:min-h-52 sm:p-7">
      <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="absolute inset-0 -z-20 object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className={tone === "green" ? "absolute inset-0 -z-10 bg-linear-to-l from-[#103b25]/95 via-[#103b25]/55 to-transparent" : "absolute inset-0 -z-10 bg-linear-to-l from-black/80 via-black/45 to-transparent"} />
      <div className="flex max-w-sm flex-col justify-center">
        <span className="text-xs font-bold text-white/75">{eyebrow}</span>
        <span className="mt-1 text-xl font-black leading-tight sm:text-2xl">{title}</span>
        <span className="mt-2 text-xs leading-6 text-white/85 sm:text-sm">{body}</span>
        <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#173b27]">
          بیشتر ببینید <ArrowLeft className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function BenefitStrip() {
  const benefits = [
    { icon: Leaf, title: "تازگی قابل‌ردیابی", text: "تاریخ برداشت هر محصول" },
    { icon: Truck, title: "ارسال هوشمند", text: "فقط به مقصدهای مجاز" },
    { icon: ShieldCheck, title: "خرید مطمئن", text: "پشتیبانی و پیگیری سفارش" },
    { icon: BadgeCheck, title: "خرید بی‌واسطه", text: "مستقیم از تولیدکننده" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4 sm:gap-2">
      {benefits.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-ink sm:text-sm">{title}</span>
            <span className="mt-0.5 block text-[10px] text-ink-soft sm:text-xs">{text}</span>
          </span>
        </div>
      ))}
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
    { href: "/l/l701", src: bannerSrc("banner-orchard"), eyebrow: "تازه از دل باغ", title: "فصلِ طعم‌های تازه رسیده", body: "محصول فصل را از باغدارش بخرید؛ تاریخ برداشت و تازگی را قبل از سفارش ببینید.", cta: "دیدن محصولات تازه", tone: "green" },
    { href: "/p/pomegranate", src: bannerSrc("banner-pomegranate"), eyebrow: "انتخاب فصل", title: "انارهای خوش‌رنگ ساوه", body: "از باغ‌های منتخب تا خانه‌ی شما؛ غرفه‌ها را از نظر قیمت و تازگی مقایسه کنید.", cta: "خرید انار", tone: "red" },
    { href: "/search", src: bannerSrc("banner-market"), eyebrow: "بازار تازه‌خوری نوبر", title: "خرید مستقیم، با خیال راحت", body: "محصولاتی را ببینید که امکان رسیدن تازه به " + cityName(dest) + " را دارند.", cta: "ورود به بازار", tone: "dark" },
  ];

  return (
    <div className="page-glow space-y-6 pb-3 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#173b27] px-4 py-2.5 text-white">
        <span className="flex items-center gap-2 text-xs font-bold sm:text-sm"><Sparkles className="size-4 text-[#d5e9a6]" /> نوبرِ هر فصل، مستقیم از باغ</span>
        <span className="flex items-center gap-1 text-[11px] text-white/80 sm:text-xs"><MapPin className="size-3.5" /> ارسال به {cityName(dest)}</span>
      </div>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(250px,0.8fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl shadow-soft"><BannerCarousel slides={slides} /></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Link href="/origin/miandoab" className="group relative min-h-36 overflow-hidden rounded-2xl bg-[#e8f0df] p-4 sm:min-h-40 lg:min-h-0">
            <Image src={bannerSrc("banner-harvest")} alt="" fill sizes="(max-width: 1024px) 50vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 text-white">
              <span className="block text-[10px] font-bold text-white/80">از مبدأ بخرید</span>
              <span className="mt-0.5 block text-lg font-black">باغ‌های میاندوآب</span>
            </div>
          </Link>
          <Link href="/baghboon" className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl bg-[#f3ead9] p-4 text-[#21432d] transition-colors hover:bg-[#e8f0df] sm:min-h-40 lg:min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold">دستیار خرید هوشمند</span>
              <span className="grid size-8 place-items-center rounded-full bg-white/70"><Sparkles className="size-4" /></span>
            </div>
            <div>
              <span className="block text-base font-black leading-6 sm:text-lg">باغبون، انتخاب را ساده می‌کند.</span>
              <span className="mt-1 block text-[11px] text-[#21432d]/75">بگویید چه می‌خواهید تا پیشنهاد بگیرید.</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-black">گفت‌وگو با باغبون <ArrowLeft className="size-3.5" /></span>
            </div>
          </Link>
        </div>
      </section>

      <BenefitStrip />

      <section className="nobar-section p-4 sm:p-5">
        <SectionHeading title="از کجا شروع کنیم؟" subtitle="محصول دلخواهتان را سریع پیدا کنید" href="/categories" />
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {quick.slice(0, 8).map((pt) => (
            <li key={pt.id}>
              <Link href={"/p/" + pt.id} className="group flex flex-col items-center gap-2 text-center">
                <span className="rounded-2xl bg-surface-2 p-1.5 transition-all group-hover:-translate-y-1 group-hover:bg-brand-soft">
                  <Photo kind={pt.id} alt="" sizes="72px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="size-14 rounded-xl sm:size-[4.5rem]" />
                </span>
                <span className="text-[11px] font-bold text-ink sm:text-xs">{pt.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {weekly.length ? (
        <section className="overflow-hidden rounded-2xl bg-[#a92b2b] p-2.5 shadow-soft sm:p-3">
          <div className="flex items-center justify-between gap-3 px-2 pb-2 text-white sm:px-3 sm:pb-3">
            <div>
              <span className="text-lg font-black sm:text-xl">نوبر شد!</span>
              <p className="text-[10px] text-white/80 sm:text-xs">تازه‌رسیده‌های این روزها</p>
            </div>
            <Link href="/search?nobar=1" className="inline-flex items-center gap-1 rounded-full border border-white/40 px-3 py-1.5 text-[11px] font-bold hover:bg-white/10">همه‌ی نوبرها <ArrowLeft className="size-3.5" /></Link>
          </div>
          <div className="overflow-hidden rounded-xl bg-surface"><ListingRail hits={weekly} /></div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        <PromoCard href="/origin/miandoab" src={bannerSrc("banner-orchard")} eyebrow="از باغ تا خانه" title="طعم اصیل محصولات محلی" body="با باغدارها و غرفه‌های شهرهای مختلف آشنا شوید." tone="green" />
        <PromoCard href="/season" src={bannerSrc("banner-market")} eyebrow="راهنمای خرید فصلی" title="هر محصول، فصل خودش را دارد" body="تقویم نوبر را ببینید و انتخاب تازه‌تری داشته باشید." />
      </section>

      <Rail title="میوه‌های فصل" subtitle={"پیشنهادهای تازه برای " + cityName(dest)} href="/search?cat=fruit" hits={byCat("fruit")} />
      <Rail title="مرکبات و میوه‌های آبدار" href="/search?cat=citrus" hits={byCat("citrus")} />
      <Rail title="صیفی‌جات و سبزی‌های تازه" href="/search?cat=veg" hits={[...byCat("veg"), ...byCat("greens")]} />
      <Rail title="خشکبار و خرما" href="/search?cat=dried" hits={byCat("dried")} />

      <section className="nobar-section p-4 sm:p-5">
        <SectionHeading title="خرید بر اساس دسته‌بندی" subtitle="بازار نوبر را دسته‌به‌دسته بگردید" href="/categories" />
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={"/search?cat=" + c.id} className="group flex flex-col items-center gap-2 rounded-xl border border-transparent p-2 text-center transition-all hover:border-line hover:bg-surface-2">
                <Photo kind={c.art} alt="" sizes="120px" className="aspect-square w-full max-w-24 rounded-2xl sm:max-w-28" />
                <span className="text-xs font-extrabold text-ink">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="nobar-section p-4 sm:p-5">
        <SectionHeading title="غرفه‌هایی که ارزش دیدن دارند" subtitle="فروشنده‌های منتخب از شهرهای مختلف" href="/shops" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topShops.map((s) => (
            <li key={s.id}>
              <Link href={"/shop/" + s.id} className="group flex h-full flex-col items-center gap-2 rounded-xl border border-line p-3 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-soft">
                <Photo kind={s.art} alt="" sizes="64px" className="size-16 rounded-full ring-4 ring-surface-2" />
                <span className="line-clamp-1 text-sm font-black">{s.name}</span>
                <span className="text-[10px] text-ink-soft">{SHOP_TYPE_FA[s.type]} · {cityName(s.cityId)}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold"><Star className="size-3.5 fill-saffron text-saffron" />{s.ratingAvg.toLocaleString("fa-IR")} <span className="font-normal text-ink-soft">({s.ratingCount.toLocaleString("fa-IR")})</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[#173b27] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div className="absolute -end-10 -top-20 size-56 rounded-full border-[35px] border-white/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-[#c9dfb7]">برای باغدارها، کشاورزها و غرفه‌دارها</span>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">محصولتان را به سراسر ایران معرفی کنید.</h2>
            <p className="mt-2 text-xs leading-6 text-white/75 sm:text-sm">در نوبر غرفه بسازید و مشتری‌های تازه پیدا کنید.</p>
          </div>
          <Link href="/about/sell" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#173b27] transition-transform hover:-translate-y-0.5">آشنایی با فروش در نوبر <ArrowLeft className="size-4" /></Link>
        </div>
      </section>
    </div>
  );
}
