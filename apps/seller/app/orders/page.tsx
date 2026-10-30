"use client";

import { cityName, commissionOf, itemsTotal, METHOD_FA, sellerNet, SHOP_ORDER_STATUS_FA, SHOP_ORDER_TONE, type ShopOrder, type ShopOrderStatus } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Button, Card, cn, EmptyState, Input, JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { AlarmClock, Check, ClipboardList, PackageCheck, Truck, X } from "lucide-react";
import { useState } from "react";
import { useSeller } from "@/lib/state";
import { timeLeft, useNow } from "@/lib/time";

const TABS: Array<{ key: string; label: string; statuses: ShopOrderStatus[] }> = [
  { key: "new", label: "منتظر تأیید", statuses: ["AWAITING_ACCEPTANCE"] },
  { key: "ship", label: "آماده‌ی ارسال", statuses: ["ACCEPTED"] },
  { key: "way", label: "در راه و تحویل", statuses: ["SHIPPED", "DELIVERED", "DISPUTED"] },
  { key: "done", label: "پایان‌یافته", statuses: ["COMPLETED", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED"] },
];

export default function OrdersPage() {
  const { ready, orders } = useSeller();
  const [tab, setTab] = useState("new");
  if (!ready) return <Skeleton className="h-96 w-full" />;
  const current = TABS.find((t) => t.key === tab)!;
  const list = orders.filter((o) => current.statuses.includes(o.status));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">سفارش‌ها</h1>
      <div role="tablist" aria-label="وضعیت سفارش" className="flex gap-2 overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const n = orders.filter((o) => t.statuses.includes(o.status)).length;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm", tab === t.key ? "border-brand bg-brand font-bold text-on-brand" : "border-line bg-surface")}
            >
              {t.label} ({formatFaNumber(n)})
            </button>
          );
        })}
      </div>
      {list.length ? (
        <ul className="space-y-3" role="tabpanel">
          {list.map((o) => (
            <li key={o.code}>
              <OrderCard order={o} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ClipboardList className="size-10" />} title="سفارشی در این بخش نیست" />
      )}
    </div>
  );
}

function OrderCard({ order: o }: { order: ShopOrder }) {
  const { updateOrder, showToast } = useSeller();
  const now = useNow();
  const [tracking, setTracking] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const needsTracking = o.method !== "SELLER_LOCAL";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
        <div>
          <span className="font-bold" dir="ltr">{o.code}</span>
          <span className="ms-2 text-sm text-ink-soft">
            {o.buyerName} · {cityName(o.destCityId)} · <JalaliDate date={o.placedAt} format="datetime" />
          </span>
        </div>
        <Badge tone={SHOP_ORDER_TONE[o.status]}>{SHOP_ORDER_STATUS_FA[o.status]}</Badge>
      </div>
      <ul className="divide-y divide-line px-4">
        {o.lines.map((l) => (
          <li key={l.packageId} className="flex items-center justify-between gap-2 py-3 text-lg">
            <span>
              <span className="font-black">{formatFaNumber(l.quantity)} ×</span> {l.packageLabel}
              <span className="block text-sm text-ink-soft">{l.title}</span>
            </span>
            <Toman rial={l.unitPriceRial * l.quantity} className="text-base" />
          </li>
        ))}
      </ul>
      <div className="grid gap-1 border-t border-line px-4 py-3 text-sm sm:grid-cols-2">
        <p className="text-ink-soft">
          ارسال: {METHOD_FA[o.method]} {o.trackingCode ? <span dir="ltr">({o.trackingCode})</span> : null}
        </p>
        <p className="sm:text-end">
          کالا <Toman rial={itemsTotal(o)} /> − کمیسیون <Toman rial={commissionOf(o)} /> + ارسال <Toman rial={o.shippingRial} /> = <Toman rial={sellerNet(o)} className="font-bold" />
        </p>
      </div>

      {o.status === "AWAITING_ACCEPTANCE" ? (
        <div className="space-y-3 border-t border-line bg-saffron-soft/50 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-bold text-warn">
            <AlarmClock className="size-4" aria-hidden />
            {timeLeft(o.acceptDeadline!, now)} تا پایان مهلت تأیید
          </p>
          {confirmReject ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">رد سفارش، پول را به خریدار برمی‌گرداند و در امتیاز لغو شما ثبت می‌شود. مطمئنید؟</span>
              <Button variant="danger" onClick={() => { updateOrder(o.code, { status: "REJECTED" }); showToast("سفارش رد شد؛ مبلغ به خریدار برمی‌گردد."); }}>
                بله، رد کن
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReject(false)}>انصراف</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" onClick={() => { updateOrder(o.code, { status: "ACCEPTED" }); showToast("سفارش تأیید شد. خریدار خبردار شد."); }}>
                <Check className="size-5" aria-hidden />
                تأیید سفارش
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setConfirmReject(true)}>
                <X className="size-5" aria-hidden />
                رد
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {o.status === "ACCEPTED" ? (
        <form
          className="flex flex-wrap items-end gap-2 border-t border-line px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (needsTracking && tracking.trim().length < 4) return showToast("کد رهگیری مرسوله را وارد کنید.");
            updateOrder(o.code, { status: "SHIPPED", trackingCode: tracking.trim() || undefined, shippedAt: new Date().toISOString() });
            showToast("ارسال ثبت شد. خریدار کد رهگیری را می‌بیند.");
          }}
        >
          {needsTracking ? (
            <label className="flex-1 text-sm font-bold">
              کد رهگیری {METHOD_FA[o.method]}
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" className="mt-1" inputMode="text" />
            </label>
          ) : null}
          <Button type="submit" size="lg">
            <Truck className="size-5" aria-hidden />
            ارسال شد
          </Button>
        </form>
      ) : null}

      {o.status === "SHIPPED" && o.method === "SELLER_LOCAL" ? (
        <div className="border-t border-line px-4 py-4">
          <Button onClick={() => { updateOrder(o.code, { status: "DELIVERED", deliveredAt: new Date().toISOString() }); showToast("تحویل ثبت شد."); }}>
            <PackageCheck className="size-5" aria-hidden />
            تحویل دادم
          </Button>
        </div>
      ) : null}

      {o.status === "DISPUTED" ? (
        <p className="border-t border-line bg-nobar-soft px-4 py-3 text-sm text-nobar">خریدار شکایت ثبت کرده است. در بخش «نظرها و شکایت‌ها» تا ۱۲ ساعت پاسخ دهید یا پیشنهاد بازپرداخت بدهید.</p>
      ) : null}
    </Card>
  );
}
