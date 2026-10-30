"use client";

import { currentMonth, inSeason, isNobar, JALALI_MONTHS, LISTINGS, PRODUCE_TYPES, produceTypeById } from "@nobar/demo";
import { RelativeDay, Skeleton } from "@nobar/ui";
import { BellRing } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { NobarSubscribe } from "@/components/nobar-subscribe";
import { Photo } from "@/components/photo";
import { read } from "@/lib/store";

export default function AlertsPage() {
  const [subs, setSubs] = useState<string[] | null>(null);
  useEffect(() => setSubs(read<string[]>("nobar_alerts", [])), []);
  if (!subs) return <Skeleton className="h-96 w-full" />;
  const month = currentMonth();
  const arrivals = LISTINGS.filter((l) => isNobar(l));
  const upcoming = PRODUCE_TYPES.filter((p) => !inSeason(p, month)).sort((a, b) => (a.months[0]! - month + 12) % 12 - (b.months[0]! - month + 12) % 12);

  return (
    <AccountShell title="خبرهای «نوبر شد!»">
      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-3 font-extrabold">تازه رسیده</h2>
        <ul className="divide-y divide-line">
          {arrivals.map((l) => {
            const pt = produceTypeById(l.produceTypeId)!;
            return (
              <li key={l.id}>
                <Link href={`/l/${l.id}`} className="flex items-center gap-3 py-3 hover:text-brand">
                  <Photo kind={pt.id} alt="" sizes="48px" className="size-12 shrink-0 rounded-full" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
                  <span className="flex-1 text-sm">
                    <span className="flex items-center gap-1 font-bold text-nobar">
                      <BellRing className="size-4" aria-hidden />
                      نوبر شد!
                    </span>
                    {l.title}
                  </span>
                  <RelativeDay date={l.publishedAt} className="text-xs text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-1 font-extrabold">خبرم کن وقتی رسید</h2>
        <p className="mb-3 text-sm text-ink-soft">اولین محصول فصل که در نوبر عرضه شود، پیامک و اعلان می‌گیرید.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {upcoming.map((pt) => (
            <li key={pt.id} className="flex items-center gap-3 rounded-control border border-line p-2">
              <Photo kind={pt.id} alt="" sizes="40px" className="size-10 shrink-0 rounded-full" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
              <span className="flex-1 text-sm">
                <span className="block font-bold">{pt.name}</span>
                <span className="block text-xs text-ink-soft">فصلش از {JALALI_MONTHS[pt.months[0]! - 1]}</span>
              </span>
              <NobarSubscribe produceTypeId={pt.id} name={pt.name} withLabel />
            </li>
          ))}
        </ul>
        {subs.length ? <p className="mt-3 text-xs text-ink-soft">{subs.length.toLocaleString("fa-IR")} خبر فعال دارید.</p> : null}
      </section>
    </AccountShell>
  );
}
