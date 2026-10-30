import { CATEGORIES, cityName, currentMonth, inSeason, isNobar, LISTINGS, PRODUCE_TYPES, ratingBayes, search, SHOPS, SHOP_TYPE_FA, type SearchHit } from "@nobar/demo";
import { ChevronLeft, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BannerCarousel, type Slide } from "@/components/banner-carousel";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { getDestination } from "@/lib/server";

function Rail({ title, subtitle, href, hits }: { title: string; subtitle?: string; href: string; hits: SearchHit[] }) {
  if (!hits.length) return null;
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-end justify-between gap-3 px-4 pb-1 pt-4">
        <div>
          <h2 className="text-lg font-extrabold">{title}</h2>
          {subtitle ? <p className="text-xs text-ink-soft">{subtitle}</p> : null}
        </div>
        <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-bold text-brand hover:underline">
          مشاهده همه
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      </div>
      <ListingRail hits={hits} />
    </section>
  );
}

function PromoBanner({ href, src, title, body }: { href: string; src: string; title: string; body: ReactNode }) {
  return (
    <Link href={href} className="group relative block aspect-[2/1] overflow-hidden rounded-card sm:aspect-[5/2]">
      <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-linear-to-l from-black/70 via-black/30 to-transparent" />
      <div className="relative flex h-full max-w-xs flex-col justify-center p-5 text-white sm:p-7">
        <span className="text-xl font-black sm:text-2xl">{title}</span>
        <span className="mt-1 text-sm leading-6 text-white/85">{body}</span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const dest = await getDestination();
  const month = currentMonth();
  const all = search({ dest, sort: "newest" }).hits;
  const nobar = all.filter((h) => isNobar(h.listing));
  const nobarIds = new Set(nobar.map((h) => h.listing.id));
  const weekly = [...nobar, ...all.filter((h) => !nobarIds.has(h.listing.id) && inSeason(h.type, month))].slice(0, 12);
  const byCat = (cat: string) => all.filter((h) => h.type.categoryId === cat);
  const quick = PRODUCE_TYPES.filter((pt) => LISTINGS.some((l) => l.produceTypeId === pt.id));
  const topShops = [...SHOPS].sort((a, b) => ratingBayes(b) - ratingBayes(a)).slice(0, 6);

  const slides: Slide[] = [
    {
      href: "/l/l701",
      src: bannerSrc("banner-orchard"),
      eyebrow: "نوبر شد!",
      title: "اولین کیوی‌های آستارا رسید",
      body: "تازه‌چین، مستقیم از باغ؛ با تاریخ برداشت روی هر جعبه.",
      cta: "خرید کیوی",
      tone: "green",
    },
    {
      href: "/p/انار",
      src: bannerSrc("banner-pomegranate"),
      eyebrow: "فصل انار",
      title: "انار ملس ساوه و نقده",
      body: "از درخت تا جعبه، بدون واسطه. برای شب یلدا زودتر سفارش بدهید.",
      cta: "دیدن انارها",
      tone: "red",
    },
    {
      href: "/search",
      src: bannerSrc("banner-market"),
      eyebrow: "بازار سراسری میوه و سبزی",
      title: "قیمت تمام‌شده تا درِ خانه",
      body: `فقط محصولاتی را می‌بینید که تازه به ${cityName(dest)} برسند.`,
      cta: "شروع خرید",
      tone: "dark",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Banners */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <BannerCarousel slides={slides} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Link href="/origin/saveh" className="group relative min-h-32 overflow-hidden rounded-card">
            <Image src={bannerSrc("banner-harvest")} alt="" fill sizes="(max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
            <span className="absolute bottom-3 start-3 text-white">
              <span className="block text-xs text-white/80">از مبدأ بخرید</span>
              <span className="block text-lg font-black">باغ‌های ساوه</span>
            </span>
          </Link>
          <Link href="/baghboon" className="relative flex min-h-32 flex-col justify-center overflow-hidden rounded-card bg-brand-strong p-4 text-white sm:p-5">
            <span className="text-xs text-white/75">باغبون، دستیار خرید</span>
            <span className="mt-1 text-lg font-black leading-snug">«سیب ترش برای کمپوت که تا کرج تازه برسه»</span>
            <span className="mt-2 inline-flex items-center gap-0.5 text-sm font-bold text-[#b9e6bb]">
              بپرسید
              <ChevronLeft className="size-4" aria-hidden />
            </span>
          </Link>
        </div>
      </section>

      {/* Quick produce circles */}
      <section aria-label="خرید بر اساس محصول" className="rounded-card border border-line bg-surface px-2 py-4">
        <ul className="flex gap-1 overflow-x-auto px-2 scrollbar-none sm:justify-between">
          {quick.map((pt) => (
            <li key={pt.id} className="shrink-0">
              <Link href={`/p/${pt.slug}`} className="group flex w-20 flex-col items-center gap-2 text-center">
                <Photo kind={pt.id} alt="" sizes="72px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="size-16 rounded-full ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-brand sm:size-[4.5rem]" />
                <span className="text-xs font-semibold text-ink">{pt.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Nobar strip — like a deals rail */}
      <section className="overflow-hidden rounded-card bg-nobar p-2 sm:p-3">
        <div className="flex gap-2 sm:gap-3">
          <div className="hidden w-40 shrink-0 flex-col items-center justify-center gap-2 text-center text-white sm:flex">
            <span className="text-3xl font-black leading-none">نوبر شد!</span>
            <span className="text-sm text-white/85">تازه‌ترین‌های فصل</span>
            <Link href="/search?sort=newest" className="mt-2 inline-flex items-center gap-0.5 text-sm font-bold text-white hover:underline">
              مشاهده همه
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between px-1 text-white sm:hidden">
              <span className="text-lg font-black">نوبر شد!</span>
              <Link href="/search?sort=newest" className="inline-flex items-center text-xs font-bold">
                همه
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="overflow-hidden rounded-control bg-surface">
              <ListingRail hits={weekly} />
            </div>
          </div>
        </div>
      </section>

      {/* Promos */}
      <section className="grid gap-3 md:grid-cols-2">
        <PromoBanner href="/origin/miandoab" src={bannerSrc("banner-orchard")} title="باغ‌های میاندوآب" body="سیب و انگور بی‌دانه، مستقیم از باغدار" />
        <PromoBanner href="/search?cat=dried" src={bannerSrc("banner-market")} title="خرید زمستانه" body="خرما، گردو، سیب‌زمینی و پیاز در بسته‌های بزرگ" />
      </section>

      <Rail title="میوه‌های فصل" subtitle={`تازه به ${cityName(dest)} می‌رسد`} href="/search?cat=fruit" hits={byCat("fruit")} />
      <Rail title="مرکبات" href="/search?cat=citrus" hits={byCat("citrus")} />
      <Rail title="صیفی و سبزیجات" href="/search?cat=veg" hits={[...byCat("veg"), ...byCat("greens")]} />
      <Rail title="خشکبار و خرما" href="/search?cat=dried" hits={byCat("dried")} />

      {/* Categories */}
      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-center text-lg font-extrabold">دسته‌بندی‌های نوبر</h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={`/search?cat=${c.id}`} className="group flex flex-col items-center gap-2 text-center">
                <Photo kind={c.art} alt="" sizes="120px" className="aspect-square w-full max-w-28 rounded-full" />
                <span className="text-sm font-bold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Shops */}
      <section className="rounded-card border border-line bg-surface p-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-extrabold">غرفه‌های برتر</h2>
          <Link href="/categories" className="inline-flex items-center gap-0.5 text-sm font-bold text-brand hover:underline">
            همه‌ی شهرها
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topShops.map((s) => (
            <li key={s.id}>
              <Link href={`/shop/${s.slug}`} className="group flex flex-col items-center gap-2 rounded-control border border-line p-3 text-center hover:border-brand">
                <Photo kind={s.art} alt="" sizes="64px" className="size-16 rounded-full" />
                <span className="line-clamp-1 text-sm font-bold">{s.name}</span>
                <span className="text-xs text-ink-soft">
                  {SHOP_TYPE_FA[s.type]} · {cityName(s.cityId)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs">
                  <Star className="size-3.5 fill-saffron text-saffron" aria-hidden />
                  {s.ratingAvg.toLocaleString("fa-IR")}
                  <span className="text-ink-soft">({s.ratingCount.toLocaleString("fa-IR")})</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
