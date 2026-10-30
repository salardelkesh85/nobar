"use client";

import { cityName, shopById } from "@nobar/demo";
import { ButtonLink, Card, EmptyState, JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { ChevronLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function OrdersPage() {
  const { ready, orders } = useStore();
  if (!ready) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">سفارش‌های من</h1>
      {orders.length === 0 ? (
        <EmptyState icon={<Receipt className="size-10" />} title="هنوز سفارشی ثبت نکرده‌اید" action={<ButtonLink href="/">شروع خرید</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.code}>
              <Link href={`/orders/${o.code}`}>
                <Card className="flex items-center gap-4 p-4 hover:border-brand shadow-none">
                  <div className="flex-1">
                    <p className="font-bold" dir="ltr">
                      {o.code}
                    </p>
                    <p className="text-sm text-ink-soft">
                      <JalaliDate date={o.placedAt} format="datetime" /> · ارسال به {cityName(o.destCityId)}
                    </p>
                    <p className="text-sm text-ink-soft">{o.shops.map((s) => shopById(s.shopId)?.name).join("، ")}</p>
                  </div>
                  <Toman rial={o.payableRial} className="font-extrabold" />
                  <ChevronLeft className="size-5 text-ink-soft" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
