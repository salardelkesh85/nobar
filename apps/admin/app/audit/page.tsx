import { AUDIT_LOG } from "@nobar/demo";
import { JalaliDate } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "گزارش ممیزی" };

export default function AuditPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">گزارش ممیزی</h1>
      <p className="text-sm text-ink-soft">هر کار کارکنان با وضعیت قبل و بعد ثبت می‌شود و قابل ویرایش یا حذف نیست.</p>
      <Table head={["شناسه", "زمان", "کاربر", "کار", "موضوع"]}>
        {AUDIT_LOG.map((a) => (
          <tr key={a.id}>
            <td dir="ltr" className="text-end">{a.id}</td>
            <td><JalaliDate date={a.at} format="datetime" /></td>
            <td>{a.actor}</td>
            <td>{a.action}</td>
            <td>{a.subject}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
