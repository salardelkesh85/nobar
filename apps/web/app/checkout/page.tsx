"use client";

import { cityName, etaPhrase, produceTypeById, type ShippingMethodCode } from "@nobar/demo";
import { Photo } from "@/components/photo";
import { formatToman, toFaDigits } from "@nobar/fa";
import { Button, ButtonLink, Card, cn, EmptyState, Field, Input, JalaliDate, Skeleton, Textarea, Toman } from "@nobar/ui";
import { Check, CreditCard, Lock, MapPin, Plus, ShieldCheck, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { AddressForm, emptyAddress } from "@/components/address-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartGroups } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { CheckoutSteps } from "@/components/checkout-steps";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `NB-${part()}-${part()}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { ready, dest, clearCart, addOrder, addresses, saveAddress, user, showToast } = useStore();
  const { groups } = useCartGroups();
  const [methods, setMethods] = useState<Record<string, ShippingMethodCode>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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

  const cityAddresses = addresses.filter((x) => x.cityId === dest);
  const address = cityAddresses.find((x) => x.id === selected) ?? cityAddresses[0];

  const pay = () => {
    if (!address) {
      showToast("اول آدرس تحویل را ثبت کنید.");
      return;
    }
    setPaying(true);
    // Demo payment: the real flow redirects to the PSP and verifies server-side (docs/01 §8.1).
    window.setTimeout(() => {
      const c = code();
      addOrder({
        code: c,
        placedAt: new Date().toISOString(),
        destCityId: dest,
        address: { name: address.name, phone: address.phone, line: address.line, postalCode: address.postalCode },
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
      router.push(`/order?code=${c}&paid=1`);
      window.setTimeout(clearCart, 400);
    }, 1400);
  };


  return (
    <>
    <CheckoutSteps current={1} />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <h1 className="text-xl font-extrabold">تکمیل خرید</h1>

        <Card className="space-y-4 p-5 shadow-none">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">۱. آدرس تحویل در {cityName(dest)}</h2>
            {cityAddresses.length && !adding ? (
              <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden />
                آدرس جدید
              </Button>
            ) : null}
          </div>
          {!user ? (
            <p className="rounded-control bg-surface-2 p-3 text-sm">
              <Link href="/login?next=/checkout" className="font-bold text-brand hover:underline">وارد شوید</Link> تا آدرس‌ها و سفارش‌هایتان در حساب شما بماند؛ خرید مهمان هم ممکن است.
            </p>
          ) : null}
          {cityAddresses.length && !adding ? (
            <div role="radiogroup" aria-label="آدرس تحویل" className="space-y-2">
              {cityAddresses.map((x) => {
                const on = x.id === address?.id;
                return (
                  <label key={x.id} className={cn("flex cursor-pointer gap-3 rounded-control border p-3", on ? "border-brand bg-brand-soft" : "border-line")}>
                    <input type="radio" name="address" checked={on} onChange={() => setSelected(x.id)} className="mt-1 size-4 accent-[var(--brand)]" />
                    <span className="text-sm">
                      <span className="flex items-center gap-1 font-bold">
                        <MapPin className="size-4 text-brand" aria-hidden />
                        {x.title}
                      </span>
                      <span className="block leading-7">{x.line}</span>
                      <span className="block text-xs text-ink-soft">
                        {x.name} · <span dir="ltr">{toFaDigits(x.phone)}</span> · کد پستی {toFaDigits(x.postalCode)}
                      </span>
                    </span>
                  </label>
                );
              })}
              <Link href="/me/addresses" className="inline-block text-xs text-brand hover:underline">مدیریت آدرس‌ها</Link>
            </div>
          ) : (
            <AddressForm
              key={dest}
              initial={emptyAddress(dest, user?.name ?? "", user?.phone ?? "")}
              submitLabel="ثبت این آدرس"
              onCancel={cityAddresses.length ? () => setAdding(false) : undefined}
              onSave={(a) => {
                saveAddress({ ...a, cityId: dest });
                setSelected(a.id);
                setAdding(false);
                showToast("آدرس ثبت شد.");
              }}
            />
          )}
          {addresses.length > cityAddresses.length ? (
            <p className="text-xs text-ink-soft">آدرس‌های شهرهای دیگر اینجا نمایش داده نمی‌شوند؛ برای ارسال به آن‌ها، شهر مقصد را از بالای صفحه عوض کنید.</p>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5 shadow-none">
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

        <Card className="space-y-3 p-5 shadow-none">
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

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <Card className="space-y-3 p-5 shadow-none">
          <h2 className="text-lg font-extrabold">مبلغ قابل پرداخت</h2>
          <ul className="flex flex-wrap gap-2" aria-label="اقلام سفارش">
            {groups.flatMap((g) => g.lines).map((l) => {
              const pt = produceTypeById(l.listing.produceTypeId)!;
              return (
                <li key={l.pkg.id} className="relative">
                  <Photo kind={pt.id} alt={l.listing.title} sizes="48px" className="size-12 rounded-control" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
                  <span className="absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] font-bold text-bg">{toFaDigits(l.qty)}</span>
                </li>
              );
            })}
          </ul>
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
    </>
  );
}
