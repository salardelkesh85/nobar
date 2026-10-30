import {
  CATEGORIES,
  cityName,
  currentMonth,
  destinationCities,
  inSeason,
  isNobar,
  isPeak,
  JALALI_MONTHS,
  LISTINGS,
  PRODUCE_TYPES,
  produceTypeById,
  search,
  SHOPS,
  shopById,
} from "@nobar/demo";
import { ButtonLink, NobarBadge, ProduceArt, ProduceIllustration, SectionHeader } from "@nobar/ui";
import { ArrowLeft, Clock, ShieldCheck, Sparkles, Sprout, Truck } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ListingGrid } from "@/components/listing-card";
import { getDestination } from "@/lib/server";

const HERO_FRUITS: Array<{ kind: string; className: string; r: number; delay: string }> = [
  { kind: "pomegranate", className: "end-[8%] top-[10%] w-[30%]", r: -8, delay: "0s" },
  { kind: "apple-red", className: "end-[34%] top-[34%] w-[26%]", r: 6, delay: "-1.5s" },
  { kind: "tangerine", className: "end-[4%] top-[52%] w-[22%]", r: 10, delay: "-3s" },
  { kind: "grape-black", className: "end-[30%] top-[2%] w-[18%]", r: -12, delay: "-2s" },
  { kind: "kiwi", className: "end-[22%] bottom-[2%] w-[20%]", r: 4, delay: "-4s" },
];

export default async function HomePage() {
  const dest = await getDestination();
  const month = currentMonth();
  const all = search({ dest, sort: "newest" });
  const nobarHits = all.hits.filter((h) => isNobar(h.listing));
  const nobarIds = new Set(nobarHits.map((h) => h.listing.id));
  // «نوبرهای این هفته»: nobar listings first, then the newest in-season listings (docs/00 §6)
  const weekly = [...nobarHits, ...all.hits.filter((h) => !nobarIds.has(h.listing.id) && inSeason(h.type, month))].slice(0, 10);
  const seasonal = PRODUCE_TYPES.filter((pt) => inSeason(pt, month) && LISTINGS.some((l) => l.produceTypeId === pt.id));
  const headline = LISTINGS.find((l) => isNobar(l) && l.produceTypeId === "kiwi") ?? LISTINGS.find((l) => isNobar(l));
  const headlineShop = headline ? shopById(headline.shopId) : undefined;
  const headlineType = headline ? produceTypeById(headline.produceTypeId) : undefined;
  const fa = (n: number) => n.toLocaleString("fa-IR");
  const origins = [
    { city: "miandoab", title: "میاندوآب", sub: "سیب و انگور بی‌دانه", kind: "grape-white", hue: 85 },
    { city: "urmia", title: "ارومیه", sub: "سیب، گردو و انار", kind: "apple-red", hue: 4 },
    { city: "saveh", title: "ساوه", sub: "انار ملس", kind: "pomegranate", hue: 350 },
    { city: "sari", title: "ساری", sub: "نارنگی و پرتقال", kind: "tangerine", hue: 30 },
    { city: "bam", title: "بم", sub: "خرمای مضافتی", kind: "dates-mazafati", hue: 22 },
    { city: "jiroft", title: "جیرفت", sub: "گوجه و صیفی", kind: "tomato", hue: 6 },
  ];

  return (
    <div className="space-y-14">
      {/* Bento hero */}
      <section className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
        <div className="hero-surface relative isolate overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-10 lg:col-span-2 lg:row-span-2 dark:text-ink">
          <div className="relative z-10 max-w-[30rem] animate-rise">
            <div aria-hidden className="mb-5 flex items-end gap-1 md:hidden">
              {["pomegranate", "apple-red", "tangerine", "grape-black", "kiwi"].map((k, i) => (
                <ProduceIllustration key={k} kind={k} className={`w-14 drop-shadow-[0_10px_12px_rgb(0_0_0/0.3)] ${i % 2 ? "-translate-y-2" : ""}`} />
              ))}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
              <span className="size-1.5 rounded-full bg-saffron" aria-hidden />
              {JALALI_MONTHS[month - 1]}؛ فصل انار، سیب و نارنگی
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.25] sm:text-6xl sm:leading-[1.2]">
              نوبرِ هر شهر،
              <br />
              <span className="text-[#b9e6bb]">مستقیم از باغ</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-white/85 sm:text-lg dark:text-ink-soft">
              از باغدارهای میاندوآب، ارومیه، ساوه و ده‌ها شهر دیگر بخرید؛ با تاریخ برداشت و قیمت تمام‌شده تا درِ خانه‌تان در {cityName(dest)}.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/search" size="lg" variant="onDark">
                شروع خرید
                <ArrowLeft className="size-5" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/baghboon" size="lg" variant="outlineOnDark">
                <Sprout className="size-5" aria-hidden />
                از باغبون بپرسید
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-sm grid-cols-3 gap-4 border-t border-white/15 pt-5 text-sm">
              <div>
                <dt className="text-white/70 dark:text-ink-soft">غرفه‌ی فعال</dt>
                <dd className="text-2xl font-black">{fa(SHOPS.length)}</dd>
              </div>
              <div>
                <dt className="text-white/70 dark:text-ink-soft">شهر مقصد</dt>
                <dd className="text-2xl font-black">{fa(destinationCities().length)}</dd>
              </div>
              <div>
                <dt className="text-white/70 dark:text-ink-soft">محصول فصل</dt>
                <dd className="text-2xl font-black">{fa(seasonal.length)}</dd>
              </div>
            </dl>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 hidden w-[52%] md:block">
            <div className="absolute end-[6%] top-1/2 aspect-square w-[78%] -translate-y-1/2 rounded-full bg-white/8 ring-1 ring-white/10" />
            {HERO_FRUITS.map((h) => (
              <div key={h.kind} className={`absolute ${h.className} animate-float`} style={{ "--r": `${h.r}deg`, animationDelay: h.delay } as CSSProperties}>
                <ProduceIllustration kind={h.kind} className="w-full drop-shadow-[0_18px_22px_rgb(0_0_0/0.28)]" />
              </div>
            ))}
          </div>
        </div>

        {headline && headlineShop && headlineType ? (
          <Link
            href={`/l/${headline.slug}`}
            className="group relative flex overflow-hidden rounded-[1.75rem] border border-nobar/20 bg-nobar-soft p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="relative z-10 flex max-w-[60%] flex-col">
              <NobarBadge />
              <p className="mt-3 text-xl font-black leading-snug text-ink">
                اولین {headlineType.name}‌های {cityName(headline.originCityId)} رسید
              </p>
              <p className="mt-1 text-sm text-ink-soft">از {headlineShop.name}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-nobar">
                ببینید
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden />
              </span>
            </div>
            <ProduceIllustration kind={headlineType.id} className="absolute -bottom-4 -end-4 w-44 rotate-12 drop-shadow-[0_16px_18px_rgb(0_0_0/0.18)] transition-transform duration-500 group-hover:rotate-0" />
          </Link>
        ) : null}

        <div className="relative overflow-hidden rounded-[1.75rem] border border-saffron/25 bg-cream p-6 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-warn">
            <Sparkles className="size-4" aria-hidden />
            باغبون، دستیار خرید
          </p>
          <p className="mt-2 text-xl font-black leading-snug">هرچه می‌خواهید، عادی بنویسید</p>
          <div className="mt-4 flex flex-col gap-2">
            {["سیب ترش برای کمپوت که تا کرج تازه برسه", "سبد میوه برای ۶ نفر با ۸۰۰ هزار تومن"].map((q) => (
              <Link
                key={q}
                href={`/baghboon?q=${encodeURIComponent(q)}`}
                className="flex items-center justify-between gap-2 rounded-full bg-surface px-4 py-2.5 text-sm shadow-soft ring-1 ring-line transition hover:ring-brand"
              >
                <span className="truncate">«{q}»</span>
                <ArrowLeft className="size-4 shrink-0 text-brand" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section aria-label="چرا نوبر" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "پرداخت امن", body: "پول شما تا پایان مهلت شکایت نزد نوبر می‌ماند." },
          { icon: Sprout, title: "ضمانت تازگی", body: "محصول کهنه خودکار از فروش خارج می‌شود." },
          { icon: Truck, title: "قیمت تمام‌شده", body: "قیمت هر کیلو با هزینه‌ی ارسال تا درِ خانه." },
          { icon: Clock, title: "زمان رسیدن واقعی", body: "فقط به شهرهایی که تازه برسد عرضه می‌شود." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 bg-surface p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-extrabold">{title}</h2>
              <p className="mt-0.5 text-sm leading-6 text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section>
        <SectionHeader title="دسته‌ها" />
        <ul className="grid grid-cols-5 gap-2 sm:gap-4">
          {CATEGORIES.map((c, i) => (
            <li key={c.id}>
              <Link href={`/search?cat=${c.id}`} className="group flex flex-col items-center gap-2 text-center">
                <span
                  className="produce-art grid aspect-square w-full max-w-28 place-items-center rounded-[1.75rem] shadow-soft ring-1 ring-line transition-all group-hover:-translate-y-1 group-hover:shadow-lift"
                  style={{ "--h": [4, 30, 8, 125, 32][i] } as CSSProperties}
                >
                  <ProduceIllustration kind={c.art} className="produce-shadow w-[62%] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                </span>
                <span className="text-xs font-bold sm:text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* نوبرهای این هفته */}
      <section>
        <SectionHeader
          title="نوبرهای این هفته"
          subtitle={`تازه‌ترین محصولات فصل که تا ${cityName(dest)} تازه می‌رسند`}
          action={
            <ButtonLink href="/search?sort=newest" variant="secondary" size="sm">
              همه
              <ArrowLeft className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <ListingGrid hits={weekly} />
      </section>

      {/* فصلشه */}
      <section>
        <SectionHeader
          title="فصلشه"
          subtitle={`آنچه در ${JALALI_MONTHS[month - 1]} در فصل خودش است`}
          action={
            <ButtonLink href="/season" variant="secondary" size="sm">
              تقویم نوبر
              <ArrowLeft className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 scrollbar-none">
          {seasonal.map((pt) => (
            <li key={pt.id} className="shrink-0 snap-start">
              <Link href={`/p/${pt.slug}`} className="group flex w-36 flex-col overflow-hidden rounded-card border border-line bg-surface p-2 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <ProduceArt emoji={pt.emoji} kind={pt.id} hue={pt.hue} size="md" className="aspect-square w-full rounded-tile" />
                <span className="mt-2 px-1 text-sm font-bold">{pt.name}</span>
                <span className={isPeak(pt, month) ? "px-1 pb-1 text-[0.7rem] font-bold text-brand" : "px-1 pb-1 text-[0.7rem] text-ink-soft"}>
                  {isPeak(pt, month) ? "● اوج فصل" : "در فصل"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Origins */}
      <section>
        <SectionHeader title="از مبدأ بخرید" subtitle="هر شهر، محصولی که به آن معروف است" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {origins.map((o, i) => (
            <li key={o.city} className={i === 0 ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}>
              <Link
                href={`/origin/${o.city}`}
                className="produce-art group relative flex h-full min-h-40 flex-col justify-end overflow-hidden rounded-card p-4 shadow-soft ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-lift"
                style={{ "--h": o.hue } as CSSProperties}
              >
                <ProduceIllustration
                  kind={o.kind}
                  className={`produce-shadow absolute -top-2 end-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${i === 0 ? "w-3/5" : "w-1/2"}`}
                />
                <span className="relative text-xs font-bold text-ink-soft">{o.sub}</span>
                <span className={`relative font-black text-ink ${i === 0 ? "text-3xl" : "text-xl"}`}>{o.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Seller CTA */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 shadow-soft sm:p-10">
        <div className="relative z-10 max-w-lg">
          <p className="text-sm font-bold text-brand">برای باغدارها و میوه‌فروشی‌ها</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">محصول باغتان را مستقیم به همه‌ی ایران بفروشید</h2>
          <p className="mt-3 leading-8 text-ink-soft">عکس بگیرید، بگویید، بفروشید. پول هر سفارش بعد از تحویل سالم، منهای کمیسیون، به شبای شما واریز می‌شود.</p>
          <ButtonLink href="/about/sell" size="lg" className="mt-6">
            شرایط غرفه‌داری
            <ArrowLeft className="size-5" aria-hidden />
          </ButtonLink>
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-6 end-4 hidden gap-2 sm:flex">
          {["quince", "walnut", "potato", "herbs"].map((k) => (
            <ProduceIllustration key={k} kind={k} className="w-28 drop-shadow-[0_14px_16px_rgb(0_0_0/0.14)]" />
          )).map((el, i) => (
            <div key={i} className={i % 2 ? "translate-y-6" : ""}>{el}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
