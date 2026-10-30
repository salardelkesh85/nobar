"use client";

import { cityName, listingById, produceTypeById, shopById } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Badge, ButtonLink, cn, EmptyState, JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { ChevronLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { Photo } from "@/components/photo";
import { read, useStore, type PlacedOrder } from "@/lib/store";

type Tab = "current" | "done";
const DONE = ["COMPLETED", "REFUNDED", "REJECTED", "CANCELLED", "EXPIRED"];

export default function OrdersPage() {
  const { ready, orders } = useStore();
  const [status, setStatus] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("current");
  useEffect(() => setStatus(read("nobar_order_status", {})), []);
  if (!ready) return <Skeleton className="h-96 w-full" />;

  const isDone = (o: PlacedOrder) => o.shops.every((s) => DONE.includes(status[`${o.code}:${s.shopId}`] ?? ""));
  const list = orders.filter((o) => (tab === "done" ? isDone(o) : !isDone(o)));

  return (
    <AccountShell title="سفارش‌ها">
      <div role="tablist" className="flex gap-1 border-b border-line">
        {(
          [
            ["current", "جاری", orders.filter((o) => !isDone(o)).length],
            ["done", "تحویل و تکمیل‌شده", orders.filter(isDone).length],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("-mb-px min-h-11 border-b-2 px-4 text-sm", tab === k ? "border-brand font-bold text-brand" : "border-transparent text-ink-soft")}
          >
            {label} <Badge tone={tab === k ? "brand" : "neutral"}>{toFaDigits(n)}</Badge>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Receipt className="size-10" />} title={tab === "current" ? "سفارش جاری ندارید" : "هنوز سفارشی تکمیل نشده"} action={<ButtonLink href="/">شروع خرید</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((o) => {
            const items = o.shops.flatMap((s) => s.items);
            return (
              <li key={o.code}>
                <Link href={`/order?code=${o.code}`} className="block rounded-card border border-line bg-surface hover:border-brand">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-sm">
                    <span className="font-bold" dir="ltr">
                      {o.code}
                    </span>
                    <span className="text-ink-soft">
                      <JalaliDate date={o.placedAt} />
                    </span>
                    <span className="text-ink-soft">ارسال به {cityName(o.destCityId)}</span>
                    <span className="ms-auto inline-flex items-center gap-1 font-bold">
                      <Toman rial={o.payableRial} />
                      <ChevronLeft className="size-4 text-ink-soft" aria-hidden />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3">
                    {items.slice(0, 6).map((it) => {
                      const pt = produceTypeById(listingById(it.listingId)?.produceTypeId ?? "");
                      return pt ? <Photo key={it.packageId} kind={pt.id} alt="" sizes="56px" className="size-14 rounded-control" fallback={{ emoji: pt.emoji, hue: pt.hue }} /> : null;
                    })}
                    <span className="ms-auto text-xs text-ink-soft">{o.shops.map((s) => shopById(s.shopId)?.name).join("، ")}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
