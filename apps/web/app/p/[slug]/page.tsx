import { categoryById, cityName, currentMonth, inSeason, isPeak, JALALI_MONTHS, produceTypeBySlug, search } from "@nobar/demo";
import { Badge, ButtonLink, EmptyState, ProduceArt } from "@nobar/ui";
import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { decodeSlug, getDestination } from "@/lib/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pt = produceTypeBySlug(decodeSlug((await params).slug));
  return pt ? { title: `خرید ${pt.name} از باغ`, description: `همه‌ی پیشنهادهای ${pt.name} با قیمت هر کیلو و هزینه‌ی ارسال تا شهر شما.` } : {};
}

export default async function ProduceTypePage({ params }: { params: Params }) {
  const pt = produceTypeBySlug(decodeSlug((await params).slug));
  if (!pt) notFound();
  const dest = await getDestination();
  const res = search({ dest, produceType: pt.id, sort: "landed" });
  const month = currentMonth();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <ProduceArt emoji={pt.emoji} kind={pt.id} hue={pt.hue} size="lg" className="size-28 shrink-0 rounded-card" />
        <div className="flex-1">
          <p className="text-sm text-ink-soft">{categoryById(pt.categoryId)?.name}</p>
          <h1 className="text-3xl font-black">{pt.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {inSeason(pt, month) ? <Badge tone="brand">{isPeak(pt, month) ? "اوج فصل" : "در فصل"}</Badge> : <Badge tone="neutral">خارج از فصل</Badge>}
            <Badge tone="neutral">فصل: {pt.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")}</Badge>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {res.total.toLocaleString("fa-IR")} غرفه {pt.name} دارند که تازه به {cityName(dest)} می‌رسد؛ مرتب‌شده بر اساس قیمت تمام‌شده تا درِ خانه.
          </p>
        </div>
        {res.total >= 2 ? (
          <ButtonLink href={`/compare?type=${pt.slug}`} size="lg">
            <Scale className="size-5" aria-hidden />
            مقایسه‌ی بهترین‌ها
          </ButtonLink>
        ) : null}
      </header>
      {res.hits.length ? (
        <ListingGrid hits={res.hits} />
      ) : (
        <EmptyState title={`فعلاً ${pt.name}ی برای ${cityName(dest)} نداریم`} body="شاید فصلش نیست یا تا شهر شما تازه نمی‌رسد. «نوبر شد!» را فعال کنید تا اولین محصول فصل را خبر بدهیم." />
      )}
    </div>
  );
}
