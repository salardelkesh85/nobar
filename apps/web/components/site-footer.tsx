"use client";

import { Button, Input, Logo } from "@nobar/ui";
import { BadgeCheck, Headphones, Leaf, ShieldCheck, Truck, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";

const SERVICES = [
  { icon: Leaf, title: "تاریخ برداشت روی هر محصول" },
  { icon: Truck, title: "فقط محصولی که تازه به شهرتان برسد" },
  { icon: ShieldCheck, title: "پرداخت امن با حساب امانی" },
  { icon: Undo2, title: "بازپرداخت اگر خراب رسید" },
  { icon: Headphones, title: "پشتیبانی هر روز" },
];

const COLUMNS: Array<[string, Array<[string, string]>]> = [
  ["خرید از نوبر", [["/categories", "دسته‌بندی‌ها"], ["/shops", "غرفه‌ها"], ["/season", "تقویم نوبر"], ["/compare?type=pomegranate", "مقایسه‌گر"], ["/baghboon", "باغبون، دستیار خرید"]]],
  ["خدمات مشتریان", [["/faq", "سؤالات متداول"], ["/orders", "پیگیری سفارش"], ["/about/escrow", "پرداخت امن و بازپرداخت"], ["/contact", "تماس با ما"]]],
  ["نوبر", [["/about", "درباره‌ی نوبر"], ["/terms", "قوانین و شرایط"], ["/privacy", "حریم خصوصی"], ["/about/credits", "منابع عکس‌ها"]]],
];

function Newsletter() {
  const { showToast } = useStore();
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return showToast("ایمیل درست نیست.");
        setEmail("");
        showToast("عضو خبرنامه شدید؛ نوبرهای هر فصل را خبرتان می‌کنیم.");
      }}
    >
      <label htmlFor="newsletter" className="sr-only">
        ایمیل
      </label>
      <Input id="newsletter" type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="text-end" />
      <Button type="submit" className="shrink-0">
        عضویت
      </Button>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4">
        <ul className="grid grid-cols-2 gap-4 border-b border-line py-8 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map(({ icon: Icon, title }) => (
            <li key={title} className="flex flex-col items-center gap-2 text-center text-xs text-ink-soft sm:text-sm">
              <Icon className="size-8 text-brand" strokeWidth={1.5} aria-hidden />
              {title}
            </li>
          ))}
        </ul>

        <div className="grid gap-8 py-10 text-sm text-ink-soft lg:grid-cols-[1.3fr_repeat(3,1fr)_1.4fr]">
          <div>
            <Logo subtitle="نوبرِ هر شهر، مستقیم از باغ" />
            <p className="mt-4 leading-7">بازار آنلاین میوه و سبزی تازه. باغدارها و میوه‌فروشی‌های هر شهر، محصول منطقه‌ی خودشان را مستقیم به شما می‌فروشند.</p>
          </div>
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h2 className="mb-3 font-bold text-ink">{title}</h2>
              <ul className="space-y-2">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-brand">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 font-bold text-ink">از نوبرهای هر فصل باخبر شوید</h2>
              <Newsletter />
            </div>
            <div>
              <h2 className="mb-2 font-bold text-ink">غرفه‌داران</h2>
              <Link href="/about/sell" className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline">
                در نوبر غرفه باز کنید
              </Link>
            </div>
            <ul className="flex gap-2" aria-label="نشان‌های اعتماد">
              {["نماد اعتماد الکترونیکی", "نشان ساماندهی"].map((t) => (
                <li key={t} className="flex size-20 flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line-strong p-1 text-center text-[0.62rem] leading-4">
                  <BadgeCheck className="size-5 text-ink-soft" aria-hidden />
                  {t}
                  <span className="text-[0.55rem]">(پس از راه‌اندازی)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <details className="group border-t border-line py-6 text-sm text-ink-soft">
          <summary className="cursor-pointer list-none font-bold text-ink">
            نوبر؛ میوه و سبزی تازه، مستقیم از باغ <span className="text-brand group-open:hidden">· بیشتر بخوانید</span>
          </summary>
          <div className="mt-3 space-y-3 leading-8">
            <p>
              نوبر بازار آنلاین چندفروشنده‌ی میوه و سبزی تازه است. به‌جای چند واسطه، خریدار مستقیم از باغدار، تعاونی یا میوه‌فروشی شهر مبدأ می‌خرد؛ مثلاً سیب و انگور
              بی‌دانه‌ی میاندوآب، انار ملس ساوه، کیوی آستارا، خرمای مضافتی بم یا گوجه‌فرنگی جیرفت.
            </p>
            <p>
              روی هر محصول تاریخ برداشت و تازه‌سنج نوشته شده و هر محصول فقط به شهرهایی عرضه می‌شود که تازه به آن‌ها برسد. قیمت تمام‌شده‌ی هر کیلو تا درِ خانه، مقایسه‌ی
              غرفه‌ها، تقویم فصل و خبر «نوبر شد!» کمک می‌کند بهترین محصول فصل را با قیمت منصفانه بخرید؛ و پول شما تا تحویل سالم نزد نوبر امانت می‌ماند.
            </p>
          </div>
        </details>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-ink-soft">
        نسخه‌ی نمایشی — داده‌ها و عکس‌ها نمونه است و پرداخت واقعی انجام نمی‌شود. © ۱۴۰۵ نوبر
      </p>
    </footer>
  );
}
