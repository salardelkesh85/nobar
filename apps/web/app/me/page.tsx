"use client";

import { Card, cn, Toman } from "@nobar/ui";
import { Bell, ChevronLeft, Monitor, Moon, Receipt, Store, Sun, Type, Wallet } from "lucide-react";
import Link from "next/link";
import { CityPicker } from "@/components/city-picker";
import { useStore } from "@/lib/store";

export default function MePage() {
  const { simple, setSimple, theme, setTheme, orders } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="flex items-center gap-4 p-5 shadow-none">
        <div className="grid size-14 place-items-center rounded-full bg-brand-soft text-2xl" aria-hidden>
          👤
        </div>
        <div className="flex-1">
          <p className="text-lg font-extrabold">مهمان نوبر</p>
          <p className="text-sm text-ink-soft">ورود با کد پیامکی در نسخه‌ی بعدی فعال می‌شود.</p>
        </div>
      </Card>

      <Card className="divide-y divide-line shadow-none">
        {[
          { href: "/orders", icon: Receipt, label: "سفارش‌های من", extra: orders.length ? `${orders.length.toLocaleString("fa-IR")} سفارش` : undefined },
          { href: "/season", icon: Bell, label: "خبرهای «نوبر شد!»", extra: "از تقویم نوبر انتخاب کنید" },
          { href: "/about/sell", icon: Store, label: "غرفه باز کنید" },
        ].map(({ href, icon: Icon, label, extra }) => (
          <Link key={href} href={href} className="flex min-h-14 items-center gap-3 px-5 hover:bg-surface-2">
            <Icon className="size-5 text-brand" aria-hidden />
            <span className="flex-1 font-bold">{label}</span>
            {extra ? <span className="text-sm text-ink-soft">{extra}</span> : null}
            <ChevronLeft className="size-5 text-ink-soft" aria-hidden />
          </Link>
        ))}
        <div className="flex min-h-14 items-center gap-3 px-5">
          <Wallet className="size-5 text-brand" aria-hidden />
          <span className="flex-1 font-bold">کیف پول</span>
          <Toman rial={0} className="text-sm text-ink-soft" />
        </div>
      </Card>

      <Card className="space-y-5 p-5 shadow-none">
        <h2 className="text-lg font-extrabold">تنظیمات</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-bold">
              <Type className="size-5 text-brand" aria-hidden />
              حالت ساده
            </p>
            <p className="text-sm text-ink-soft">متن درشت‌تر، گزینه‌های کمتر و دکمه‌ی بزرگ صوتی؛ برای سالمندان و کسانی که تازه خرید اینترنتی را شروع کرده‌اند.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simple}
            aria-label="حالت ساده"
            onClick={() => setSimple(!simple)}
            className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", simple ? "bg-brand" : "bg-line")}
          >
            <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", simple ? "start-7" : "start-1")} />
          </button>
        </div>
        <div>
          <p className="mb-2 font-bold">ظاهر</p>
          <div role="radiogroup" aria-label="ظاهر" className="grid grid-cols-3 gap-2">
            {(
              [
                ["system", "مثل گوشی", Monitor],
                ["light", "روشن", Sun],
                ["dark", "تیره", Moon],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={theme === v}
                onClick={() => setTheme(v)}
                className={cn("flex min-h-12 items-center justify-center gap-2 rounded-control border text-sm", theme === v ? "border-brand bg-brand-soft font-bold" : "border-line")}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-bold">شهر مقصد پیش‌فرض</p>
          <CityPicker />
        </div>
      </Card>
    </div>
  );
}
