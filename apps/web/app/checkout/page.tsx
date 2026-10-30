"use client";

import { cityName, etaPhrase, type ShippingMethodCode } from "@nobar/demo";
import { formatToman, toEnDigits } from "@nobar/fa";
import { Button, ButtonLink, Card, cn, EmptyState, Field, Input, JalaliDate, Skeleton, Textarea, Toman } from "@nobar/ui";
import { Check, CreditCard, Lock, ShieldCheck, ShoppingBasket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartGroups } from "@/lib/cart";
import { useStore } from "@/lib/store";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `NB-${part()}-${part()}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { ready, dest, clearCart, addOrder } = useStore();
  const { groups } = useCartGroups();
  const [methods, setMethods] = useState<Record<string, ShippingMethodCode>>({});
  const [form, setForm] = useState({ name: "", phone: "", line: "", postalCode: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!groups.length)
    return <EmptyState icon={<ShoppingBasket className="size-10" />} title="سبدتان خالی است" action={<ButtonLink href="/">بازگشت به فروشگاه</ButtonLink>} />;

  const chosen = (shopId: string) => {
    const g = groups.find((x) => x.shop.id === shopId)!;
    return g.options.find((o) => o.method === methods[shopId]) ?? g.options[0];
  };
  const items = groups.reduce((s, g) => s + g.itemsRial, 0);
  const shipping = groups.reduce((s, g) => s + (chosen(g.shop.id)?.costRial ?? 0), 0);
  const payable = items + shipping;

  const validate = () => {
    const e: Record<string, string> = {};
    const phone = toEnDigits(form.phone).replace(/\D/g, "");
    if (form.name.trim().length < 3) e.name = "نام و نام خانوادگی تحویل‌گیرنده را بنویسید.";
    if (!/^(0?9\d{9}|989\d{9})$/.test(phone)) e.phone = "شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.";
    if (form.line.trim().length < 10) e.line = "آدرس را کامل‌تر بنویسید.";
    if (!/^\d{10}$/.test(toEnDigits(form.postalCode).replace(/\D/g, ""))) e.postalCode = "کد پستی ۱۰ رقم است.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pay = () => {
    if (!validate()) return;
    setPaying(true);
    // Demo payment: the real flow redirects to the PSP and verifies server-side (docs/01 §8.1).
    window.setTimeout(() => {
      const c = code();
      addOrder({
        code: c,
        placedAt: new Date().toISOString(),
        destCityId: dest,
        address: { ...form, phone: toEnDigits(form.phone), postalCode: toEnDigits(form.postalCode) },
        shops: groups.map((g) => {
          const o = chosen(g.shop.id)!;
          return {
            shopId: g.shop.id,
            method: o.method,
            shippingRial: o.costRial,
            items: g.lines.map((l) => ({ listingId: l.listing.id, packageId: l.pkg.id, qty: l.qty, unitPriceRial: l.pkg.priceRial })),
          };
        }),
        payableRial: payable,
      });
      router.push(`/orders/${c}?paid=1`);
      window.setTimeout(clearCart, 400);
    }, 1400);
  };

  const upd = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <h1 className="text-2xl font-black">تکمیل خرید</h1>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-extrabold">۱. آدرس تحویل در {cityName(dest)}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام تحویل‌گیرنده" htmlFor="name" error={errors.name}>
              <Input id="name" autoComplete="name" value={form.name} onChange={upd("name")} />
            </Field>
            <Field label="شماره‌ی موبایل" htmlFor="phone" error={errors.phone} hint="برای هماهنگی تحویل">
              <Input id="phone" inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" value={form.phone} onChange={upd("phone")} placeholder="۰۹۱۲…" />
            </Field>
          </div>
          <Field label="آدرس" htmlFor="line" error={errors.line}>
            <Textarea id="line" rows={2} autoComplete="street-address" value={form.line} onChange={upd("line")} />
          </Field>
          <Field label="کد پستی" htmlFor="postal" error={errors.postalCode}>
            <Input id="postal" inputMode="numeric" dir="ltr" className="text-end sm:max-w-56" value={form.postalCode} onChange={upd("postalCode")} />
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-extrabold">۲. روش ارسال هر غرفه</h2>
          {groups.map((g) => (
            <fieldset key={g.shop.id} className="space-y-2">
              <legend className="mb-1 font-bold">
                {g.shop.name} <span className="text-sm font-normal text-ink-soft">· {g.lines.length.toLocaleString("fa-IR")} قلم</span>
              </legend>
              {g.options.map((o) => {
                const active = chosen(g.shop.id)?.method === o.method;
                return (
                  <label key={o.method} className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2", active ? "border-brand bg-brand-soft" : "border-line")}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name={`m-${g.shop.id}`} checked={active} onChange={() => setMethods((m) => ({ ...m, [g.shop.id]: o.method }))} className="size-4 accent-[var(--brand)]" />
                      <span>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-xs text-ink-soft">
                          {etaPhrase(o)} (تا <JalaliDate date={o.etaTo} format="short" />) · {o.freshOnArrivalDays.toLocaleString("fa-IR")} روز تازگی هنگام رسیدن
                        </span>
                      </span>
                    </span>
                    <span className="font-bold">{o.costRial ? formatToman(o.costRial) : "رایگان"}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-extrabold">۳. پرداخت</h2>
          <div className="flex items-center gap-3 rounded-control border border-brand bg-brand-soft p-3">
            <CreditCard className="size-6 text-brand" aria-hidden />
            <div>
              <p className="font-bold">درگاه پرداخت (نمایشی)</p>
              <p className="text-xs text-ink-soft">در نسخه‌ی واقعی به درگاه بانکی منتقل می‌شوید؛ اینجا پرداخت شبیه‌سازی می‌شود.</p>
            </div>
            <Check className="ms-auto size-5 text-brand" aria-hidden />
          </div>
          <div className="flex gap-3 rounded-control bg-surface-2 p-3 text-sm leading-7">
            <ShieldCheck className="size-5 shrink-0 text-brand" aria-hidden />
            <p>
              <span className="font-bold">حساب امانی نوبر: </span>
              پول شما تا پایان مهلت شکایت (۲۴ تا ۴۸ ساعت بعد از تحویل) نزد نوبر می‌ماند. اگر غرفه‌دار سفارش را تأیید نکند، کل مبلغ به کیف پولتان برمی‌گردد.
            </p>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-extrabold">مبلغ قابل پرداخت</h2>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">کالاها</span>
            <Toman rial={items} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">ارسال</span>
            <Toman rial={shipping} />
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-black">
            <span>جمع</span>
            <Toman rial={payable} />
          </div>
          <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
            <Lock className="size-5" aria-hidden />
            {paying ? "در حال انتقال به درگاه…" : `پرداخت ${formatToman(payable)}`}
          </Button>
          <p className="text-center text-xs text-ink-soft">با زدن دکمه، سفارش و پرداخت را تأیید می‌کنید.</p>
        </Card>
      </aside>
    </div>
  );
}
