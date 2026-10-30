"use client";

import { DISPUTE_REASON_FA, DISPUTES, listingById, reviewsForShop } from "@nobar/demo";
import { Badge, Button, Card, RatingStars, RelativeDay, Textarea, Toman } from "@nobar/ui";
import { useState } from "react";
import { SHOP_ID, useSeller } from "@/lib/state";

export default function ReviewsPage() {
  const { showToast } = useSeller();
  const reviews = reviewsForShop(SHOP_ID);
  const disputes = DISPUTES.filter((d) => d.shopId === SHOP_ID);
  const [replies, setReplies] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">نظرها و شکایت‌ها</h1>

      {disputes.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold">شکایت‌های باز</h2>
          {disputes.map((d) => (
            <Card key={d.id} className="space-y-3 border-2 border-nobar/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="nobar">{DISPUTE_REASON_FA[d.reason]}</Badge>
                <span className="text-sm" dir="ltr">{d.orderCode}</span>
                <RelativeDay date={d.openedAt} className="ms-auto text-xs text-ink-soft" />
              </div>
              <p className="leading-7">{d.description}</p>
              <p className="text-sm text-ink-soft">
                خریدار درخواست بازپرداخت <Toman rial={d.requestedRial} className="font-bold text-ink" /> دارد · {d.photos.toLocaleString("fa-IR")} عکس پیوست شده
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => showToast("بازپرداخت پذیرفته شد؛ مبلغ از سهم این سفارش کم می‌شود.")}>پذیرفتن بازپرداخت</Button>
                <Button variant="secondary" onClick={() => showToast("پیشنهاد شما برای خریدار فرستاده شد.")}>پیشنهاد مبلغ کمتر</Button>
                <Button variant="ghost" onClick={() => showToast("پرونده برای داوری نوبر فرستاده شد.")}>ارجاع به داوری</Button>
              </div>
              <p className="text-xs text-ink-soft">تا ۱۲ ساعت فرصت پاسخ دارید؛ بعد از آن پرونده خودکار به داوری نوبر می‌رود.</p>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">نظر خریدارها</h2>
        {reviews.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">{r.buyerName}</span>
              <span className="text-ink-soft">{listingById(r.listingId)?.title}</span>
              <RatingStars value={r.rating} />
              <RelativeDay date={r.createdAt} className="ms-auto text-xs text-ink-soft" />
            </div>
            <p className="leading-7">{r.text}</p>
            {r.sellerReply ? (
              <p className="rounded-control bg-surface-2 p-3 text-sm">
                <span className="font-bold">پاسخ شما: </span>
                {r.sellerReply}
              </p>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!replies[r.id]?.trim()) return;
                  showToast("پاسخ شما ثبت شد.");
                }}
              >
                <label htmlFor={`reply-${r.id}`} className="sr-only">
                  پاسخ به {r.buyerName}
                </label>
                <Textarea id={`reply-${r.id}`} rows={2} placeholder="پاسخ کوتاه و محترمانه…" value={replies[r.id] ?? ""} onChange={(e) => setReplies((s) => ({ ...s, [r.id]: e.target.value }))} />
                <Button type="submit" size="sm">
                  ثبت پاسخ
                </Button>
              </form>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
