"use client";

import { Button, cn, Field, Input } from "@nobar/ui";
import { Monitor, Moon, Sun, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { CityPicker } from "@/components/city-picker";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { simple, setSimple, theme, setTheme, user, updateUser, showToast } = useStore();
  const [name, setName] = useState("");
  useEffect(() => setName(user?.name ?? ""), [user?.name]);

  return (
    <AccountShell title="تنظیمات">
      {user ? (
        <form
          className="space-y-4 rounded-card border border-line bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            updateUser({ name: name.trim() });
            showToast("اطلاعات حساب ذخیره شد.");
          }}
        >
          <h2 className="font-extrabold">اطلاعات حساب</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی" htmlFor="pname">
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="شماره‌ی موبایل" htmlFor="pphone" hint="برای تغییر شماره با پشتیبانی تماس بگیرید">
              <Input id="pphone" value={user.phone} dir="ltr" className="text-end" disabled />
            </Field>
          </div>
          <Button type="submit">ذخیره</Button>
        </form>
      ) : null}

      <div className="space-y-5 rounded-card border border-line bg-surface p-5">
        <h2 className="font-extrabold">نمایش</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-bold">
              <Type className="size-5 text-brand" aria-hidden />
              حالت ساده
            </p>
            <p className="text-sm leading-7 text-ink-soft">متن درشت‌تر، گزینه‌های کمتر و دکمه‌ی بزرگ صوتی؛ برای سالمندان و کسانی که تازه خرید اینترنتی را شروع کرده‌اند.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simple}
            aria-label="حالت ساده"
            onClick={() => setSimple(!simple)}
            className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", simple ? "bg-brand" : "bg-line-strong")}
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
      </div>
    </AccountShell>
  );
}
