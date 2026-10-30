"use client";

import { freshnessOf, itemsTotal, packageGrams, PRICE_POSITION_FA, pricePosition, sellerNet, shopById } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, ButtonLink, Card, FreshnessBadge, Skeleton, Stat, Toman } from "@nobar/ui";
import { AlarmClock, Camera, ChevronLeft, Hourglass, TrendingUp } from "lucide-react";
import Link from "next/link";
import { SHOP_ID, useSeller } from "@/lib/state";
import { timeLeft, useNow } from "@/lib/time";

export default function Dashboard() {
  const { ready, orders, listings } = useSeller();
  const now = useNow();
  const shop = shopById(SHOP_ID)!;
  if (!ready) return <Skeleton className="h-96 w-full" />;

  const awaiting = orders.filter((o) => o.status === "AWAITING_ACCEPTANCE");
  const toShip = orders.filter((o) => o.status === "ACCEPTED");
  const escrow = orders.filter((o) => ["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "DISPUTED"].includes(o.status)).reduce((s, o) => s + sellerNet(o), 0);
  const ready2pay = orders.filter((o) => o.status === "COMPLETED" && !o.payoutId).reduce((s, o) => s + sellerNet(o), 0);
  const month = orders.filter((o) => !["REJECTED", "EXPIRED", "CANCELLED"].includes(o.status)).reduce((s, o) => s + itemsTotal(o), 0);
  const lowStock = listings.filter((l) => l.stockBase / packageGrams(l.packages[0]!) < 40);
  const aging = listings.filter((l) => freshnessOf(l).badge === "GOOD");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">سلام {shop.ownerName}، خسته نباشید</h1>
        <p className="text-ink-soft">خلاصه‌ی امروز غرفه‌ی {shop.name}</p>
      </div>

      {awaiting.length ? (
        <Card className="border-2 border-saffron/60 bg-saffron-soft p-4">
          <p className="flex items-center gap-2 font-extrabold text-warn">
            <AlarmClock className="size-5" aria-hidden />
            {formatFaNumber(awaiting.length)} سفارش منتظر تأیید شماست
          </p>
          <ul className="mt-3 space-y-2">
            {awaiting.map((o) => (
              <li key={o.code}>
                <Link href="/orders" className="flex items-center justify-between gap-2 rounded-control bg-surface p-3 hover:ring-2 hover:ring-brand">
                  <span>
                    <span className="font-bold" dir="ltr">{o.code}</span>
                    <span className="block text-sm text-ink-soft">{o.lines.map((l) => `${formatFaNumber(l.quantity)} × ${l.packageLabel}`).join("، ")}</span>
                  </span>
                  <span className="text-end text-sm">
                    <span className="block font-bold text-warn">{timeLeft(o.acceptDeadline!, now)} مانده</span>
                    <Toman rial={itemsTotal(o)} className="text-ink-soft" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">اگر در مهلت تأیید نشود، سفارش منقضی و پول به خریدار برمی‌گردد.</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="آماده‌ی ارسال" value={formatFaNumber(toShip.length)} hint="تأییدشده، هنوز ارسال نشده" tone="brand" />
        <Stat label="فروش این ماه" value={<Toman rial={month} />} />
        <Stat label="در حساب امانی" value={<Toman rial={escrow} />} hint="بعد از مهلت شکایت آزاد می‌شود" />
        <Stat label="آماده‌ی تسویه" value={<Toman rial={ready2pay} />} hint="در تسویه‌ی بعدی واریز می‌شود" tone="brand" />
      </div>

      <Link href="/products/new" className="flex items-center gap-4 rounded-card bg-brand-solid p-5 text-white hover:opacity-95">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15">
          <Camera className="size-7" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-extrabold">عکس بگیر، بگو، بفروش</span>
          <span className="block text-sm opacity-85">محصول تازه را با چند عکس ثبت کنید.</span>
        </span>
        <ChevronLeft className="size-6" aria-hidden />
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold">
            <Hourglass className="size-5 text-warn" aria-hidden />
            تازگی و موجودی
          </h2>
          {lowStock.length || aging.length ? (
            <ul className="space-y-2 text-sm">
              {aging.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <span>{l.title}</span>
                  <FreshnessBadge level="GOOD" detail="به‌زودی از فروش خارج می‌شود" />
                </li>
              ))}
              {lowStock.map((l) => (
                <li key={`s-${l.id}`} className="flex items-center justify-between gap-2">
                  <span>{l.title}</span>
                  <Badge tone="warn">موجودی کم</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">همه‌ی محصولات تازه‌اند و موجودی کافی دارند.</p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold">
            <TrendingUp className="size-5 text-brand" aria-hidden />
            قیمت شما در بازار
          </h2>
          <ul className="space-y-2 text-sm">
            {listings.map((l) => {
              const pos = pricePosition(l);
              return (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <span>{l.title}</span>
                  <Badge tone={pos === "ABOVE" ? "saffron" : pos === "UNKNOWN" ? "neutral" : "brand"}>{PRICE_POSITION_FA[pos]}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <ButtonLink href="/orders" variant="secondary">همه‌ی سفارش‌ها</ButtonLink>
    </div>
  );
}
