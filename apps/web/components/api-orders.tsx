"use client";

import { type CheckoutDto, ORDER_STATUS_FA, type OrderDto } from "@nobar/contracts";
import { cityName, DISPUTE_REASON_FA, METHOD_FA, type ShippingMethodCode } from "@nobar/demo";
import { formatToman, toFaDigits } from "@nobar/fa";
import { Badge, Button, ButtonLink, Card, cn, EmptyState, JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { ChevronLeft, CircleAlert, PartyPopper, Receipt, ShieldCheck, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountShell, SignInPrompt } from "@/components/account-shell";
import { DisputeForm } from "@/components/dispute-form";
import { apiErrorMessage, newIdempotencyKey } from "@/lib/api-commerce";
import { useStore } from "@/lib/store";

type Status = OrderDto["status"];
const FLOW: Status[] = ["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "COMPLETED"];
const STEP_FA: Partial<Record<Status, string>> = {
  AWAITING_ACCEPTANCE: "پرداخت شد",
  ACCEPTED: "تأیید غرفه",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  COMPLETED: "پایان مهلت شکایت",
};
const TONE: Record<Status, "brand" | "nobar" | "saffron" | "neutral" | "danger" | "solid"> = {
  PENDING_PAYMENT: "saffron",
  AWAITING_ACCEPTANCE: "saffron",
  ACCEPTED: "brand",
  SHIPPED: "brand",
  DELIVERED: "solid",
  DISPUTED: "nobar",
  COMPLETED: "neutral",
  REJECTED: "danger",
  EXPIRED: "danger",
  CANCELLED: "danger",
  REFUNDED: "danger",
};
const DONE: Status[] = ["COMPLETED", "REFUNDED", "REJECTED", "CANCELLED", "EXPIRED"];
const DISPUTE_STATUS_FA = { AWAITING_SELLER: "منتظر پاسخ غرفه", AWAITING_STAFF: "در حال بررسی کارشناس نوبر", RESOLVED: "حل شد", REJECTED: "رد شد" } as const;

/** One shop order with its progress and the buyer's actions (cancel, confirm delivery, report a problem). */
function ShopOrderCard({ order, onChange }: { order: OrderDto; onChange: (o: OrderDto) => void }) {
  const { api, showToast } = useStore();
  const [busy, setBusy] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const act = async (path: string, body?: unknown, done?: string) => {
    setBusy(true);
    try {
      onChange(await api.call<OrderDto>(`orders/${order.id}/${path}`, { method: "POST", ...(body === undefined ? {} : { body }) }));
      if (done) showToast(done);
    } catch (e) {
      showToast(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const step = FLOW.indexOf(order.status);
  const windowOpen = order.status === "SHIPPED" || (order.status === "DELIVERED" && !!order.complaintEndsAt && new Date(order.complaintEndsAt) > new Date());

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-3">
        <Link href={`/shop/${order.shopId}`} className="font-bold hover:text-brand">
          {order.shopName}
        </Link>
        <span className="text-xs text-ink-soft" dir="ltr">
          {order.code}
        </span>
        <Badge tone={TONE[order.status]} className="ms-auto">
          {ORDER_STATUS_FA[order.status]}
        </Badge>
      </div>

      {step >= 0 ? (
        <ol className="grid grid-cols-5 gap-1 px-4 pt-4 text-center text-[0.7rem]" aria-label="مراحل سفارش">
          {FLOW.map((s, i) => (
            <li key={s} className="space-y-1">
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-surface-2")} />
              <span className={i <= step ? "font-bold text-brand-strong" : "text-ink-soft"}>{STEP_FA[s]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <ul className="divide-y divide-line px-4">
        {order.items.map((i) => (
          <li key={`${i.listingId}:${i.packageId}`} className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Link href={`/l/${i.listingId}`} className="font-bold hover:text-brand">
              {i.title}
            </Link>
            <span className="text-ink-soft">
              {i.packageLabel} × {toFaDigits(i.qty)}
            </span>
            <Toman rial={i.lineTotalRial} className="ms-auto" />
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-line px-4 py-3 text-sm">
        <p className="flex justify-between">
          <span className="text-ink-soft">ارسال{order.shippingMethod ? ` · ${METHOD_FA[order.shippingMethod as ShippingMethodCode] ?? order.shippingMethod}` : ""}</span>
          <Toman rial={order.deliveryFeeRial} />
        </p>
        <p className="flex justify-between font-bold">
          <span>جمع این غرفه</span>
          <Toman rial={order.totalRial} />
        </p>
        {order.refundedRial > 0 ? (
          <p className="flex justify-between text-brand-strong">
            <span>برگشت به کیف پول</span>
            <Toman rial={order.refundedRial} />
          </p>
        ) : null}
        {order.status === "AWAITING_ACCEPTANCE" && order.acceptDeadline ? (
          <p className="text-xs text-ink-soft">
            غرفه تا <JalaliDate date={order.acceptDeadline} format="datetime" /> فرصت تأیید دارد؛ وگرنه مبلغ به کیف پول شما برمی‌گردد.
          </p>
        ) : null}
        {order.trackingCode ? (
          <p className="text-xs">
            کد رهگیری: <span dir="ltr" className="font-bold">{order.trackingCode}</span>
          </p>
        ) : null}
        {order.etaTo && ["ACCEPTED", "SHIPPED"].includes(order.status) ? (
          <p className="text-xs text-ink-soft">
            رسیدن تا <JalaliDate date={order.etaTo} format="short" />
          </p>
        ) : null}
        {order.status === "DELIVERED" && order.complaintEndsAt ? (
          <p className="text-xs text-ink-soft">
            اگر مشکلی هست تا <JalaliDate date={order.complaintEndsAt} format="datetime" /> گزارش دهید؛ بعد از آن مبلغ برای غرفه آزاد می‌شود.
          </p>
        ) : null}
        {order.cancelReason ? <p className="text-xs text-danger">{order.cancelReason}</p> : null}
      </div>

      {order.dispute ? (
        <div className="space-y-1 border-t border-line bg-nobar-soft/40 px-4 py-3 text-sm">
          <p className="font-bold">
            گزارش مشکل: {DISPUTE_REASON_FA[order.dispute.reason]} · {DISPUTE_STATUS_FA[order.dispute.status]}
          </p>
          <p className="text-ink-soft">{order.dispute.description}</p>
          {order.dispute.sellerResponse ? (
            <p>
              <span className="font-bold">پاسخ غرفه: </span>
              {order.dispute.sellerResponse}
              {order.dispute.sellerOfferRial ? ` (پیشنهاد ${formatToman(order.dispute.sellerOfferRial)})` : ""}
            </p>
          ) : null}
          {order.dispute.resolutionNote ? (
            <p>
              <span className="font-bold">نتیجه: </span>
              {order.dispute.resolutionNote}
              {order.dispute.refundRial ? ` · بازپرداخت ${formatToman(order.dispute.refundRial)}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        {order.status === "AWAITING_ACCEPTANCE" ? (
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void act("cancel", undefined, "سفارش لغو شد و مبلغ به کیف پولتان برگشت.")}>
            لغو سفارش
          </Button>
        ) : null}
        {order.status === "SHIPPED" ? (
          <Button size="sm" disabled={busy} onClick={() => void act("delivered", undefined, "تحویل ثبت شد. ممنون!")}>
            سفارش را تحویل گرفتم
          </Button>
        ) : null}
        {windowOpen && !order.dispute && !disputing ? (
          <Button variant="secondary" size="sm" onClick={() => setDisputing(true)}>
            <CircleAlert className="size-4" aria-hidden />
            گزارش مشکل
          </Button>
        ) : null}
        {["DELIVERED", "COMPLETED"].includes(order.status) ? (
          <ButtonLink href={`/l/${order.items[0]?.listingId ?? ""}?review=${order.id}#reviews`} variant="ghost" size="sm">
            <Star className="size-4" aria-hidden />
            نوشتن دیدگاه
          </ButtonLink>
        ) : null}
      </div>
      {disputing ? (
        <div className="px-4 pb-4">
          <DisputeForm
            maxRial={order.totalRial - order.refundedRial}
            onCancel={() => setDisputing(false)}
            onSubmit={async (_summary, input) => {
              await act("dispute", input, "گزارش شما ثبت شد؛ غرفه‌دار پاسخ می‌دهد و اگر لازم شد کارشناس نوبر داوری می‌کند.");
              setDisputing(false);
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}

/** /order?checkout=… (back from the gateway) or /order?id=… (one shop order). */
export function ApiOrderPage({ checkoutId, orderId, payment }: { checkoutId: string | null; orderId: string | null; payment: string | null }) {
  const { api, ready, user, showToast } = useStore();
  const [checkout, setCheckout] = useState<CheckoutDto | null>(null);
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    try {
      if (checkoutId) {
        const c = await api.call<CheckoutDto>(`checkouts/${encodeURIComponent(checkoutId)}`);
        setCheckout(c);
        setOrders(c.orders);
      } else if (orderId) {
        setOrders([await api.call<OrderDto>(`orders/${encodeURIComponent(orderId)}`)]);
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }, [api, checkoutId, orderId]);
  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!user) return <SignInPrompt next={`/order?${checkoutId ? `checkout=${checkoutId}` : `id=${orderId ?? ""}`}`} text="برای دیدن سفارش وارد شوید." />;
  if (error) return <EmptyState title={error} action={<ButtonLink href="/orders">سفارش‌های من</ButtonLink>} />;
  if (!orders) return <Skeleton className="h-64 w-full" />;

  const retry = async () => {
    if (!checkout) return;
    setRetrying(true);
    try {
      const started = await api.call<{ redirectUrl: string }>(`checkouts/${checkout.id}/pay`, { method: "POST", idempotencyKey: newIdempotencyKey() });
      window.location.assign(started.redirectUrl);
    } catch (e) {
      setRetrying(false);
      showToast(apiErrorMessage(e));
    }
  };
  const paid = checkout ? checkout.status === "PAID" : true;

  return (
    <div className="space-y-5">
      {checkout && paid && payment === "ok" ? (
        <div className="flex items-center gap-3 rounded-card border border-brand/40 bg-brand-soft p-4">
          <PartyPopper className="size-8 text-brand" aria-hidden />
          <div>
            <p className="font-extrabold">پرداخت انجام شد. سفارش شما برای غرفه‌دارها فرستاده شد.</p>
            <p className="text-sm text-ink-soft">هر غرفه باید در مهلت مشخص سفارش را تأیید کند؛ وگرنه مبلغ آن غرفه به کیف پولتان برمی‌گردد.</p>
          </div>
        </div>
      ) : null}
      {checkout && checkout.status === "PENDING_PAYMENT" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-saffron/50 bg-saffron-soft p-4">
          <CircleAlert className="size-7 text-warn" aria-hidden />
          <div className="flex-1">
            <p className="font-extrabold">{payment === "failed" ? "پرداخت انجام نشد." : "این سفارش منتظر پرداخت است."}</p>
            <p className="text-sm text-ink-soft">
              موجودی تا <JalaliDate date={checkout.expiresAt} format="datetime" /> برای شما نگه داشته می‌شود.
            </p>
          </div>
          <Button onClick={() => void retry()} disabled={retrying}>
            پرداخت {formatToman(checkout.totalRial)}
          </Button>
        </div>
      ) : null}
      {checkout && checkout.status === "FAILED" ? (
        <div className="rounded-card border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          {payment === "failed" ? "پرداخت تأیید نشد. اگر مبلغی از حسابتان کم شده، به کیف پول نوبر برگشته است." : "مهلت پرداخت این سفارش تمام شد؛ موجودی آزاد شد."}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">{checkout ? "سفارش شما" : "جزئیات سفارش"}</h1>
        {orders[0] ? <span className="text-sm text-ink-soft">ارسال به {cityName(orders[0].address.cityId)} · {orders[0].address.name}</span> : null}
        <Link href="/orders" className="ms-auto text-sm text-brand hover:underline">
          همه‌ی سفارش‌ها
        </Link>
      </div>
      {orders.map((o) => (
        <ShopOrderCard key={o.id} order={o} onChange={(next) => setOrders((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? null)} />
      ))}
      <p className="flex gap-2 text-xs leading-6 text-ink-soft">
        <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden />
        پول شما تا پایان مهلت شکایت نزد نوبر امانت می‌ماند و بعد به غرفه‌دار پرداخت می‌شود.
      </p>
    </div>
  );
}

/** /orders in API mode: the buyer's shop orders from the server, plus the wallet balance. */
export function ApiOrdersList() {
  const { api, ready, user } = useStore();
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);
  const [tab, setTab] = useState<"current" | "done">("current");
  useEffect(() => {
    if (!ready || !user) return;
    api.call<OrderDto[]>("orders").then(setOrders).catch(() => setOrders([]));
    api.call<{ balanceRial: number }>("me/wallet").then((w) => setWallet(w.balanceRial)).catch(() => setWallet(null));
  }, [api, ready, user]);

  if (!ready) return <Skeleton className="h-96 w-full" />;
  if (!user) return <AccountShell title="سفارش‌ها"><SignInPrompt next="/orders" text="برای دیدن سفارش‌ها وارد شوید." /></AccountShell>;
  if (!orders) return <AccountShell title="سفارش‌ها"><Skeleton className="h-64 w-full" /></AccountShell>;
  const current = orders.filter((o) => !DONE.includes(o.status));
  const done = orders.filter((o) => DONE.includes(o.status));
  const list = tab === "current" ? current : done;

  return (
    <AccountShell title="سفارش‌ها">
      {wallet !== null ? (
        <div className="flex items-center gap-2 rounded-card border border-line bg-surface p-3 text-sm">
          <Wallet className="size-5 text-brand" aria-hidden />
          موجودی کیف پول: <Toman rial={wallet} className="font-bold" />
        </div>
      ) : null}
      <div role="tablist" className="flex gap-1 border-b border-line">
        {(
          [
            ["current", "جاری", current.length],
            ["done", "تحویل و تکمیل‌شده", done.length],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("-mb-px min-h-11 border-b-2 px-4 text-sm", tab === k ? "border-brand font-bold text-brand" : "border-transparent text-ink-soft")}
          >
            {label} <Badge tone={tab === k ? "brand" : "neutral"}>{toFaDigits(n)}</Badge>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Receipt className="size-10" />} title={tab === "current" ? "سفارش جاری ندارید" : "هنوز سفارشی تکمیل نشده"} action={<ButtonLink href="/">شروع خرید</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/order?id=${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-sm hover:border-brand">
                <span className="font-bold">{o.shopName}</span>
                <span className="text-ink-soft" dir="ltr">
                  {o.code}
                </span>
                <span className="text-ink-soft">
                  <JalaliDate date={o.createdAt} />
                </span>
                <Badge tone={TONE[o.status]}>{ORDER_STATUS_FA[o.status]}</Badge>
                <span className="ms-auto inline-flex items-center gap-1 font-bold">
                  <Toman rial={o.totalRial} />
                  <ChevronLeft className="size-4 text-ink-soft" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
