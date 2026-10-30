"use client";

import { commissionOf, itemsTotal, PAYOUTS, sellerNet, SHOP_ORDER_STATUS_FA } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Card, JalaliDate, Skeleton, Stat, Toman } from "@nobar/ui";
import { Info } from "lucide-react";
import { SHOP_ID, useSeller } from "@/lib/state";

const PAYOUT_FA = { SCHEDULED: "زمان‌بندی‌شده", PAID: "واریز شد", FAILED: "ناموفق" } as const;

export default function PayoutsPage() {
  const { ready, orders } = useSeller();
  if (!ready) return <Skeleton className="h-96 w-full" />;
  const inEscrow = orders.filter((o) => ["ACCEPTED", "SHIPPED", "DELIVERED", "DISPUTED", "AWAITING_ACCEPTANCE"].includes(o.status));
  const available = orders.filter((o) => o.status === "COMPLETED" && !o.payoutId);
  const payouts = PAYOUTS.filter((p) => p.shopId === SHOP_ID);
  const next = payouts.find((p) => p.status === "SCHEDULED");
  const nextAmount = available.reduce((s, o) => s + sellerNet(o), 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">تسویه</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="در حساب امانی" value={<Toman rial={inEscrow.reduce((s, o) => s + sellerNet(o), 0)} />} hint={`${formatFaNumber(inEscrow.length)} سفارش هنوز در جریان`} />
        <Stat label="تسویه‌ی بعدی" value={<Toman rial={nextAmount} />} hint={next ? <>واریز <JalaliDate date={next.date} format="short" /></> : undefined} tone="brand" />
        <Stat label="واریزشده تا امروز" value={<Toman rial={payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountRial, 0)} />} />
      </div>
      <p className="flex gap-2 rounded-control bg-surface-2 p-3 text-sm leading-7">
        <Info className="size-5 shrink-0 text-brand" aria-hidden />
        پول هر سفارش بعد از پایان مهلت شکایت خریدار آزاد می‌شود و در تسویه‌ی بعدی، منهای کمیسیون، به شبای شما واریز می‌شود. هزینه‌ی ارسال کامل به خودتان می‌رسد.
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="p-4 text-start text-lg font-extrabold">ریز سفارش‌ها</caption>
          <thead className="bg-surface-2 text-ink-soft">
            <tr>
              <th scope="col" className="p-3 text-start">سفارش</th>
              <th scope="col" className="p-3 text-start">وضعیت</th>
              <th scope="col" className="p-3 text-start">کالا</th>
              <th scope="col" className="p-3 text-start">کمیسیون</th>
              <th scope="col" className="p-3 text-start">ارسال</th>
              <th scope="col" className="p-3 text-start">سهم شما</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .filter((o) => !["REJECTED", "EXPIRED", "CANCELLED"].includes(o.status))
              .map((o) => (
                <tr key={o.code} className="border-t border-line">
                  <td className="p-3" dir="ltr">{o.code}</td>
                  <td className="p-3">
                    <Badge tone={o.payoutId ? "neutral" : o.status === "COMPLETED" ? "brand" : "saffron"}>{o.payoutId ? "تسویه شد" : SHOP_ORDER_STATUS_FA[o.status]}</Badge>
                  </td>
                  <td className="p-3"><Toman rial={itemsTotal(o)} /></td>
                  <td className="p-3 text-ink-soft">
                    − <Toman rial={commissionOf(o)} /> ({formatFaNumber(o.commissionBps / 100)}٪)
                  </td>
                  <td className="p-3"><Toman rial={o.shippingRial} /></td>
                  <td className="p-3 font-bold"><Toman rial={sellerNet(o)} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="p-4 text-start text-lg font-extrabold">تسویه‌ها</caption>
          <thead className="bg-surface-2 text-ink-soft">
            <tr>
              <th scope="col" className="p-3 text-start">شناسه</th>
              <th scope="col" className="p-3 text-start">تاریخ</th>
              <th scope="col" className="p-3 text-start">سفارش‌ها</th>
              <th scope="col" className="p-3 text-start">مبلغ</th>
              <th scope="col" className="p-3 text-start">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-3" dir="ltr">{p.id}</td>
                <td className="p-3"><JalaliDate date={p.date} /></td>
                <td className="p-3">{formatFaNumber(p.status === "SCHEDULED" ? available.length : p.orders)}</td>
                <td className="p-3 font-bold"><Toman rial={p.status === "SCHEDULED" ? nextAmount : p.amountRial} /></td>
                <td className="p-3"><Badge tone={p.status === "PAID" ? "brand" : p.status === "FAILED" ? "danger" : "saffron"}>{PAYOUT_FA[p.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
