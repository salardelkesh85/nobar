"use client";

import { DISPUTE_REASON_FA, type DisputeReason } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Button, cn, Field, Textarea } from "@nobar/ui";
import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";

// Reasons that need photo evidence (docs/02 §14 disputes.policies).
const NEEDS_PHOTO: DisputeReason[] = ["SPOILED", "DAMAGED", "UNDERWEIGHT", "WRONG_ITEM"];

/** Buyer's complaint for one shop order, within the complaint window. */
export function DisputeForm({ onSubmit, onCancel }: { onSubmit: (summary: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<DisputeReason>("SPOILED");
  const [text, setText] = useState("");
  const [refund, setRefund] = useState<"FULL_REFUND" | "PARTIAL_REFUND">("PARTIAL_REFUND");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  return (
    <form
      className="space-y-4 rounded-control border border-nobar/30 bg-nobar-soft/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (NEEDS_PHOTO.includes(reason) && photos.length === 0) return setError("برای این مورد دست‌کم یک عکس لازم است.");
        if (text.trim().length < 10) return setError("کمی بیشتر توضیح دهید.");
        onSubmit(`${DISPUTE_REASON_FA[reason]} · ${refund === "FULL_REFUND" ? "بازپرداخت کامل" : "بازپرداخت بخشی"}`);
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-bold">چه مشکلی پیش آمده؟</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(DISPUTE_REASON_FA) as DisputeReason[]).map((r) => (
            <label key={r} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm", reason === r ? "border-nobar bg-surface font-bold" : "border-line bg-surface")}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-[var(--nobar)]" />
              {DISPUTE_REASON_FA[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="توضیح" htmlFor="dispute-text">
        <Textarea id="dispute-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً حدود یک کیلو از جعبه له شده بود." />
      </Field>
      <div>
        <p className="mb-2 text-sm font-bold">
          عکس {NEEDS_PHOTO.includes(reason) ? <span className="font-normal text-nobar">(لازم)</span> : <span className="font-normal text-ink-soft">(اختیاری)</span>}
        </p>
        <input
          ref={file}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
            setPhotos((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={src} className="relative size-20 overflow-hidden rounded-control">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`عکس ${toFaDigits(i + 1)}`} className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== src))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white" aria-label="حذف عکس">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < 5 ? (
            <button type="button" onClick={() => file.current?.click()} className="flex size-20 flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-line-strong bg-surface text-xs text-ink-soft hover:border-nobar">
              <Camera className="size-6" aria-hidden />
              افزودن عکس
            </button>
          ) : null}
        </div>
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-2 font-bold">درخواست شما</legend>
        {(
          [
            ["PARTIAL_REFUND", "بازپرداخت بخشی"],
            ["FULL_REFUND", "بازپرداخت کامل"],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className="flex items-center gap-2">
            <input type="radio" name="refund" checked={refund === v} onChange={() => setRefund(v)} className="size-4 accent-[var(--nobar)]" />
            {l}
          </label>
        ))}
      </fieldset>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs leading-6 text-ink-soft">غرفه‌دار ۱۲ ساعت فرصت پاسخ دارد. اگر توافق نشد، کارشناس نوبر داوری می‌کند. بازپرداخت به کیف پول انجام می‌شود.</p>
      <div className="flex gap-2">
        <Button type="submit" variant="nobar">
          ثبت گزارش
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
