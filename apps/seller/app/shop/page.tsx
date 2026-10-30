"use client";

import { cityName, METHOD_FA, shopById, SHOP_TYPE_FA } from "@nobar/demo";
import { formatFaNumber, formatToman } from "@nobar/fa";
import { Badge, Button, Card, cn, Field, Input, Select, Textarea } from "@nobar/ui";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { useState } from "react";
import { SHOP_ID, useSeller } from "@/lib/state";

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export default function ShopSettingsPage() {
  const shop = shopById(SHOP_ID)!;
  const { showToast } = useSeller();
  const [story, setStory] = useState({ title: shop.story.title, body: shop.story.body.join("\n\n"), practices: shop.story.practices.join("، ") });
  const [days, setDays] = useState([true, true, true, true, true, true, false]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">{shop.name}</h1>
          <p className="text-ink-soft">
            {SHOP_TYPE_FA[shop.type]} · {cityName(shop.cityId)}{" "}
            <Badge tone="brand">
              <BadgeCheck className="size-3" aria-hidden /> هویت تأییدشده
            </Badge>
          </p>
        </div>
        <a href={`http://localhost:3000/shop/${shop.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
          دیدن غرفه در فروشگاه <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-extrabold">باغ‌نامه</h2>
        <p className="text-sm text-ink-soft">داستان باغ شما، با عکس واقعی. خریدارها به باغی اعتماد می‌کنند که می‌شناسند.</p>
        <Field label="عنوان" htmlFor="st">
          <Input id="st" value={story.title} onChange={(e) => setStory((s) => ({ ...s, title: e.target.value }))} />
        </Field>
        <Field label="داستان" htmlFor="sb">
          <Textarea id="sb" rows={7} value={story.body} onChange={(e) => setStory((s) => ({ ...s, body: e.target.value }))} />
        </Field>
        <Field label="روش کار (با ویرگول جدا کنید)" htmlFor="sp">
          <Input id="sp" value={story.practices} onChange={(e) => setStory((s) => ({ ...s, practices: e.target.value }))} />
        </Field>
        <Button onClick={() => showToast("باغ‌نامه ذخیره شد و پس از بررسی نمایش داده می‌شود.")}>ذخیره‌ی باغ‌نامه</Button>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-extrabold">زمان‌بندی</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="فاصله‌ی تأیید تا ارسال" htmlFor="hd">
            <Select id="hd" defaultValue={String(shop.handlingDays)}>
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "همان روز" : `${formatFaNumber(d)} روز`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="مهلت تأیید سفارش" htmlFor="sla" hint="حداکثر ۱۲ ساعت">
            <Select id="sla" defaultValue={String(shop.acceptanceSlaHours)}>
              {[2, 4, 6, 8, 12].map((h) => (
                <option key={h} value={h}>
                  {formatFaNumber(h)} ساعت
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">روزهای ارسال</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={days[i]}
                onClick={() => setDays((s) => s.map((x, j) => (j === i ? !x : x)))}
                className={cn("min-h-11 rounded-full border px-4 text-sm", days[i] ? "border-brand bg-brand-soft font-bold" : "border-line")}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-extrabold">روش‌های ارسال و هزینه</h2>
        <p className="text-sm text-ink-soft">نوبر فقط روش‌هایی را به خریدار نشان می‌دهد که محصول با آن‌ها تازه برسد.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th scope="col" className="p-2 text-start">روش</th>
                <th scope="col" className="p-2 text-start">پایه</th>
                <th scope="col" className="p-2 text-start">هر کیلو</th>
                <th scope="col" className="p-2 text-start">رایگان از</th>
                <th scope="col" className="p-2 text-start">حداکثر وزن</th>
              </tr>
            </thead>
            <tbody>
              {shop.shipping.map((r) => (
                <tr key={r.method} className="border-t border-line">
                  <td className="p-2 font-bold">{METHOD_FA[r.method]}</td>
                  <td className="p-2">{formatToman(r.baseRial)}</td>
                  <td className="p-2">{r.perKgRial ? formatToman(r.perKgRial) : "—"}</td>
                  <td className="p-2">{r.freeOverRial ? formatToman(r.freeOverRial) : "—"}</td>
                  <td className="p-2">{formatFaNumber(r.maxWeightGrams / 1000)} کیلو</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="text-lg font-extrabold">حساب تسویه</h2>
        <p className="text-sm">
          شبا: <span dir="ltr">IR•• •••• •••• •••• •••• ••33 81</span>
        </p>
        <p className="text-xs text-ink-soft">برای تغییر شبا باید دوباره هویت را تأیید کنید. شماره‌ی کامل شبا هیچ‌جا نمایش داده نمی‌شود.</p>
      </Card>
    </div>
  );
}
