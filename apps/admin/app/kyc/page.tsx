"use client";

import { cityName, KYC_QUEUE, SHOP_TYPE_FA } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, Button, Card, Input, RelativeDay } from "@nobar/ui";
import { FileText, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useDecisions } from "@/components/decisions";
import { useToast } from "@/components/shell";

type D = { status: "APPROVED" | "REJECTED"; note?: string };

export default function KycPage() {
  const [decisions, decide] = useDecisions<D>("admin_kyc");
  const toast = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">تأیید هویت غرفه‌ها</h1>
      <p className="text-sm text-ink-soft">کد ملی و شبا فقط با چهار رقم آخر نمایش داده می‌شود. مدارک کامل فقط برای کارشناس مالی رمزگشایی می‌شود.</p>
      <ul className="space-y-3">
        {KYC_QUEUE.map((k) => {
          const d = decisions[k.id];
          return (
            <li key={k.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold">{k.shopName}</span>
                  <Badge tone="neutral">{SHOP_TYPE_FA[k.type]}</Badge>
                  <span className="text-sm text-ink-soft">
                    {k.ownerName} · {cityName(k.cityId)}
                  </span>
                  <RelativeDay date={k.submittedAt} className="ms-auto text-xs text-ink-soft" />
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-4">
                  <span>کد ملی: <span dir="ltr">••••••{k.nationalIdLast4}</span></span>
                  <span>شبا: <span dir="ltr">IR••…••{k.shebaLast4}</span></span>
                  <span className="flex items-center gap-1"><FileText className="size-4" aria-hidden /> {formatFaNumber(k.documents)} مدرک</span>
                  <span className="flex items-center gap-1"><ImageIcon className="size-4" aria-hidden /> {formatFaNumber(k.farmPhotos)} عکس باغ/مغازه</span>
                </div>
                {k.note ? <p className="rounded-control bg-warn-soft p-2 text-sm text-warn">یادداشت سیستم: {k.note}</p> : null}
                {d ? (
                  <Badge tone={d.status === "APPROVED" ? "brand" : "danger"}>{d.status === "APPROVED" ? "تأیید شد — غرفه فعال شد" : `رد شد${d.note ? `: ${d.note}` : ""}`}</Badge>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <Button onClick={() => { decide(k.id, { status: "APPROVED" }); toast("غرفه تأیید و فعال شد؛ پیامک برای غرفه‌دار فرستاده شد."); }}>تأیید هویت</Button>
                    <label className="flex-1 text-sm">
                      <span className="sr-only">دلیل رد</span>
                      <Input placeholder="دلیل رد (برای غرفه‌دار فرستاده می‌شود)" value={notes[k.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [k.id]: e.target.value }))} />
                    </label>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (!notes[k.id]?.trim()) return toast("دلیل رد را بنویسید.");
                        decide(k.id, { status: "REJECTED", note: notes[k.id] });
                        toast("درخواست رد شد.");
                      }}
                    >
                      رد
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
