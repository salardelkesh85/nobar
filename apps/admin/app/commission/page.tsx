import { COMMISSION_RULES } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Card } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "کمیسیون" };

export default function CommissionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">قاعده‌های کمیسیون</h1>
      <Card className="p-4 text-sm leading-7 text-ink-soft">
        دقیق‌ترین قاعده‌ی فعال برنده است (غرفه، بعد دسته، بعد سراسری). نرخ در لحظه‌ی ثبت سفارش روی آن ثبت می‌شود و تغییر بعدی روی سفارش‌های قبلی اثر ندارد.
      </Card>
      <Table head={["دامنه", "نرخ"]}>
        {COMMISSION_RULES.map((r) => (
          <tr key={r.scope}>
            <td>{r.scope}</td>
            <td className="font-bold">{formatFaNumber(r.rateBps / 100)}٪</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
