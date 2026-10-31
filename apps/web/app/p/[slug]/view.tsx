"use client";

import { categoryById, cityName, currentMonth, inSeason, isPeak, JALALI_MONTHS, produceTypeBySlug, search } from "@nobar/demo";
import { Badge, ButtonLink, EmptyState } from "@nobar/ui";
import { Scale } from "lucide-react";
import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-card";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/photo";

export function ProduceTypeView({ id }: { id: string }) {
  const pt = produceTypeBySlug(id);
  if (!pt) notFound();
  const { dest } = useStore();
  const res = search({ dest, produceType: pt.id, sort: "landed" });
  const month = currentMonth();

  return (
    <div className="space-y-6">
      <header className="studio-produce-profile flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <Photo kind={pt.id} alt="" className="size-28 shrink-0 rounded-card" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
        <div className="flex-1">
          <p className="text-sm text-ink-soft">{categoryById(pt.categoryId)?.name}</p>
          <h1 className="text-xl font-extrabold sm:text-2xl">{pt.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {inSeason(pt, month) ? <Badge tone="brand">{isPeak(pt, month) ? "اوج فصل" : "در فصل"}</Badge> : <Badge tone="neutral">خارج از فصل</Badge>}
            <Badge tone="neutral">فصل: {pt.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")}</Badge>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {res.total.toLocaleString("fa-IR")} غرفه {pt.name} دارند که تازه به {cityName(dest)} می‌رسد؛ مرتب‌شده بر اساس قیمت تمام‌شده تا درِ خانه.
          </p>
        </div>
        {res.total >= 2 ? (
          <ButtonLink href={`/compare?type=${pt.id}`} size="lg">
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
