import { AUDIT_LOG, commissionOf, DISPUTES, itemsTotal, KYC_QUEUE, LISTINGS, MODERATION_QUEUE, PAYOUTS, SHOP_ORDERS, SHOP_ORDER_STATUS_FA, SHOP_ORDER_TONE, SHOPS, shopById } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Card, RelativeDay, Stat, Toman } from "@nobar/ui";
import { Bot } from "lucide-react";
import Link from "next/link";
import { Table } from "@/components/shell";

export default function AdminHome() {
  const live = SHOP_ORDERS.filter((o) => !["REJECTED", "EXPIRED", "CANCELLED"].includes(o.status));
  const gmv = live.reduce((s, o) => s + itemsTotal(o), 0);
  const commission = live.filter((o) => o.status === "COMPLETED").reduce((s, o) => s + commissionOf(o), 0);
  const failed = PAYOUTS.filter((p) => p.status === "FAILED");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">پیشخوان</h1>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="ارزش سفارش‌ها (نمونه)" value={<Toman rial={gmv} />} tone="brand" />
        <Stat label="کمیسیون قطعی" value={<Toman rial={commission} />} hint="فقط سفارش‌های تکمیل‌شده" />
        <Stat label="غرفه‌ی فعال" value={formatFaNumber(SHOPS.length)} hint={`${formatFaNumber(LISTINGS.length)} آگهی`} />
        <Stat label="تسویه‌ی ناموفق" value={formatFaNumber(failed.length)} tone={failed.length ? "nobar" : "neutral"} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/kyc", label: "منتظر تأیید هویت", n: KYC_QUEUE.length },
          { href: "/moderation", label: "منتظر بررسی محتوا", n: MODERATION_QUEUE.length },
          { href: "/disputes", label: "شکایت منتظر داوری", n: DISPUTES.filter((d) => d.status === "AWAITING_STAFF").length },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="flex items-center justify-between p-4 hover:border-brand">
              <span className="font-bold">{q.label}</span>
              <span className="text-2xl font-black text-nobar">{formatFaNumber(q.n)}</span>
            </Card>
          </Link>
        ))}
      </div>

      <Table caption="آخرین سفارش‌ها" head={["کد", "غرفه", "خریدار", "مبلغ کالا", "وضعیت"]}>
        {SHOP_ORDERS.slice(0, 8).map((o) => (
          <tr key={o.code}>
            <td dir="ltr" className="text-end">{o.code}</td>
            <td>{shopById(o.shopId)?.name}</td>
            <td>
              {o.buyerName} <span className="text-ink-soft" dir="ltr">{o.buyerPhoneMasked}</span>
            </td>
            <td><Toman rial={itemsTotal(o)} /></td>
            <td><Badge tone={SHOP_ORDER_TONE[o.status]}>{SHOP_ORDER_STATUS_FA[o.status]}</Badge></td>
          </tr>
        ))}
      </Table>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-extrabold">آخرین کارهای کارکنان</h2>
          <ul className="space-y-2 text-sm">
            {AUDIT_LOG.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>
                  <span className="font-bold">{a.actor}</span> — {a.action}: {a.subject}
                </span>
                <RelativeDay date={a.at} className="shrink-0 text-ink-soft" />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-extrabold">
            <Bot className="size-5 text-brand" aria-hidden />
            مصرف باغبون
          </h2>
          <p className="text-sm text-ink-soft">داشبورد مصرف، هزینه و کیفیت پاسخ‌های باغبون بعد از راه‌اندازی سرویس هوش مصنوعی اینجا نمایش داده می‌شود.</p>
        </Card>
      </div>
    </div>
  );
}
