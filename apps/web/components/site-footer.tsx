"use client";

import { Button, Input, Logo } from "@nobar/ui";
import { CalendarDays, Headphones, Leaf, MapPin, Scale, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";

const SERVICES = [
  { icon: Leaf, title: "نمایش نشان تازگی محصول" },
  { icon: MapPin, title: "شناخت شهر و مبدأ عرضه" },
  { icon: Truck, title: "مشاهده‌ی هزینه تا مقصد" },
  { icon: Scale, title: "مقایسه‌ی غرفه‌ها و قیمت‌ها" },
  { icon: CalendarDays, title: "راهنمای فصل و محصولات" },
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
    <form className="flex gap-2" onSubmit={(e) => {
      e.preventDefault();
      if (!/^\\S+@\\S+\\.\\S+$/.test(email.trim())) return showToast("ایمیل درست نیست.");
      setEmail("");
      showToast("عضو خبرنامه شدید؛ نوبرهای هر فصل را خبرتان می‌کنیم.");
    }}>
      <label htmlFor="newsletter" className="sr-only">ایمیل</label>
      <Input id="newsletter" type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="nobar-newsletter-input text-end" />
      <Button type="submit" className="nobar-newsletter-button shrink-0">عضویت</Button>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer className="nobar-footer pb-20 md:pb-0">
      <div className="nobar-footer-inner mx-auto max-w-[1480px] px-4">
        <div className="nobar-footer-top">
          <div>
            <span className="nobar-footer-kicker">نوبر؛ بازار تازه‌ی ایران</span>
            <h2 className="nobar-footer-title">از دلِ باغ، نزدیک‌تر به زندگی.</h2>
            <p className="nobar-footer-intro">بازاری برای کشف محصولات فصل، شناخت مبدأها و خرید آگاهانه از غرفه‌های شهرهای مختلف.</p>
          </div>
          <Link href="/about/sell" className="nobar-footer-seller-link"><Store className="size-4" /> غرفه‌دار شو <span>←</span></Link>
        </div>

        <ul className="nobar-footer-benefits">
          {SERVICES.map(({ icon: Icon, title }) => (
            <li key={title}><Icon className="size-5" strokeWidth={1.7} aria-hidden /><span>{title}</span></li>
          ))}
        </ul>

        <div className="nobar-footer-grid">
          <div className="nobar-footer-brand">
            <span className="nobar-footer-logo"><Logo subtitle="تازه، مستقیم از باغ" /></span>
            <p className="mt-4 max-w-xs text-sm leading-8">نوبر کمک می‌کند محصول را با شناخت بهتر انتخاب کنی؛ از شهر و غرفه‌ی عرضه‌کننده تا نشان تازگی و قیمت تا مقصد.</p>
            <div className="nobar-footer-note"><Headphones className="size-4" /> همراهت در مسیر یک انتخاب تازه</div>
          </div>

          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h3 className="nobar-footer-column-title">{title}</h3>
              <ul className="space-y-3">
                {links.map(([href, label]) => <li key={href}><Link href={href} className="nobar-footer-link">{label}</Link></li>)}
              </ul>
            </div>
          ))}

          <div className="space-y-4">
            <div>
              <h3 className="nobar-footer-column-title">از نوبرهای هر فصل باخبر شو</h3>
              <p className="mb-3 text-xs leading-6 text-white/65">خبر طعم‌های تازه و انتخاب‌های فصلی را دریافت کن.</p>
              <Newsletter />
            </div>
            <div className="nobar-footer-mini-card">
              <span className="nobar-footer-mini-icon"><Leaf className="size-5" /></span>
              <span><strong>تازه‌تر انتخاب کن</strong><small>مبدأ، تازگی و قیمت را کنار هم ببین.</small></span>
            </div>
          </div>
        </div>

        <details className="nobar-footer-about">
          <summary>نوبر؛ میوه و سبزی تازه، مستقیم از مبدأ <span>بیشتر بخوانید</span></summary>
          <div className="mt-3 space-y-3 leading-8">
            <p>نوبر بازار آنلاین چندفروشنده‌ی میوه و سبزی تازه است. به‌جای چند واسطه، خریدار می‌تواند غرفه‌ها و محصولات شهرهای مختلف را پیدا کند؛ از سیب و انگور میاندوآب تا انار ساوه، کیوی آستارا و خرمای مضافتی بم.</p>
            <p>نمایش شهر مبدأ، نشان تازگی، قیمت محصول و هزینه‌ی ارسال تا مقصد کمک می‌کند انتخابی آگاهانه‌تر داشته باشی؛ و با ابزار مقایسه، پیشنهادهای غرفه‌ها را کنار هم ببینی.</p>
          </div>
        </details>
      </div>
      <div className="nobar-footer-bottom">
        <div className="mx-auto flex max-w-[1480px] flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:text-start">
          <span>© ۱۴۰۵ نوبر · همه‌ی حقوق محفوظ است.</span>
          <span className="nobar-demo-disclaimer">نسخه‌ی نمایشی؛ داده‌ها و عکس‌ها نمونه‌اند و پرداخت واقعی انجام نمی‌شود.</span>
        </div>
      </div>
    </footer>
  );
}
