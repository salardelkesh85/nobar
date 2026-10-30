import { categoryById, JALALI_MONTHS, PRODUCE_TYPES } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "انواع محصول و فصل" };
const STORAGE_FA = { AMBIENT: "دمای اتاق", COOL: "خنک", COLD: "زنجیره‌ی سرد" } as const;

export default function TaxonomyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">انواع محصول و فصل</h1>
      <p className="text-sm text-ink-soft">
        این اعداد قاعده‌های تازه‌سنج و ارسال هوشمند را می‌سازند. همه‌ی مقادیر اولیه تقریبی است و تا تأیید کارشناس «نیاز به بازبینی» دارد.
      </p>
      <Table head={["نوع محصول", "دسته", "عمر تازگی", "حداقل تازگی هنگام رسیدن", "نگهداری", "مهلت شکایت", "فصل", "وضعیت"]}>
        {PRODUCE_TYPES.map((p) => (
          <tr key={p.id}>
            <td className="font-bold">{p.name}</td>
            <td>{categoryById(p.categoryId)?.name}</td>
            <td>{formatFaNumber(p.shelfLifeDays)} روز</td>
            <td>{formatFaNumber(p.minShelfDaysOnArrival)} روز</td>
            <td>{STORAGE_FA[p.storage]}</td>
            <td>{formatFaNumber(p.complaintWindowHours)} ساعت</td>
            <td className="text-xs">{p.months.length === 12 ? "همه‌ی سال" : p.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")}</td>
            <td>{p.needsReview ? <Badge tone="saffron">نیاز به بازبینی</Badge> : <Badge tone="brand">تأییدشده</Badge>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
