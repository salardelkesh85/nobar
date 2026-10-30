import { ButtonLink, Card } from "@nobar/ui";
import { Camera, Mic, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "در نوبر غرفه باز کنید" };

export default function SellPage() {
  const items = [
    { icon: Camera, title: "عکس بگیر، بگو، بفروش", body: "با چند عکس واقعی و یک پیام صوتی محصول را ثبت کنید؛ باغبون پیش‌نویس آگهی را می‌سازد و شما تأیید می‌کنید." },
    { icon: Wallet, title: "پرداخت تضمینی", body: "پول خریدار از قبل پرداخت شده؛ بعد از پایان مهلت شکایت، منهای کمیسیون به شبای شما واریز می‌شود." },
    { icon: ShieldCheck, title: "کمیسیون شفاف", body: "۸ تا ۱۲ درصد بسته به دسته‌ی محصول؛ بدون هزینه‌ی ثبت‌نام." },
    { icon: Mic, title: "مناسب باغ", body: "پنل غرفه‌دار برای گوشی ساخته شده: دکمه‌های بزرگ، فرم کوتاه، ذخیره‌ی خودکار." },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-black">باغ دارید؟ در نوبر غرفه باز کنید</h1>
      <p className="leading-8 text-ink-soft">باغدارها، تعاونی‌ها و میوه‌فروشی‌های هر شهر محصول منطقه‌ی خودشان را مستقیم به خریدارهای همه‌ی ایران می‌فروشند.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <Icon className="size-7 text-brand" aria-hidden />
            <h2 className="mt-2 font-extrabold">{title}</h2>
            <p className="mt-1 leading-7 text-ink-soft">{body}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-extrabold">مدارک لازم</h2>
        <p className="mt-1 leading-7 text-ink-soft">کارت ملی، شماره‌ی شبا به نام خودتان و چند عکس از باغ یا مغازه. کارشناس نوبر معمولاً ظرف یک روز کاری بررسی می‌کند.</p>
      </Card>
      <ButtonLink href="http://localhost:3001" size="lg">دیدن پنل غرفه‌دار (نمایشی)</ButtonLink>
    </div>
  );
}
