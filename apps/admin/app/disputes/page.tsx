"use client";

import { DISPUTE_REASON_FA, DISPUTE_STATUS_FA, DISPUTES, itemsTotal, SHOP_ORDERS, shopById } from "@nobar/demo";
import { formatFaNumber, formatToman, toEnDigits } from "@nobar/fa";
import { Badge, Button, Card, Input, RelativeDay, Toman } from "@nobar/ui";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useDecisions } from "@/components/decisions";
import { useToast } from "@/components/shell";

type D = { refundRial: number; note: string };

export default function DisputesPage() {
  const [decisions, decide] = useDecisions<D>("admin_disputes");
  const toast = useToast();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">داوری شکایت‌ها</h1>
      <ul className="space-y-3">
        {DISPUTES.map((d) => {
          const order = SHOP_ORDERS.find((o) => o.code === d.orderCode);
          const paid = order ? itemsTotal(order) + order.shippingRial : 0;
          const decision = decisions[d.id];
          return (
            <li key={d.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold" dir="ltr">{d.id}</span>
                  <Badge tone="nobar">{DISPUTE_REASON_FA[d.reason]}</Badge>
                  <Badge tone={decision ? "brand" : d.status === "AWAITING_STAFF" ? "saffron" : "neutral"}>{decision ? "حل شد" : DISPUTE_STATUS_FA[d.status]}</Badge>
                  <span className="text-sm text-ink-soft">
                    {shopById(d.shopId)?.name} · سفارش <span dir="ltr">{d.orderCode}</span>
                  </span>
                  <RelativeDay date={d.openedAt} className="ms-auto text-xs text-ink-soft" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-control bg-surface-2 p-3 text-sm">
                    <p className="font-bold">خریدار</p>
                    <p className="mt-1 leading-7">{d.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-ink-soft">
                      <ImageIcon className="size-4" aria-hidden /> {formatFaNumber(d.photos)} عکس · درخواست <Toman rial={d.requestedRial} />
                    </p>
                  </div>
                  <div className="rounded-control bg-surface-2 p-3 text-sm">
                    <p className="font-bold">غرفه‌دار</p>
                    <p className="mt-1 leading-7">{d.sellerResponse ?? "هنوز پاسخ نداده (مهلت ۱۲ ساعت)."}</p>
                    {d.sellerOfferRial ? (
                      <p className="mt-1 text-ink-soft">
                        پیشنهاد بازپرداخت: <Toman rial={d.sellerOfferRial} />
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-ink-soft">
                  سقف بازپرداخت: مبلغ پرداختی این سفارش <Toman rial={paid} />. بازپرداخت به کیف پول خریدار می‌رود و از سهم غرفه کم می‌شود.
                </p>
                {decision ? (
                  <p className="rounded-control bg-brand-soft p-3 text-sm">
                    رأی: بازپرداخت {formatToman(decision.refundRial)} — {decision.note}
                  </p>
                ) : d.status === "AWAITING_STAFF" ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const toman = Number(toEnDigits(amounts[d.id] ?? "").replace(/[^\d]/g, ""));
                      const rial = toman * 10;
                      if (rial > paid) return toast("بازپرداخت نمی‌تواند از مبلغ پرداختی بیشتر باشد.");
                      if (!notes[d.id]?.trim()) return toast("دلیل رأی را بنویسید؛ برای هر دو طرف فرستاده می‌شود.");
                      decide(d.id, { refundRial: rial, note: notes[d.id]! });
                      toast("رأی ثبت شد و به هر دو طرف اطلاع داده شد.");
                    }}
                  >
                    <label className="text-sm font-bold">
                      مبلغ بازپرداخت (تومان)
                      <Input inputMode="numeric" className="mt-1 w-44" value={amounts[d.id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [d.id]: e.target.value }))} placeholder="۰ یعنی بدون بازپرداخت" />
                    </label>
                    <label className="flex-1 text-sm font-bold">
                      دلیل رأی
                      <Input className="mt-1" value={notes[d.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))} />
                    </label>
                    <Button type="submit">ثبت رأی</Button>
                  </form>
                ) : (
                  <p className="text-sm text-ink-soft">منتظر پاسخ غرفه‌دار؛ بعد از ۱۲ ساعت خودکار به داوری می‌آید.</p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
