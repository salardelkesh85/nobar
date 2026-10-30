import { PAYOUTS, shopById } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Card, JalaliDate, Toman } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "تسویه‌ها" };
const FA = { SCHEDULED: "زمان‌بندی‌شده", PAID: "واریز شد", FAILED: "ناموفق" } as const;

export default function PayoutsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">تسویه‌ها</h1>
      <Card className="p-4 text-sm leading-7 text-ink-soft">
        هر تسویه یک تراکنش دوطرفه در دفتر حسابداری است: بدهکار «حساب امانی غرفه»، بستانکار «بانک». تسویه‌ی ناموفق دوباره صف می‌شود و مبلغ در حساب غرفه می‌ماند.
      </Card>
      <Table head={["شناسه", "غرفه", "تاریخ", "سفارش‌ها", "مبلغ", "شبا", "وضعیت"]}>
        {PAYOUTS.map((p) => (
          <tr key={p.id}>
            <td dir="ltr" className="text-end">{p.id}</td>
            <td>{shopById(p.shopId)?.name}</td>
            <td><JalaliDate date={p.date} /></td>
            <td>{formatFaNumber(p.orders)}</td>
            <td><Toman rial={p.amountRial} /></td>
            <td dir="ltr" className="text-end">IR…{p.shebaLast4}</td>
            <td><Badge tone={p.status === "PAID" ? "brand" : p.status === "FAILED" ? "danger" : "saffron"}>{FA[p.status]}</Badge></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
