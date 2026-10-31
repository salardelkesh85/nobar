"use client";

import { cityById, destinationCities, provinceById } from "@nobar/demo";
import { cn } from "@nobar/ui";
import { Check, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

export function CityPicker({ compact }: { compact?: boolean }) {
  const { dest, setDest } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const city = cityById(dest);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("nobar-city-picker inline-flex min-h-11 items-center gap-1.5", compact && "nobar-city-picker-compact")} aria-haspopup="dialog">
        <MapPin className="size-4" aria-hidden />
        <span className="nobar-city-caption">ارسال به</span>
        <span className="font-extrabold">{city?.name}</span>
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
        aria-labelledby="city-picker-title"
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 id="city-picker-title" className="text-lg font-extrabold">محصول را به کدام شهر بفرستیم؟</h2>
          <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="بستن"><X className="size-5" /></button>
        </div>
        <p className="px-4 pt-3 text-sm text-ink-soft">نوبر محصولاتی را نشان می‌دهد که امکان ارسال به شهر انتخابی را دارند.</p>
        <ul className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto p-4">
          {destinationCities().map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { setDest(c.id); setOpen(false); }} className={cn("flex min-h-12 w-full items-center justify-between rounded-control border px-3 text-start", c.id === dest ? "border-brand bg-brand-soft" : "border-line hover:border-brand")} aria-pressed={c.id === dest}>
                <span><span className="block font-bold">{c.name}</span><span className="block text-xs text-ink-soft">{provinceById(c.provinceId)?.name}</span></span>
                {c.id === dest ? <Check className="size-5 text-brand" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
