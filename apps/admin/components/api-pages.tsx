"use client";

// Staff pages on the API (NEXT_PUBLIC_API_URL set). Every decision is an audited API call; a page reports
// success only when the API agreed, and an API failure is shown instead of falling back to demo data.
import { DISPUTE_REASON_FA, ORDER_STATUS_FA, type OrderDto, type OrderStatus } from "@nobar/contracts";
import { cityName, DISPUTE_STATUS_FA, JALALI_MONTHS, METHOD_FA, provinceOfCity, SHOP_ORDER_TONE, SHOP_TYPE_FA, type Listing, type ProduceType, type Shop, type ShippingMethodCode, type ShopOrderStatus } from "@nobar/demo";
import { formatFaNumber, toEnDigits } from "@nobar/fa";
import { Badge, Button, Card, EmptyState, Input, JalaliDate, RatingStars, RelativeDay, Stat, Toman } from "@nobar/ui";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Table, useToast } from "@/components/shell";
import { errorText, newKey, useAdmin, useAdminData } from "@/lib/api";

const num = (v: string) => Number(toEnDigits(v).replace(/[^\d]/g, "")) || 0;
const orderTone = (s: OrderStatus) => (s === "PENDING_PAYMENT" ? "neutral" : SHOP_ORDER_TONE[s as ShopOrderStatus]);
const methodFa = (m: string | null) => (m ? (METHOD_FA[m as ShippingMethodCode] ?? m) : "—");

/** Runs a staff action: one at a time, toast on success or with the API's Persian error, then refresh. */
function useAct(after: () => Promise<void> | void) {
  const { client, refreshCounts } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (path: string, ok: string, init: { method?: string; body?: unknown; idempotent?: boolean } = {}) => {
    if (busy) return false;
    setBusy(true);
    try {
      await client.call(path, { method: init.method ?? "POST", ...(init.body === undefined ? {} : { body: init.body }), ...(init.idempotent ? { idempotencyKey: newKey() } : {}) });
      toast(ok);
      await after();
      void refreshCounts();
      return true;
    } catch (e) {
      toast(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { act, busy };
}

function Page({ title, intro, error, loading, children }: { title: string; intro?: ReactNode; error: string | null; loading: boolean; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">{title}</h1>
      {intro ? <p className="text-sm text-ink-soft">{intro}</p> : null}
      {error ? (
        <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-ink-soft">در حال دریافت…</p>
      ) : (
        children
      )}
    </div>
  );
}

const Empty = ({ title }: { title: string }) => <EmptyState title={title} />;

/** A reason box with a danger button; the reason is required and goes to the seller and the audit log. */
function ReasonAction({ label, placeholder, disabled, onSubmit }: { label: string; placeholder: string; disabled: boolean; onSubmit: (reason: string) => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  return (
    <>
      <label className="min-w-40 flex-1 text-sm">
        <span className="sr-only">{placeholder}</span>
        <Input placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <Button
        variant="danger"
        disabled={disabled}
        onClick={() => {
          if (reason.trim().length < 2) return toast("دلیل را بنویسید.");
          onSubmit(reason.trim());
        }}
      >
        {label}
      </Button>
    </>
  );
}

// ---------- KYC

type KycRow = { shop: Shop; nationalIdLast4: string | null; shebaLast4: string | null; submittedAt: string | null };

export function ApiKyc() {
  const { data, error, reload } = useAdminData<KycRow[]>("admin/kyc");
  const { act, busy } = useAct(reload);
  return (
    <Page title="تأیید هویت غرفه‌ها" intro="کد ملی و شبا فقط با چهار رقم آخر نمایش داده می‌شود." error={error} loading={!data}>
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((k) => (
            <li key={k.shop.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold">{k.shop.name}</span>
                  <Badge tone="neutral">{SHOP_TYPE_FA[k.shop.type]}</Badge>
                  <span className="text-sm text-ink-soft">
                    {k.shop.ownerName} · {cityName(k.shop.cityId)}
                  </span>
                  {k.submittedAt ? <RelativeDay date={k.submittedAt} className="ms-auto text-xs text-ink-soft" /> : null}
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <span>
                    کد ملی: <span dir="ltr">••••••{k.nationalIdLast4 ?? "—"}</span>
                  </span>
                  <span>
                    شبا: <span dir="ltr">IR••…••{k.shebaLast4 ?? "—"}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Button disabled={busy} onClick={() => void act(`admin/shops/${k.shop.id}/approve`, "غرفه تأیید و فعال شد.")}>
                    تأیید هویت
                  </Button>
                  <ReasonAction label="رد" placeholder="دلیل رد (غرفه‌دار آن را می‌بیند)" disabled={busy} onSubmit={(reason) => void act(`admin/shops/${k.shop.id}/reject`, "درخواست رد شد.", { body: { reason } })} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="غرفه‌ای منتظر تأیید نیست" />
      )}
    </Page>
  );
}

// ---------- moderation (listings, rule hits, reviews, flagged questions)

type ModerationData = { pendingListings: Listing[]; cases: Array<{ id: string; listingId: string; rule: string; excerpt: string; openedAt: string }> };
type ReviewQueue = {
  reviews: Array<{ id: string; buyerName: string; buyerCity: string; rating: number; freshnessRating: number; text: string; createdAt: string; flags: string[] }>;
  flaggedQuestions: Array<{ id: string; question: string; flags: string[]; createdAt: string }>;
};

export function ApiModeration() {
  const mod = useAdminData<ModerationData>("admin/moderation");
  const rev = useAdminData<ReviewQueue>("admin/reviews");
  const { act, busy } = useAct(async () => {
    await mod.reload();
    await rev.reload();
  });
  const nothing = mod.data && rev.data && !mod.data.pendingListings.length && !mod.data.cases.length && !rev.data.reviews.length && !rev.data.flaggedQuestions.length;
  return (
    <Page
      title="بررسی آگهی و نظر"
      intro="متن غرفه‌دار و خریدار داده‌ی نامطمئن است؛ تصمیم نهایی با کارشناس است و در گزارش ممیزی ثبت می‌شود."
      error={mod.error ?? rev.error}
      loading={!mod.data || !rev.data}
    >
      {nothing ? <Empty title="موردی برای بررسی نیست" /> : null}
      <ul className="space-y-3">
        {mod.data?.pendingListings.map((l) => (
          <li key={l.id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">آگهی</Badge>
                <span className="font-extrabold">{l.title}</span>
                {l.isOrganic ? <Badge tone="saffron">ادعای ارگانیک</Badge> : null}
              </div>
              <blockquote className="rounded-control bg-surface-2 p-3 text-sm">«{l.description}»</blockquote>
              <div className="flex flex-wrap items-end gap-2">
                <Button size="sm" disabled={busy} onClick={() => void act(`admin/listings/${l.id}/approve`, "آگهی تأیید و منتشر شد.")}>
                  تأیید
                </Button>
                <ReasonAction label="رد" placeholder="دلیل رد" disabled={busy} onSubmit={(reason) => void act(`admin/listings/${l.id}/reject`, "آگهی رد شد.", { body: { reason } })} />
              </div>
            </Card>
          </li>
        ))}
        {mod.data?.cases.map((c) => (
          <li key={c.id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">قاعده‌ی خودکار</Badge>
                <Badge tone="saffron">{c.rule}</Badge>
                <RelativeDay date={c.openedAt} className="ms-auto text-xs text-ink-soft" />
              </div>
              <blockquote className="rounded-control bg-surface-2 p-3 text-sm">«{c.excerpt}»</blockquote>
              <div className="flex flex-wrap items-end gap-2">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(`admin/moderation/${c.id}/close`, "مورد بسته شد.")}>
                  مشکلی نیست؛ بستن
                </Button>
                <ReasonAction label="توقف آگهی" placeholder="دلیل توقف آگهی" disabled={busy} onSubmit={(reason) => void act(`admin/listings/${c.listingId}/reject`, "آگهی متوقف شد.", { body: { reason } })} />
              </div>
            </Card>
          </li>
        ))}
        {rev.data?.reviews.map((r) => (
          <li key={r.id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">نظر</Badge>
                <span className="font-bold">
                  {r.buyerName} · {r.buyerCity}
                </span>
                <RatingStars value={r.rating} className="text-xs" />
                {r.flags.map((f) => (
                  <Badge key={f} tone="saffron">
                    {f}
                  </Badge>
                ))}
                <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
              </div>
              <blockquote className="rounded-control bg-surface-2 p-3 text-sm">«{r.text}»</blockquote>
              <div className="flex flex-wrap items-end gap-2">
                <Button size="sm" disabled={busy} onClick={() => void act(`admin/reviews/${r.id}/approve`, "نظر منتشر شد.")}>
                  انتشار
                </Button>
                <ReasonAction label="رد" placeholder="دلیل رد" disabled={busy} onSubmit={(reason) => void act(`admin/reviews/${r.id}/reject`, "نظر رد شد.", { body: { reason } })} />
              </div>
            </Card>
          </li>
        ))}
        {rev.data?.flaggedQuestions.map((q) => (
          <li key={q.id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">پرسش</Badge>
                {q.flags.map((f) => (
                  <Badge key={f} tone="saffron">
                    {f}
                  </Badge>
                ))}
                <RelativeDay date={q.createdAt} className="ms-auto text-xs text-ink-soft" />
              </div>
              <blockquote className="rounded-control bg-surface-2 p-3 text-sm">«{q.question}»</blockquote>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => void act(`admin/questions/${q.id}/hide`, "پرسش پنهان شد.")}>
                پنهان کردن
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}

// ---------- disputes

function Ruling({ order, busy, onSubmit }: { order: OrderDto; busy: boolean; onSubmit: (refundRial: number, note: string) => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const rial = num(amount) * 10;
        if (rial > order.totalRial - order.refundedRial) return toast("بازپرداخت نمی‌تواند از مبلغ پرداختی بیشتر باشد.");
        if (note.trim().length < 3) return toast("دلیل رأی را بنویسید.");
        onSubmit(rial, note.trim());
      }}
    >
      <label className="text-sm font-bold">
        مبلغ بازپرداخت (تومان)
        <Input inputMode="numeric" className="mt-1 w-44" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="۰ یعنی بدون بازپرداخت" />
      </label>
      <label className="flex-1 text-sm font-bold">
        دلیل رأی
        <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <Button type="submit" disabled={busy}>
        ثبت رأی
      </Button>
    </form>
  );
}

export function ApiDisputes() {
  const { data, error, reload } = useAdminData<OrderDto[]>("admin/orders");
  const { act, busy } = useAct(reload);
  const rows = data?.filter((o) => o.dispute) ?? [];
  return (
    <Page title="داوری شکایت‌ها" error={error} loading={!data}>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((o) => {
            const d = o.dispute!;
            return (
              <li key={o.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="nobar">{DISPUTE_REASON_FA[d.reason]}</Badge>
                    <Badge tone={d.status === "AWAITING_STAFF" ? "saffron" : d.status === "RESOLVED" ? "brand" : "neutral"}>{DISPUTE_STATUS_FA[d.status]}</Badge>
                    <span className="text-sm text-ink-soft">
                      {o.shopName} · سفارش <span dir="ltr">{o.code}</span>
                    </span>
                    <RelativeDay date={d.openedAt} className="ms-auto text-xs text-ink-soft" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-control bg-surface-2 p-3 text-sm">
                      <p className="font-bold">خریدار</p>
                      <p className="mt-1 leading-7">{d.description}</p>
                      <p className="mt-1 text-ink-soft">
                        درخواست <Toman rial={d.requestedRial} />
                      </p>
                    </div>
                    <div className="rounded-control bg-surface-2 p-3 text-sm">
                      <p className="font-bold">غرفه‌دار</p>
                      <p className="mt-1 leading-7">{d.sellerResponse ?? "هنوز پاسخ نداده است."}</p>
                      {d.sellerOfferRial ? (
                        <p className="mt-1 text-ink-soft">
                          پیشنهاد بازپرداخت: <Toman rial={d.sellerOfferRial} />
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft">
                    سقف بازپرداخت: مبلغ پرداختی این سفارش <Toman rial={o.totalRial - o.refundedRial} />. بازپرداخت به کیف پول خریدار می‌رود و از سهم غرفه کم می‌شود.
                  </p>
                  {d.status === "RESOLVED" || d.status === "REJECTED" ? (
                    <p className="rounded-control bg-brand-soft p-3 text-sm">
                      رأی: بازپرداخت <Toman rial={d.refundRial ?? 0} /> — {d.resolutionNote}
                    </p>
                  ) : (
                    <>
                      {d.status === "AWAITING_SELLER" ? <p className="text-sm text-ink-soft">غرفه‌دار هنوز پاسخ نداده است؛ در صورت نیاز می‌توانید همین حالا رأی بدهید.</p> : null}
                      <Ruling order={o} busy={busy} onSubmit={(refundRial, note) => void act(`admin/orders/${o.id}/dispute/resolve`, "رأی ثبت شد.", { body: { refundRial, note }, idempotent: true })} />
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="شکایتی ثبت نشده است" />
      )}
    </Page>
  );
}

// ---------- orders

export function ApiOrders() {
  const { data, error, reload } = useAdminData<OrderDto[]>("admin/orders");
  const { act, busy } = useAct(reload);
  return (
    <Page title="سفارش‌ها" error={error} loading={!data}>
      {data?.length ? (
        <Table head={["کد", "تاریخ", "غرفه", "مقصد", "ارسال", "کالا", "کمیسیون", "وضعیت", ""]}>
          {data.map((o) => (
            <tr key={o.id}>
              <td dir="ltr" className="text-end">
                {o.code}
              </td>
              <td>
                <JalaliDate date={o.timeline[0]?.at ?? new Date().toISOString()} format="short" />
              </td>
              <td>{o.shopName}</td>
              <td>{cityName(o.address.cityId)}</td>
              <td>{methodFa(o.shippingMethod)}</td>
              <td>
                <Toman rial={o.itemsTotalRial} />
              </td>
              <td>{o.commissionRial === null ? "—" : <Toman rial={o.commissionRial} />}</td>
              <td>
                <Badge tone={orderTone(o.status)}>{ORDER_STATUS_FA[o.status]}</Badge>
              </td>
              <td>
                {o.status === "SHIPPED" ? (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(`admin/orders/${o.id}/delivered`, "تحویل ثبت شد.")}>
                    ثبت تحویل
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty title="هنوز سفارشی پرداخت نشده است" />
      )}
    </Page>
  );
}

// ---------- shops

type ShopRow = { shop: Shop; reviewNote: string | null; listings: number; publishedListings: number };
const SHOP_STATUS: Record<Shop["status"], { fa: string; tone: "brand" | "saffron" | "danger" | "neutral" }> = {
  ACTIVE: { fa: "فعال", tone: "brand" },
  PENDING_REVIEW: { fa: "منتظر تأیید", tone: "saffron" },
  SUSPENDED: { fa: "تعلیق", tone: "danger" },
  REJECTED: { fa: "رد شده", tone: "neutral" },
};
const useShopNames = () => {
  const { data } = useAdminData<ShopRow[]>("admin/shops");
  return (id: string) => data?.find((s) => s.shop.id === id)?.shop.name ?? id;
};

export function ApiShops() {
  const { data, error, reload } = useAdminData<ShopRow[]>("admin/shops");
  const { act, busy } = useAct(reload);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Page title="غرفه‌ها" error={error} loading={!data}>
      <Table head={["غرفه", "نوع", "شهر", "آگهی (منتشر)", "امتیاز", "لغو ۹۰ روز", "وضعیت", ""]}>
        {data?.map(({ shop: s, reviewNote, listings, publishedListings }) => (
          <tr key={s.id}>
            <td className="font-bold">
              {s.name}
              {reviewNote ? <span className="block text-xs font-normal text-ink-soft">{reviewNote}</span> : null}
            </td>
            <td>{SHOP_TYPE_FA[s.type]}</td>
            <td>
              {cityName(s.cityId)}، {provinceOfCity(s.cityId)?.name}
            </td>
            <td>
              {formatFaNumber(listings)} ({formatFaNumber(publishedListings)})
            </td>
            <td>
              <RatingStars value={s.ratingAvg} count={s.ratingCount} className="text-xs" />
            </td>
            <td>{s.cancellations90d > 2 ? <Badge tone="warn">{formatFaNumber(s.cancellations90d)}</Badge> : formatFaNumber(s.cancellations90d)}</td>
            <td>
              <Badge tone={SHOP_STATUS[s.status].tone}>{SHOP_STATUS[s.status].fa}</Badge>
            </td>
            <td>
              {s.status === "ACTIVE" ? (
                open === s.id ? (
                  <div className="flex min-w-64 items-end gap-2">
                    <ReasonAction
                      label="تعلیق"
                      placeholder="دلیل تعلیق"
                      disabled={busy}
                      onSubmit={(reason) => void act(`admin/shops/${s.id}/suspend`, "غرفه تعلیق شد و از فروشگاه پنهان است.", { body: { reason } }).then((ok) => ok && setOpen(null))}
                    />
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setOpen(s.id)}>
                    تعلیق…
                  </Button>
                )
              ) : s.status === "SUSPENDED" ? (
                <Button size="sm" disabled={busy} onClick={() => void act(`admin/shops/${s.id}/approve`, "غرفه دوباره فعال شد.")}>
                  فعال‌سازی دوباره
                </Button>
              ) : s.status === "PENDING_REVIEW" ? (
                <Link href="/kyc" className="text-sm font-bold text-brand">
                  بررسی
                </Link>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}

// ---------- payouts

type PayoutData = {
  pending: Array<{ shopId: string; amountRial: number }>;
  history: Array<{ id: string; shopId: string; amountRial: number; status: string; createdAt: string; paidAt: string | null }>;
};

export function ApiPayouts() {
  const { data, error, reload } = useAdminData<PayoutData>("admin/payouts");
  const shopName = useShopNames();
  const { act, busy } = useAct(reload);
  const due = data?.pending.reduce((s, p) => s + p.amountRial, 0) ?? 0;
  return (
    <Page
      title="تسویه‌ها"
      intro="هر تسویه یک تراکنش دوطرفه در دفتر حسابداری است. انتقال بانکی فعلاً بیرون از سامانه انجام می‌شود؛ «تسویه» فقط آن را در دفتر ثبت می‌کند."
      error={error}
      loading={!data}
    >
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span>
          موجودی آماده‌ی تسویه: <Toman rial={due} className="font-extrabold" /> برای {formatFaNumber(data?.pending.length ?? 0)} غرفه
        </span>
        <Button
          disabled={busy || !due}
          onClick={() => {
            if (window.confirm("همه‌ی موجودی‌های آماده به‌عنوان پرداخت‌شده ثبت شود؟")) void act("admin/payouts", "تسویه ثبت شد.", { idempotent: true });
          }}
        >
          ثبت تسویه‌ی همه
        </Button>
      </Card>
      {data?.pending.length ? (
        <Table caption="آماده‌ی تسویه" head={["غرفه", "مبلغ"]}>
          {data.pending.map((p) => (
            <tr key={p.shopId}>
              <td>{shopName(p.shopId)}</td>
              <td>
                <Toman rial={p.amountRial} />
              </td>
            </tr>
          ))}
        </Table>
      ) : null}
      {data?.history.length ? (
        <Table caption="تسویه‌های انجام‌شده" head={["غرفه", "تاریخ", "مبلغ", "وضعیت"]}>
          {data.history.map((p) => (
            <tr key={p.id}>
              <td>{shopName(p.shopId)}</td>
              <td>
                <JalaliDate date={p.paidAt ?? p.createdAt} />
              </td>
              <td>
                <Toman rial={p.amountRial} />
              </td>
              <td>
                <Badge tone={p.status === "PAID" ? "brand" : "saffron"}>{p.status === "PAID" ? "ثبت شد" : p.status}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      ) : null}
    </Page>
  );
}

// ---------- produce types

const STORAGE_FA = { AMBIENT: "دمای اتاق", COOL: "خنک", COLD: "زنجیره‌ی سرد" } as const;

function TypeRow({ type, busy, save }: { type: ProduceType; busy: boolean; save: (body: Record<string, unknown>, ok: string) => void }) {
  const [shelf, setShelf] = useState(String(type.shelfLifeDays));
  const [min, setMin] = useState(String(type.minShelfDaysOnArrival));
  const [hours, setHours] = useState(String(type.complaintWindowHours));
  const changed = num(shelf) !== type.shelfLifeDays || num(min) !== type.minShelfDaysOnArrival || num(hours) !== type.complaintWindowHours;
  const field = (label: string, value: string, set: (v: string) => void) => (
    <label>
      <span className="sr-only">
        {label} {type.name}
      </span>
      <Input inputMode="numeric" className="w-20" value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
  return (
    <tr>
      <td className="font-bold">{type.name}</td>
      <td>{field("عمر تازگی", shelf, setShelf)}</td>
      <td>{field("حداقل تازگی هنگام رسیدن", min, setMin)}</td>
      <td>{field("مهلت شکایت", hours, setHours)}</td>
      <td>{STORAGE_FA[type.storage]}</td>
      <td className="text-xs">{type.months.length === 12 ? "همه‌ی سال" : type.months.map((m) => JALALI_MONTHS[m - 1]).join("، ")}</td>
      <td>{type.needsReview ? <Badge tone="saffron">نیاز به بازبینی</Badge> : <Badge tone="brand">تأییدشده</Badge>}</td>
      <td>
        <div className="flex gap-2">
          {changed ? (
            <Button size="sm" disabled={busy} onClick={() => save({ shelfLifeDays: num(shelf), minShelfDaysOnArrival: num(min), complaintWindowHours: num(hours) }, "اعداد ذخیره شد.")}>
              ذخیره
            </Button>
          ) : type.needsReview ? (
            <Button size="sm" variant="secondary" className="whitespace-nowrap" disabled={busy} onClick={() => save({ needsReview: false }, "اعداد تأیید شد.")}>
              تأیید کارشناس
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function ApiTaxonomy() {
  const { data, error, reload } = useAdminData<ProduceType[]>("catalog/produce-types", { public: true });
  const { act, busy } = useAct(reload);
  return (
    <Page
      title="انواع محصول و فصل"
      intro="این اعداد قاعده‌های تازه‌سنج و ارسال هوشمند را می‌سازند و تغییرشان بلافاصله روی فروشگاه اثر می‌گذارد. عمر و حداقل تازگی به روز و مهلت شکایت به ساعت است."
      error={error}
      loading={!data}
    >
      <Table head={["نوع محصول", "عمر تازگی (روز)", "حداقل تازگی هنگام رسیدن", "مهلت شکایت (ساعت)", "نگهداری", "فصل", "وضعیت", ""]}>
        {data?.map((t) => (
          <TypeRow key={`${t.id}:${t.shelfLifeDays}:${t.minShelfDaysOnArrival}:${t.complaintWindowHours}`} type={t} busy={busy} save={(body, ok) => void act(`admin/produce-types/${t.id}`, ok, { method: "PATCH", body })} />
        ))}
      </Table>
    </Page>
  );
}

// ---------- commission

type Rule = { id: string; scope: "GLOBAL" | "CATEGORY" | "SHOP"; scopeId: string | null; rateBps: number; label: string };

function RuleRow({ rule, busy, save }: { rule: Rule; busy: boolean; save: (rateBps: number) => void }) {
  const toast = useToast();
  const [rate, setRate] = useState(String(rule.rateBps / 100));
  const bps = Math.round(Number(toEnDigits(rate).replace("٫", ".").replace(/[^\d.]/g, "")) * 100);
  return (
    <tr>
      <td>{rule.label}</td>
      <td>
        <label className="flex items-center gap-2">
          <span className="sr-only">نرخ {rule.label}</span>
          <Input inputMode="decimal" className="w-24" value={rate} onChange={(e) => setRate(e.target.value)} />٪
        </label>
      </td>
      <td>
        {bps !== rule.rateBps ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!Number.isFinite(bps) || bps < 0 || bps > 5000) return toast("نرخ باید بین ۰ و ۵۰ درصد باشد.");
              save(bps);
            }}
          >
            ذخیره
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

export function ApiCommission() {
  const { data, error, reload } = useAdminData<Rule[]>("admin/commission-rules");
  const { act, busy } = useAct(reload);
  return (
    <Page
      title="قاعده‌های کمیسیون"
      intro="دقیق‌ترین قاعده برنده است (غرفه، بعد دسته، بعد سراسری). نرخ در لحظه‌ی ثبت سفارش روی آن ثبت می‌شود و تغییر بعدی روی سفارش‌های قبلی اثر ندارد."
      error={error}
      loading={!data}
    >
      <Table head={["دامنه", "نرخ", ""]}>
        {data?.map((r) => (
          <RuleRow key={`${r.id}:${r.rateBps}`} rule={r} busy={busy} save={(rateBps) => void act("admin/commission-rules", "نرخ ذخیره شد.", { method: "PUT", body: { scope: r.scope, scopeId: r.scopeId, rateBps, label: r.label } })} />
        ))}
      </Table>
    </Page>
  );
}

// ---------- audit

type AuditRow = { id: string; actor: string; action: string; subject: string; at: string };

export function ApiAudit() {
  const { data, error } = useAdminData<AuditRow[]>("admin/audit");
  return (
    <Page title="گزارش ممیزی" intro="هر کار کارکنان ثبت می‌شود و قابل ویرایش یا حذف نیست." error={error} loading={!data}>
      {data?.length ? (
        <Table head={["زمان", "کاربر", "کار", "موضوع"]}>
          {data.map((a) => (
            <tr key={a.id}>
              <td>
                <JalaliDate date={a.at} format="datetime" />
              </td>
              <td>{a.actor}</td>
              <td>{a.action}</td>
              <td>{a.subject}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty title="هنوز کاری ثبت نشده است" />
      )}
    </Page>
  );
}

// ---------- home

type Finance = { escrowRial: number; walletsRial: number; sellersRial: number; commissionRial: number; receivedRial: number; paidOutRial: number };

export function ApiHome() {
  const { counts } = useAdmin();
  const finance = useAdminData<Finance>("admin/finance");
  const orders = useAdminData<OrderDto[]>("admin/orders");
  const shops = useAdminData<ShopRow[]>("admin/shops");
  const audit = useAdminData<AuditRow[]>("admin/audit");
  const f = finance.data;
  const active = shops.data?.filter((s) => s.shop.status === "ACTIVE") ?? [];
  return (
    <Page title="پیشخوان" error={finance.error ?? orders.error ?? shops.error ?? audit.error} loading={!f || !orders.data || !shops.data || !audit.data}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="دریافتی از درگاه" value={<Toman rial={f?.receivedRial ?? 0} />} tone="brand" />
        <Stat label="در امانت" value={<Toman rial={f?.escrowRial ?? 0} />} hint="تا پایان مهلت شکایت" />
        <Stat label="کمیسیون قطعی" value={<Toman rial={f?.commissionRial ?? 0} />} hint="فقط سفارش‌های تکمیل‌شده" />
        <Stat label="آماده‌ی تسویه با غرفه‌ها" value={<Toman rial={f?.sellersRial ?? 0} />} tone={f?.sellersRial ? "warn" : "neutral"} />
        <Stat label="کیف پول خریداران" value={<Toman rial={f?.walletsRial ?? 0} />} />
        <Stat label="تسویه‌شده" value={<Toman rial={f?.paidOutRial ?? 0} />} />
        <Stat label="غرفه‌ی فعال" value={formatFaNumber(active.length)} hint={`${formatFaNumber(active.reduce((s, x) => s + x.publishedListings, 0))} آگهی منتشرشده`} />
        <Stat label="سفارش‌ها" value={formatFaNumber(orders.data?.length ?? 0)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/kyc", label: "منتظر تأیید هویت", n: counts?.kyc },
          { href: "/moderation", label: "منتظر بررسی محتوا", n: counts?.moderation },
          { href: "/disputes", label: "شکایت منتظر داوری", n: counts?.disputes },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="flex items-center justify-between p-4 hover:border-brand">
              <span className="font-bold">{q.label}</span>
              <span className="text-2xl font-black text-nobar">{q.n === undefined ? "—" : formatFaNumber(q.n)}</span>
            </Card>
          </Link>
        ))}
      </div>

      {orders.data?.length ? (
        <Table caption="آخرین سفارش‌ها" head={["کد", "غرفه", "مقصد", "مبلغ کالا", "وضعیت"]}>
          {orders.data.slice(0, 8).map((o) => (
            <tr key={o.id}>
              <td dir="ltr" className="text-end">
                {o.code}
              </td>
              <td>{o.shopName}</td>
              <td>{cityName(o.address.cityId)}</td>
              <td>
                <Toman rial={o.itemsTotalRial} />
              </td>
              <td>
                <Badge tone={orderTone(o.status)}>{ORDER_STATUS_FA[o.status]}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      ) : null}

      <Card className="p-4">
        <h2 className="mb-3 font-extrabold">آخرین کارهای کارکنان</h2>
        {audit.data?.length ? (
          <ul className="space-y-2 text-sm">
            {audit.data.slice(0, 6).map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>
                  <span className="font-bold">{a.actor}</span> — {a.action}: {a.subject}
                </span>
                <RelativeDay date={a.at} className="shrink-0 text-ink-soft" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">هنوز کاری ثبت نشده است.</p>
        )}
      </Card>
    </Page>
  );
}
