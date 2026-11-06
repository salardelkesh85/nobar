"use client";

import type { OrderDto } from "@nobar/contracts";
import { DISPUTE_REASON_FA, type Review } from "@nobar/demo";
import { toEnDigits } from "@nobar/fa";
import { Badge, Button, Card, Input, RatingStars, RelativeDay, Skeleton, Textarea, Toman } from "@nobar/ui";
import { useCallback, useEffect, useState } from "react";
import { errorText, useSeller } from "@/lib/state";

type SellerReview = Review & { status: string; flags: string[] };
interface Question {
  id: string;
  listingId: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
}

/** API mode: open complaints (answer with an optional offer), reviews (reply) and product questions (answer). */
export function ApiReviews() {
  const { client, listings, showToast } = useSeller();
  const [disputed, setDisputed] = useState<OrderDto[] | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState<Record<string, string>>({});
  const [offer, setOffer] = useState<Record<string, string>>({});
  const title = (id: string) => listings.find((l) => l.id === id)?.title ?? "";

  const load = useCallback(async () => {
    try {
      const [d, r, q] = await Promise.all([
        client.call<OrderDto[]>("seller/orders?status=DISPUTED"),
        client.call<SellerReview[]>("seller/reviews"),
        client.call<Question[]>("seller/questions"),
      ]);
      setDisputed(d);
      setReviews(r);
      setQuestions(q);
    } catch (e) {
      showToast(errorText(e));
      setDisputed([]);
    }
  }, [client, showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async (path: string, body: unknown, done: string) => {
    try {
      await client.call(path, { method: "POST", body });
      showToast(done);
      await load();
    } catch (e) {
      showToast(errorText(e));
    }
  };

  if (!disputed) return <Skeleton className="h-96 w-full" />;
  const open = disputed.filter((o) => o.dispute?.status === "AWAITING_SELLER" || o.dispute?.status === "AWAITING_STAFF");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">نظرها و شکایت‌ها</h1>

      {open.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold">شکایت‌های باز</h2>
          {open.map((o) => {
            const d = o.dispute!;
            return (
              <Card key={o.id} className="space-y-3 border-2 border-nobar/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="nobar">{DISPUTE_REASON_FA[d.reason]}</Badge>
                  <span className="text-sm" dir="ltr">
                    {o.code}
                  </span>
                  <RelativeDay date={d.openedAt} className="ms-auto text-xs text-ink-soft" />
                </div>
                <p className="leading-7">{d.description}</p>
                <p className="text-sm text-ink-soft">
                  خریدار درخواست بازپرداخت <Toman rial={d.requestedRial} className="font-bold text-ink" /> دارد.
                </p>
                {d.status === "AWAITING_SELLER" ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = text[o.id]?.trim() ?? "";
                      if (t.length < 5) return showToast("پاسخ را کمی کامل‌تر بنویسید.");
                      const toman = Number(toEnDigits(offer[o.id] ?? "").replace(/\D/g, ""));
                      void send(`seller/orders/${o.id}/dispute/answer`, { response: t, ...(toman ? { offerRial: toman * 10 } : {}) }, "پاسخ شما ثبت شد و برای داوری نوبر رفت.");
                    }}
                  >
                    <Textarea rows={2} aria-label="پاسخ به شکایت" placeholder="توضیح شما برای خریدار و کارشناس نوبر…" value={text[o.id] ?? ""} onChange={(e) => setText((s) => ({ ...s, [o.id]: e.target.value }))} />
                    <Input aria-label="مبلغ پیشنهادی (تومان)" placeholder="مبلغ پیشنهادی بازپرداخت (تومان، اختیاری)" inputMode="numeric" className="sm:max-w-72" value={offer[o.id] ?? ""} onChange={(e) => setOffer((s) => ({ ...s, [o.id]: e.target.value }))} />
                    <Button type="submit" size="sm">
                      ثبت پاسخ
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-ink-soft">پاسخ شما ثبت شده؛ کارشناس نوبر تصمیم می‌گیرد.</p>
                )}
              </Card>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">پرسش‌های خریدارها</h2>
        {questions.length === 0 ? <p className="text-sm text-ink-soft">پرسشی نیست.</p> : null}
        {questions.map((q) => (
          <Card key={q.id} className="space-y-2 p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">{q.question}</span>
              <span className="text-ink-soft">{title(q.listingId)}</span>
              <RelativeDay date={q.createdAt} className="ms-auto text-xs text-ink-soft" />
            </p>
            {q.answer ? (
              <p className="rounded-control bg-surface-2 p-3 text-sm">
                <span className="font-bold">پاسخ شما: </span>
                {q.answer}
              </p>
            ) : (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = text[q.id]?.trim() ?? "";
                  if (t.length < 2) return;
                  void send(`seller/questions/${q.id}/answer`, { answer: t }, "پاسخ شما منتشر شد.");
                }}
              >
                <Input aria-label="پاسخ" className="flex-1" value={text[q.id] ?? ""} onChange={(e) => setText((s) => ({ ...s, [q.id]: e.target.value }))} />
                <Button type="submit" size="sm">
                  پاسخ
                </Button>
              </form>
            )}
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">نظر خریدارها</h2>
        {reviews.length === 0 ? <p className="text-sm text-ink-soft">هنوز نظری ثبت نشده است.</p> : null}
        {reviews.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">{r.buyerName}</span>
              <span className="text-ink-soft">{title(r.listingId)}</span>
              <RatingStars value={r.rating} />
              {r.status === "PENDING" ? <Badge tone="saffron">در انتظار تأیید نوبر</Badge> : null}
              <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
            </div>
            <p className="leading-7">{r.text}</p>
            {r.sellerReply ? (
              <p className="rounded-control bg-surface-2 p-3 text-sm">
                <span className="font-bold">پاسخ شما: </span>
                {r.sellerReply}
              </p>
            ) : r.status === "PUBLISHED" ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = text[r.id]?.trim() ?? "";
                  if (t.length < 2) return;
                  void send(`seller/reviews/${r.id}/reply`, { reply: t }, "پاسخ شما ثبت شد.");
                }}
              >
                <Textarea rows={2} aria-label={`پاسخ به ${r.buyerName}`} placeholder="پاسخ کوتاه و محترمانه…" value={text[r.id] ?? ""} onChange={(e) => setText((s) => ({ ...s, [r.id]: e.target.value }))} />
                <Button type="submit" size="sm">
                  ثبت پاسخ
                </Button>
              </form>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
