"use client";

import type { OrderDto } from "@nobar/contracts";
import type { Review } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Button, cn, Field, RelativeDay, Textarea } from "@nobar/ui";
import { MessageCircleQuestion, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api-commerce";
import { API_URL } from "@/lib/api-config";
import { useStore } from "@/lib/store";

/** Published reviews of a listing (API mode); empty while loading or in demo mode. */
export function useListingReviews(listingId: string, enabled: boolean): Review[] {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetch(`${API_URL}/v1/listings/${encodeURIComponent(listingId)}/reviews`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Review[]>) : []))
      .then((list) => live && setReviews(list))
      .catch(() => live && setReviews([]));
    return () => {
      live = false;
    };
  }, [listingId, enabled]);
  return reviews;
}

const DELIVERED: OrderDto["status"][] = ["DELIVERED", "COMPLETED", "DISPUTED"];

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32">{label}</span>
      <span role="radiogroup" aria-label={label} className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${toFaDigits(n)} ستاره`} onClick={() => onChange(n)}>
            <Star className={cn("size-6", n <= value ? "fill-saffron text-saffron" : "text-line-strong")} />
          </button>
        ))}
      </span>
    </div>
  );
}

/** Review form for a delivered order of this listing; the review shows after staff approval. */
export function ApiReviewForm({ listingId }: { listingId: string }) {
  const { api, user, ready, showToast } = useStore();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [rating, setRating] = useState(5);
  const [fresh, setFresh] = useState(5);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!ready || !user) return;
    api
      .call<OrderDto[]>("orders")
      .then((orders) => setOrder(orders.find((o) => DELIVERED.includes(o.status) && o.items.some((i) => i.listingId === listingId)) ?? null))
      .catch(() => setOrder(null));
  }, [api, ready, user, listingId]);

  if (sent) return <p className="rounded-control border border-dashed border-line-strong p-3 text-sm text-warn">دیدگاه شما ثبت شد و پس از بررسی نمایش داده می‌شود.</p>;
  if (!order)
    return (
      <p className="rounded-control bg-surface-2 p-3 text-sm text-ink-soft">
        بعد از اینکه این محصول را خریدید و تحویل گرفتید، می‌توانید دیدگاه و امتیاز تازگی ثبت کنید. فقط دیدگاه خریدارهای واقعی نمایش داده می‌شود.
      </p>
    );
  return (
    <form
      className="space-y-3 rounded-control bg-surface-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim().length < 10) return showToast("دیدگاه را کمی کامل‌تر بنویسید.");
        setBusy(true);
        try {
          await api.call(`listings/${encodeURIComponent(listingId)}/reviews`, { method: "POST", body: { orderId: order.id, rating, freshnessRating: fresh, text: text.trim() } });
          setSent(true);
          showToast("دیدگاه شما ثبت شد و پس از بررسی نمایش داده می‌شود.");
        } catch (err) {
          showToast(apiErrorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-bold">دیدگاه خود را بنویسید</p>
      <Stars label="امتیاز کلی" value={rating} onChange={setRating} />
      <Stars label="تازگی هنگام تحویل" value={fresh} onChange={setFresh} />
      <Field label="متن دیدگاه" htmlFor={`rv-${listingId}`}>
        <Textarea id={`rv-${listingId}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="طعم، تازگی، بسته‌بندی و زمان رسیدن چطور بود؟" />
      </Field>
      <Button type="submit" disabled={busy}>
        ثبت دیدگاه
      </Button>
    </form>
  );
}

interface Answered {
  id: string;
  question: string;
  answer: string;
  answeredAt: string;
}

/** Questions answered by the shop, plus the signed-in user's own questions still waiting. */
export function ApiQandA({ listingId, shopName }: { listingId: string; shopName: string }) {
  const { api, user, showToast } = useStore();
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [mine, setMine] = useState<Array<{ id: string; question: string; status: string }>>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/v1/listings/${encodeURIComponent(listingId)}/questions`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Answered[]>) : []))
      .then(setAnswered)
      .catch(() => setAnswered([]));
  }, [listingId]);
  useEffect(() => {
    if (!user) return;
    api
      .call<Array<{ id: string; listingId: string; question: string; status: string }>>("me/questions")
      .then((list) => setMine(list.filter((x) => x.listingId === listingId && x.status === "OPEN")))
      .catch(() => setMine([]));
  }, [api, user, listingId]);

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {mine.map((m) => (
          <li key={m.id} className="py-3 text-sm">
            <p className="flex items-start gap-2 font-bold">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              {m.question}
            </p>
            <p className="ms-6 mt-1 text-xs text-warn">در انتظار پاسخ {shopName}</p>
          </li>
        ))}
        {answered.map((x) => (
          <li key={x.id} className="py-3 text-sm">
            <p className="flex items-start gap-2 font-bold">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              {x.question}
            </p>
            <p className="ms-6 mt-1 leading-7 text-ink">
              <span className="text-xs font-bold text-brand">پاسخ {shopName}: </span>
              {x.answer}
            </p>
            <RelativeDay date={x.answeredAt} className="ms-6 text-xs text-ink-soft" />
          </li>
        ))}
        {!mine.length && !answered.length ? <li className="py-3 text-sm text-ink-soft">هنوز پرسشی ثبت نشده است.</li> : null}
      </ul>
      {user ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (q.trim().length < 8) return showToast("پرسش را کامل‌تر بنویسید.");
            try {
              const created = await api.call<{ id: string; question: string; status: string }>(`listings/${encodeURIComponent(listingId)}/questions`, { method: "POST", body: { question: q.trim() } });
              setMine((list) => [created, ...list]);
              setQ("");
              showToast("پرسش شما برای غرفه‌دار فرستاده شد.");
            } catch (err) {
              showToast(apiErrorMessage(err));
            }
          }}
        >
          <label htmlFor={`qa-${listingId}`} className="sr-only">
            پرسش شما
          </label>
          <input
            id={`qa-${listingId}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="پرسشی درباره‌ی این محصول دارید؟"
            className="min-h-11 flex-1 rounded-control border border-line-strong bg-surface px-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
          <Button type="submit">ثبت پرسش</Button>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">
          برای پرسیدن <Link href="/login" className="font-bold text-brand hover:underline">وارد شوید</Link>.
        </p>
      )}
    </div>
  );
}
