import { Card } from "@nobar/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "پرداخت امن و حساب امانی" };

const STEPS = [
  ["شما پرداخت می‌کنید", "پول به حساب امانی نوبر می‌رود، نه مستقیم به غرفه‌دار."],
  ["غرفه‌دار تأیید و ارسال می‌کند", "اگر در مهلت تأیید نکند یا رد کند، کل مبلغ آن غرفه به کیف پول شما برمی‌گردد."],
  ["شما تحویل می‌گیرید", "از لحظه‌ی تحویل، مهلت شکایت شروع می‌شود: ۲۴ ساعت برای بیشتر میوه‌ها و ۴۸ ساعت برای محصولات ماندگار مثل سیب‌زمینی و خرما."],
  ["اگر مشکلی بود", "با عکس گزارش دهید؛ غرفه‌دار ۱۲ ساعت فرصت پاسخ دارد و اگر توافق نشد، کارشناس نوبر داوری می‌کند."],
  ["تسویه با غرفه‌دار", "بعد از پایان مهلت شکایت، مبلغ منهای کمیسیون نوبر به حساب غرفه‌دار پرداخت می‌شود."],
];

export default function EscrowPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-black">پرداخت امن و حساب امانی</h1>
      <p className="leading-8 text-ink-soft">میوه و سبزی زود خراب می‌شود؛ برای همین در نوبر پول شما تا وقتی محصول سالم به دستتان نرسیده، نزد نوبر می‌ماند.</p>
      <ol className="space-y-3">
        {STEPS.map(([t, b], i) => (
          <li key={t}>
            <Card className="flex gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand font-black text-on-brand">{(i + 1).toLocaleString("fa-IR")}</span>
              <div>
                <h2 className="font-extrabold">{t}</h2>
                <p className="mt-1 leading-7 text-ink-soft">{b}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <p className="text-sm text-ink-soft">همه‌ی جابه‌جایی‌های پول در دفتر حسابداری دوطرفه‌ی نوبر ثبت می‌شود تا هر ریال قابل پیگیری باشد.</p>
    </div>
  );
}
