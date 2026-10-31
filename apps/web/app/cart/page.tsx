"use client";

import { cityName, etaPhrase, produceTypeById, REASON_FA } from "@nobar/demo";
import { Badge, ButtonLink, Card, EmptyState, Skeleton, Toman, Weight } from "@nobar/ui";
import { ShieldCheck, ShoppingBasket, Store, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { Stepper } from "@/components/actions";
import { useCartGroups } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/photo";
import { CheckoutSteps } from "@/components/checkout-steps";
import { ListingRail } from "@/components/listing-card";
import { search, type Shop, type ShippingMethodCode } from "@nobar/demo";
import { formatToman } from "@nobar/fa";

/** «X تومان تا ارسال رایگان» when the shop offers free shipping above a threshold for this method. */
function FreeShippingHint({ shop, method, itemsRial }: { shop: Shop; method: ShippingMethodCode; itemsRial: number }) {
  const rate = shop.shipping.find((r) => r.method === method);
  if (!rate?.freeOverRial || itemsRial >= rate.freeOverRial) return null;
  const pct = Math.min(100, (itemsRial / rate.freeOverRial) * 100);
  return (
    <div className="border-t border-line px-4 py-3 text-xs">
      <p className="mb-1.5">
        <span className="font-bold text-brand-strong">{formatToman(rate.freeOverRial - itemsRial)}</span> دیگر از همین غرفه بخرید تا ارسالش رایگان شود.
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Suggestions({ dest, exclude, title }: { dest: string; exclude: string[]; title: string }) {
  const hits = search({ dest, sort: "rating" }).hits.filter((h) => !exclude.includes(h.listing.id)).slice(0, 12);
  if (!hits.length) return null;
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <h2 className="px-4 pt-4 text-lg font-extrabold">{title}</h2>
      <ListingRail hits={hits} />
    </section>
  );
}

export default function CartPage() {
  const { ready, dest, setQty } = useStore();
  const { groups } = useCartGroups();

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!groups.length)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">سبد تازهٔ تو</h1>
        <EmptyState
          icon={<ShoppingBasket className="size-10" />}
          title="سبدتان هنوز خالی است"
          body="یک سر به نوبرهای این هفته بزنید."
          action={<ButtonLink href="/">دیدن نوبرهای این هفته</ButtonLink>}
        />
        <Suggestions dest={dest} exclude={[]} title="پیشنهاد نوبر برای شما" />
      </div>
    );

  const items = groups.reduce((s, g) => s + g.itemsRial, 0);
  const shipping = groups.reduce((s, g) => s + (g.options[0]?.costRial ?? 0), 0);
  const blocked = groups.some((g) => g.blocked.length > 0 || g.options.length === 0);

  return (
    <>
    <CheckoutSteps current={0} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <h1 className="text-xl font-extrabold">سبد خرید</h1>
        <p className="text-sm text-ink-soft">
          سفارش هر غرفه جدا آماده و ارسال می‌شود. ارسال به <span className="font-bold text-ink">{cityName(dest)}</span>.
        </p>
        {groups.map((g) => {
          const best = g.options[0];
          return (
            <Card key={g.shop.id} className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
                <Link href={`/shop/${g.shop.id}`} className="flex items-center gap-2 font-bold hover:text-brand">
                  <Store className="size-5 text-brand" aria-hidden />
                  {g.shop.name}
                  <span className="text-xs font-normal text-ink-soft">· {cityName(g.shop.cityId)}</span>
                </Link>
                {best ? (
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    <Truck className="size-4" aria-hidden />
                    {best.label} · {etaPhrase(best)}
                  </span>
                ) : null}
              </div>
              <ul className="divide-y divide-line">
                {g.lines.map((line) => {
                  const pt = produceTypeById(line.listing.produceTypeId)!;
                  const b = g.blocked.find((x) => x.line === line);
                  return (
                    <li key={line.pkg.id} className="flex gap-3 p-4">
                      <Photo kind={pt.id} alt="" className="size-20 shrink-0 rounded-control" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
                      <div className="flex flex-1 flex-col gap-1">
                        <Link href={`/l/${line.listing.id}`} className="font-bold leading-7 hover:text-brand">
                          {line.listing.title}
                        </Link>
                        <p className="text-sm text-ink-soft">{line.pkg.label}</p>
                        {b ? <Badge tone="danger">{REASON_FA[b.reason]}</Badge> : null}
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <Stepper value={line.qty} onChange={(v) => setQty(line.listing.id, line.pkg.id, v)} min={1} label={`تعداد ${line.pkg.label}`} />
                          <Toman rial={line.pkg.priceRial * line.qty} className="font-extrabold" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQty(line.listing.id, line.pkg.id, 0)}
                        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-danger-soft hover:text-danger"
                        aria-label={`حذف ${line.listing.title} از سبد`}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {best && best.costRial > 0 ? <FreeShippingHint shop={g.shop} method={best.method} itemsRial={g.itemsRial} /> : null}
              <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 text-sm">
                <span className="text-ink-soft">
                  وزن <Weight grams={g.grams} /> · ارسال {best ? (best.costRial ? <Toman rial={best.costRial} /> : "رایگان") : <span className="text-danger">ممکن نیست</span>}
                </span>
                <span>
                  جمع غرفه: <Toman rial={g.itemsRial + (best?.costRial ?? 0)} className="font-bold" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <Card className="space-y-3 p-5 shadow-none">
          <h2 className="text-lg font-extrabold">خلاصه‌ی سفارش</h2>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">کالاها</span>
            <Toman rial={items} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">ارسال ({groups.length.toLocaleString("fa-IR")} غرفه)</span>
            <Toman rial={shipping} />
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-black">
            <span>جمع</span>
            <Toman rial={items + shipping} />
          </div>
          {blocked ? <p className="rounded-control bg-danger-soft p-3 text-sm text-danger">چند قلم تا {cityName(dest)} تازه نمی‌رسد یا ارسال ندارد. آن‌ها را حذف کنید تا بتوانید ادامه دهید.</p> : null}
          <ButtonLink href="/checkout" size="lg" className={blocked ? "pointer-events-none w-full opacity-50" : "w-full"} aria-disabled={blocked}>
            ادامه و انتخاب آدرس
          </ButtonLink>
          <p className="flex gap-2 text-xs leading-6 text-ink-soft">
            <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden />
            پول شما تا پایان مهلت شکایت نزد نوبر امانت می‌ماند و بعد به غرفه‌دار پرداخت می‌شود.
          </p>
        </Card>
      </aside>
    </div>
    <div className="mt-6">
      <Suggestions dest={dest} exclude={groups.flatMap((g) => g.lines.map((l) => l.listing.id))} title="شاید این‌ها را هم بخواهید" />
    </div>
    </>
  );
}
