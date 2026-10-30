import {
  candidatesForType,
  cityName,
  compare,
  COMPARE_BADGE_FA,
  etaPhrase,
  PRESET_FA,
  produceTypeById,
  produceTypeBySlug,
  REASON_FA,
  type Preset,
} from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Card, cn, EmptyState, FreshnessBadge, ProduceArt, RatingStars, Toman, Weight } from "@nobar/ui";
import { Info, Scale, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddOfferButton } from "@/components/add-offer";
import { getDestination } from "@/lib/server";

export const metadata: Metadata = { title: "مقایسه‌گر" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PRESETS: Preset[] = ["balanced", "budget", "freshest", "fastest"];
const KGS = [1, 3, 5, 10];

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const dest = await getDestination();
  const kg = Math.max(1, Math.min(50, Number(one(sp.kg) ?? 5) || 5));
  const preset = (PRESETS.includes(one(sp.preset) as Preset) ? one(sp.preset) : "balanced") as Preset;
  const typeSlug = one(sp.type);
  const type = typeSlug ? produceTypeBySlug(decodeURIComponent(typeSlug)) : undefined;
  const ids = type ? candidatesForType(type.id, dest, kg * 1000) : (one(sp.ids) ?? "").split(",").filter(Boolean).slice(0, 4);
  const result = compare(ids, dest, kg * 1000, preset);
  const base = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type.slug);
    else q.set("ids", ids.join(","));
    q.set("kg", String(kg));
    q.set("preset", preset);
    for (const [k, v] of Object.entries(over)) q.set(k, v);
    return `/compare?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Scale className="size-7 text-brand" aria-hidden />
          مقایسه‌گر {type ? type.name : ""}
        </h1>
        <p className="mt-1 text-ink-soft">
          مقایسه‌ی منصفانه برای {formatFaNumber(kg)} کیلو تا {cityName(dest)}: قیمت تمام‌شده با ارسال، تازگی هنگام رسیدن، امتیاز و زمان رسیدن.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label="مقدار خرید" className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          {KGS.map((k) => (
            <Link key={k} href={base({ kg: String(k) })} aria-current={k === kg ? "true" : undefined} className={cn("min-h-9 rounded-full px-3 py-1.5 text-sm", k === kg ? "bg-brand font-bold text-on-brand" : "hover:bg-surface-2")}>
              {formatFaNumber(k)} کیلو
            </Link>
          ))}
        </div>
        <div role="group" aria-label="اولویت شما" className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1">
          {PRESETS.map((p) => (
            <Link key={p} href={base({ preset: p })} aria-current={p === preset ? "true" : undefined} className={cn("min-h-9 rounded-full px-3 py-1.5 text-sm", p === preset ? "bg-brand font-bold text-on-brand" : "hover:bg-surface-2")}>
              {PRESET_FA[p]}
            </Link>
          ))}
        </div>
      </div>

      {result.offers.length < 2 && !result.excluded.length ? (
        <EmptyState icon={<Scale className="size-10" />} title="برای مقایسه حداقل دو محصول لازم است" body="روی کارت محصولات «مقایسه» را بزنید، یا از صفحه‌ی یک محصول «مقایسه با غرفه‌های دیگر» را انتخاب کنید." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {result.offers.map((o, i) => {
            const pt = produceTypeById(o.listing.produceTypeId)!;
            const best = o.badges.includes("BEST_OVERALL");
            return (
              <Card key={o.listing.id} className={cn("flex flex-col overflow-hidden", best && "border-2 border-brand")}>
                <div className="relative">
                  <ProduceArt emoji={pt.emoji} kind={pt.id} hue={pt.hue} size="md" className="h-28 w-full" />
                  <span className="absolute start-2 top-2 grid size-8 place-items-center rounded-full bg-surface font-black">{formatFaNumber(i + 1)}</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap gap-1">
                    {o.badges.map((b) => (
                      <Badge key={b} tone={b === "BEST_OVERALL" ? "solid" : "brand"}>
                        {b === "BEST_OVERALL" ? <Sprout className="size-3" aria-hidden /> : null}
                        {COMPARE_BADGE_FA[b]}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <Link href={`/l/${o.listing.slug}`} className="font-bold leading-7 hover:text-brand">{o.listing.title}</Link>
                    <p className="text-xs text-ink-soft">{o.shop.name} · {cityName(o.listing.originCityId)}</p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="rounded-control bg-brand-soft p-2">
                      <dt className="text-xs text-ink-soft">قیمت تمام‌شده‌ی هر کیلو تا درِ خانه</dt>
                      <dd className="text-lg font-black text-brand-strong"><Toman rial={o.landedPerKgRial} /></dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-soft">خرید</dt>
                      <dd className="text-end">{formatFaNumber(o.count)} × {o.pkg.label} (<Weight grams={o.totalGrams} />)</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-soft">کالا + ارسال</dt>
                      <dd><Toman rial={o.itemsRial} /> + {o.shippingRial ? <Toman rial={o.shippingRial} /> : "رایگان"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-soft">رسیدن</dt>
                      <dd>{etaPhrase(o.delivery)} · {o.delivery.label}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-soft">تازگی هنگام رسیدن</dt>
                      <dd>{formatFaNumber(o.delivery.freshOnArrivalDays)} روز</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">الان</dt>
                      <dd><FreshnessBadge level={o.freshness.badge} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">امتیاز</dt>
                      <dd><RatingStars value={o.shop.ratingAvg} count={o.shop.ratingCount} className="text-xs" /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">امتیاز مقایسه</dt>
                      <dd className="font-bold">{formatFaNumber(Math.round(o.score * 100))} از ۱۰۰</dd>
                    </div>
                  </dl>
                  <AddOfferButton listingId={o.listing.id} packageId={o.pkg.id} qty={o.count} label={`${formatFaNumber(o.count)} × ${o.pkg.label}`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {result.excluded.length ? (
        <Card className="p-4">
          <h2 className="mb-2 font-bold">از مقایسه کنار گذاشته شد</h2>
          <ul className="space-y-1 text-sm">
            {result.excluded.map((x) => (
              <li key={x.listing.id}>
                {x.listing.title} ({x.shop.name}) — <span className="text-danger">{REASON_FA[x.reason]}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex gap-3 p-4 text-sm leading-7 text-ink-soft">
        <Info className="size-5 shrink-0 text-brand" aria-hidden />
        <p>
          این مقایسه با فرمول ثابت و شفاف حساب می‌شود، نه با هوش مصنوعی. در حالت «{PRESET_FA[preset]}» وزن‌ها:
          {preset === "balanced" && " قیمت ۳۵٪، تازگی ۳۰٪، امتیاز ۲۰٪، سرعت ۱۵٪."}
          {preset === "budget" && " قیمت ۶۰٪، تازگی ۱۵٪، امتیاز ۱۵٪، سرعت ۱۰٪."}
          {preset === "freshest" && " قیمت ۲۰٪، تازگی ۵۰٪، امتیاز ۲۰٪، سرعت ۱۰٪."}
          {preset === "fastest" && " قیمت ۲۰٪، تازگی ۲۰٪، امتیاز ۱۰٪، سرعت ۵۰٪."}
          {" "}امتیاز غرفه با میانگین بیزی حساب می‌شود تا غرفه‌ی تازه‌کار با یکی دو نظر بالا نیاید.
        </p>
      </Card>
    </div>
  );
}
