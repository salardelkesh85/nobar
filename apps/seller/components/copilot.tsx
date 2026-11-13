"use client";

import { formatToman } from "@nobar/fa";
import { Badge, Button } from "@nobar/ui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { errorText, useSeller } from "@/lib/state";

// Seller copilot (apps/api /v1/seller/copilot/*). Everything is advice: nothing here saves or publishes.

interface PriceAdvice {
  position: "BELOW" | "FAIR" | "ABOVE" | "UNKNOWN";
  market: { listings: number; p25PerKgRial: number; medianPerKgRial: number; p75PerKgRial: number } | null;
  yourPerKgRial: number | null;
  reasons: string[];
}
const POSITION_FA = { BELOW: "پایین‌تر از بازار", FAIR: "در بازه‌ی بازار", ABOVE: "بالاتر از بازار", UNKNOWN: "مقایسه ممکن نیست" } as const;

/** Where this listing's price sits in the market, on request. */
export function PriceAdviceButton({ listingId }: { listingId: string }) {
  const { client, showToast } = useSeller();
  const [advice, setAdvice] = useState<PriceAdvice | null>(null);
  const [busy, setBusy] = useState(false);
  if (advice)
    return (
      <div className="mt-3 space-y-1 rounded-control bg-brand-soft p-3 text-sm" role="status">
        <p className="flex flex-wrap items-center gap-2 font-bold">
          راهنمای قیمت <Badge tone={advice.position === "ABOVE" ? "saffron" : advice.position === "UNKNOWN" ? "neutral" : "brand"}>{POSITION_FA[advice.position]}</Badge>
        </p>
        {advice.market && advice.yourPerKgRial !== null ? (
          <p>
            هر کیلوی شما {formatToman(advice.yourPerKgRial)}؛ نیمی از بازار بین {formatToman(advice.market.p25PerKgRial)} و {formatToman(advice.market.p75PerKgRial)} (میانه {formatToman(advice.market.medianPerKgRial)}).
          </p>
        ) : null}
        {advice.reasons.map((r) => (
          <p key={r} className="text-ink-soft">
            {r}
          </p>
        ))}
      </div>
    );
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        client
          .call<PriceAdvice>(`seller/copilot/listings/${listingId}/price`)
          .then(setAdvice)
          .catch((e: unknown) => showToast(errorText(e)))
          .finally(() => setBusy(false));
      }}
    >
      <Sparkles className="size-4" aria-hidden />
      راهنمای قیمت
    </Button>
  );
}

/** Calls a copilot draft endpoint and hands the text to the form; the seller edits before sending. */
export function DraftButton<T>({ path, body, label, onDraft }: { path: string; body?: unknown; label: string; onDraft: (draft: T) => void }) {
  const { client, showToast } = useSeller();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        client
          .call<T>(path, { method: "POST", ...(body === undefined ? {} : { body }) })
          .then((d) => {
            onDraft(d);
            showToast("پیش‌نویس آماده شد؛ پیش از فرستادن آن را بخوانید و اصلاح کنید.");
          })
          .catch((e: unknown) => showToast(errorText(e)))
          .finally(() => setBusy(false));
      }}
    >
      <Sparkles className="size-4" aria-hidden />
      {busy ? "در حال نوشتن…" : label}
    </Button>
  );
}
