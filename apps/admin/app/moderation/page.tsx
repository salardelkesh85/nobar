"use client";

import { MODERATION_QUEUE } from "@nobar/demo";
import { Badge, Button, Card, RelativeDay } from "@nobar/ui";
import { useDecisions } from "@/components/decisions";
import { useToast } from "@/components/shell";

const SUBJECT_FA = { LISTING: "آگهی", REVIEW: "نظر", SHOP: "غرفه" } as const;
type D = "APPROVED" | "REJECTED" | "NEEDS_CHANGES";
const D_FA: Record<D, string> = { APPROVED: "تأیید شد", REJECTED: "رد شد", NEEDS_CHANGES: "برای اصلاح برگشت" };

export default function ModerationPage() {
  const [decisions, decide] = useDecisions<D>("admin_moderation");
  const toast = useToast();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">بررسی آگهی و نظر</h1>
      <p className="text-sm text-ink-soft">قاعده‌های خودکار این موارد را علامت زده‌اند. متن غرفه‌دار و خریدار داده‌ی نامطمئن است؛ تصمیم نهایی با کارشناس است و دلیلش ثبت می‌شود.</p>
      <ul className="space-y-3">
        {MODERATION_QUEUE.map((m) => (
          <li key={m.id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{SUBJECT_FA[m.subject]}</Badge>
                <span className="font-extrabold">{m.title}</span>
                <span className="text-sm text-ink-soft">{m.shopName}</span>
                <RelativeDay date={m.openedAt} className="ms-auto text-xs text-ink-soft" />
              </div>
              <div className="flex flex-wrap gap-1">
                {m.ruleHits.map((r) => (
                  <Badge key={r} tone="saffron">{r}</Badge>
                ))}
              </div>
              <blockquote className="rounded-control bg-surface-2 p-3 text-sm">«{m.excerpt}»</blockquote>
              {decisions[m.id] ? (
                <Badge tone={decisions[m.id] === "APPROVED" ? "brand" : "danger"}>{D_FA[decisions[m.id]!]}</Badge>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { decide(m.id, "APPROVED"); toast("تأیید شد."); }}>تأیید</Button>
                  <Button size="sm" variant="secondary" onClick={() => { decide(m.id, "NEEDS_CHANGES"); toast("برای اصلاح به غرفه‌دار برگشت."); }}>نیاز به اصلاح</Button>
                  <Button size="sm" variant="danger" onClick={() => { decide(m.id, "REJECTED"); toast("رد شد."); }}>رد</Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
