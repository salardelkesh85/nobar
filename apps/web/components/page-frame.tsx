"use client";

import { ArrowUpLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SECTIONS: Record<string, { label: string; note: string; tone: string }> =
  {
    search: {
      label: "بازار تازه‌ها",
      note: "طعم خوب، با انتخاب تو شروع می‌شود.",
      tone: "catalog",
    },
    categories: {
      label: "کشف طعم‌ها",
      note: "هر دسته، یک دنیای تازه.",
      tone: "categories",
    },
    p: {
      label: "انتخاب محصول",
      note: "یک محصول، چند مبدأ؛ انتخاب با تو.",
      tone: "produce",
    },
    l: {
      label: "از مبدأ تا سفره",
      note: "تازگی در جزئیات است.",
      tone: "product",
    },
    shops: {
      label: "آدم‌های نوبر",
      note: "پشت هر طعم خوب، یک آدم واقعی است.",
      tone: "shops",
    },
    shop: {
      label: "غرفه‌گردی",
      note: "قصهٔ آدم‌ها، طعمِ محصول‌ها.",
      tone: "shop",
    },
    origin: {
      label: "سرزمین طعم‌ها",
      note: "ایران را به طعم‌هایش بشناس.",
      tone: "origin",
    },
    season: {
      label: "هم‌فصل طبیعت",
      note: "هر طعم، در وقت خودش.",
      tone: "season",
    },
    compare: {
      label: "انتخاب آگاهانه",
      note: "همهٔ جزئیات، کنار هم.",
      tone: "compare",
    },
    cart: {
      label: "سبد تازهٔ تو",
      note: "یک قدم نزدیک‌تر به سفره.",
      tone: "cart",
    },
    checkout: {
      label: "آخرین قدم خرید",
      note: "جزئیات تحویل را با هم مرور کنیم.",
      tone: "checkout",
    },
    me: { label: "نوبرِ من", note: "گوشهٔ شخصی تو در بازار.", tone: "account" },
    orders: {
      label: "خریدهای تو",
      note: "از لحظهٔ انتخاب تا رسیدن.",
      tone: "account",
    },
    order: {
      label: "مسیر سفارش",
      note: "تازه‌ها در چه مرحله‌ای هستند؟",
      tone: "order",
    },
    login: {
      label: "خوش آمدی",
      note: "به جمع دوست‌داران طعم‌های واقعی بپیوند.",
      tone: "login",
    },
    baghboon: {
      label: "هم‌صحبت خرید",
      note: "از چی خوشَت می‌آید؟",
      tone: "assistant",
    },
  };

export function PageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const segment = pathname.split("/")[1] || "";
  if (!segment)
    return (
      <div className="studio-page" data-page="home">
        {children}
      </div>
    );
  const section = SECTIONS[segment] ?? {
    label: "دربارهٔ نوبر",
    note: "خرید خوب، با شناخت شروع می‌شود.",
    tone: "info",
  };
  if (section.tone === "product")
    return (
      <div className="studio-page" data-page="product">
        {children}
      </div>
    );
  return (
    <div className="studio-page" data-page={section.tone}>
      <div className="studio-page-context">
        <nav aria-label="مسیر سایت">
          <Link href="/">نوبر</Link>
          <ChevronLeft size={13} aria-hidden />
          <span>{section.label}</span>
        </nav>
        <span>
          {section.note}
          <ArrowUpLeft size={14} aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}
