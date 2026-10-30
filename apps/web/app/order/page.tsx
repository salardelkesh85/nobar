"use client";

import { cityName, listingById, METHOD_FA, produceTypeById, SHOP_ORDER_STATUS_FA, shopById, type ShopOrderStatus } from "@nobar/demo";
import { formatToman, toFaDigits } from "@nobar/fa";
import { Badge, Button, ButtonLink, Card, cn, EmptyState, JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { CircleCheck, PartyPopper, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DisputeForm } from "@/components/dispute-form";
import { Suspense, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/photo";

const FLOW: ShopOrderStatus[] = ["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "COMPLETED"];
const STEP_FA: Record<string, string> = {
  AWAITING_ACCEPTANCE: "پرداخت شد",
  ACCEPTED: "تأیید غرفه",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  COMPLETED: "پایان مهلت شکایت",
};
const KEY = "nobar_order_status";

function OrderView() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const paid = params.get("paid") === "1";
  const { ready, orders, showToast } = useStore();
  const [status, setStatus] = useState<Record<string, ShopOrderStatus>>({});
  const [disputing, setDisputing] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStatus(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, ShopOrderStatus>);
    } catch {
      /* ignore */
    }
  }, []);
  const save = (k: string, s: ShopOrderStatus) => {
    const next = { ...status, [k]: s };
    setStatus(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;
  const order = orders.find((o) => o.code === code);
  if (!order) return <EmptyState title="این سفارش پیدا نشد" action={<ButtonLink href="/orders">سفارش‌های من</ButtonLink>} />;

  return (
    <div className="space-y-5">
      {paid ? (
        <div className="flex items-center gap-3 rounded-card border border-brand/40 bg-brand-soft p-4">
          <PartyPopper className="size-8 text-brand" aria-hidden />
          <div>
            <p className="font-extrabold">پرداخت انجام شد. سفارش شما برای غرفه‌دارها فرستاده شد.</p>
            <p className="text-sm text-ink-soft">هر غرفه باید در مهلت مشخص سفارش را تأیید کند؛ وگرنه مبلغ آن غرفه به کیف پولتان برمی‌گردد.</p>
          </div>
        </div>
      ) : null}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">
            سفارش <span dir="ltr">{order.code}</span>
          </h1>
          <p className="text-sm text-ink-soft">
            <JalaliDate date={order.placedAt} format="datetime" /> · {order.address.name} · {cityName(order.destCityId)}
          </p>
        </div>
        <p className="text-lg font-black">
          <Toman rial={order.payableRial} />
        </p>
      </header>
      <div className="grid gap-3 rounded-card border border-line bg-surface p-4 text-sm sm:grid-cols-3">
        <p>
          <span className="block text-xs text-ink-soft">تحویل‌گیرنده</span>
          {order.address.name} · <span dir="ltr">{toFaDigits(order.address.phone)}</span>
        </p>
        <p className="sm:col-span-2">
          <span className="block text-xs text-ink-soft">آدرس</span>
          {cityName(order.destCityId)}، {order.address.line} · کد پستی {toFaDigits(order.address.postalCode)}
        </p>
      </div>

      {order.shops.map((s) => {
        const shop = shopById(s.shopId)!;
        const k = `${order.code}:${s.shopId}`;
        const st = status[k] ?? "AWAITING_ACCEPTANCE";
        const idx = FLOW.indexOf(st);
        return (
          <Card key={s.shopId} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
              <p className="font-bold">{shop.name}</p>
              <Badge tone={st === "DISPUTED" ? "nobar" : st === "COMPLETED" ? "neutral" : "brand"}>{SHOP_ORDER_STATUS_FA[st]}</Badge>
            </div>
            <ol className="flex gap-1 overflow-x-auto px-4 py-4 scrollbar-none" aria-label="مراحل سفارش">
              {FLOW.map((f, i) => (
                <li key={f} className="flex min-w-20 flex-1 flex-col items-center gap-1 text-center">
                  <span className={cn("grid size-8 place-items-center rounded-full text-sm font-bold", i <= idx ? "bg-brand text-on-brand" : "bg-surface-2 text-ink-soft")}>
                    {i < idx || (i === idx && st === "COMPLETED") ? <CircleCheck className="size-5" aria-hidden /> : toFaDigits(i + 1)}
                  </span>
                  <span className={cn("text-xs", i <= idx ? "font-bold" : "text-ink-soft")}>{STEP_FA[f]}</span>
                  {i === idx ? <span className="sr-only">(مرحله‌ی فعلی)</span> : null}
                </li>
              ))}
            </ol>
            <ul className="divide-y divide-line border-t border-line">
              {s.items.map((it) => {
                const l = listingById(it.listingId);
                const pt = l ? produceTypeById(l.produceTypeId) : undefined;
                const pkg = l?.packages.find((p) => p.id === it.packageId);
                return (
                  <li key={it.packageId} className="flex items-center gap-3 px-4 py-3">
                    {pt ? <Photo kind={pt.id} alt="" className="size-12 shrink-0 rounded-control" fallback={{ emoji: pt.emoji, hue: pt.hue }} /> : null}
                    <div className="flex-1 text-sm">
                      <p className="font-bold">{l?.title}</p>
                      <p className="text-ink-soft">
                        {toFaDigits(it.qty)} × {pkg?.label}
                      </p>
                    </div>
                    <Toman rial={it.unitPriceRial * it.qty} />
                  </li>
                );
              })}
            </ul>
            <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
              <p className="text-ink-soft">
                {METHOD_FA[s.method as keyof typeof METHOD_FA]} · ارسال {s.shippingRial ? formatToman(s.shippingRial) : "رایگان"}
              </p>
              {st === "DELIVERED" ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { save(k, "COMPLETED"); showToast("ممنون! پول غرفه‌دار آزاد شد."); }}>همه‌چیز خوب بود</Button>
                  <Button variant="danger" onClick={() => setDisputing(k)}>
                    گزارش مشکل (خراب، کم‌وزن…)
                  </Button>
                </div>
              ) : null}
              {st === "DELIVERED" && disputing === k ? (
                <DisputeForm
                  onCancel={() => setDisputing(null)}
                  onSubmit={(summary) => {
                    save(k, "DISPUTED");
                    setDisputing(null);
                    showToast(`گزارش ثبت شد: ${summary}. غرفه‌دار تا ۱۲ ساعت پاسخ می‌دهد.`);
                  }}
                />
              ) : null}
              {st === "AWAITING_ACCEPTANCE" ? (
                <button type="button" className="text-xs font-bold text-danger hover:underline" onClick={() => { save(k, "CANCELLED"); showToast("سفارش این غرفه لغو شد؛ مبلغ آن به کیف پولتان برمی‌گردد."); }}>
                  لغو سفارش این غرفه (تا پیش از تأیید غرفه‌دار)
                </button>
              ) : null}
              {st === "CANCELLED" ? (
                <p className="rounded-control bg-surface-2 p-3 text-ink-soft">این بخش لغو شد و مبلغ آن به کیف پول شما برگشت.</p>
              ) : null}
              {st === "DELIVERED" || st === "COMPLETED" ? (
                <div className="flex flex-wrap gap-2">
                  {s.items.map((it) => (
                    <Link key={it.packageId} href={`/l/${it.listingId}#reviews`} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                      <Star className="size-3.5 fill-saffron text-saffron" aria-hidden />
                      دیدگاه درباره‌ی {listingById(it.listingId)?.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              {st === "DISPUTED" ? (
                <p className="flex gap-2 rounded-control bg-nobar-soft p-3 text-nobar">
                  <ShieldCheck className="size-5 shrink-0" aria-hidden />
                  شکایت ثبت شد. پول این بخش تا داوری نزد نوبر می‌ماند.
                </p>
              ) : null}
              {idx >= 0 && idx < 3 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-control border border-dashed border-line p-2 text-xs text-ink-soft">
                  <span>شبیه‌سازی نسخه‌ی نمایشی:</span>
                  <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 font-bold text-ink hover:bg-brand-soft" onClick={() => save(k, FLOW[idx + 1]!)}>
                    {idx === 0 ? "غرفه تأیید کرد" : idx === 1 ? "غرفه ارسال کرد" : "تحویل گرفتم"}
                  </button>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderView />
    </Suspense>
  );
}
