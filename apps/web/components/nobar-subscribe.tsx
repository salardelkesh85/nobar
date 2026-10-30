"use client";

import { cn } from "@nobar/ui";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const KEY = "nobar_alerts";

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** «نوبر شد!» subscription for a produce type (stored locally in the demo). */
export function NobarSubscribe({ produceTypeId, name, withLabel }: { produceTypeId: string; name: string; withLabel?: boolean }) {
  const { showToast } = useStore();
  const [on, setOn] = useState(false);
  useEffect(() => setOn(load().includes(produceTypeId)), [produceTypeId]);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        const list = load();
        const next = on ? list.filter((x) => x !== produceTypeId) : [...list, produceTypeId];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        setOn(!on);
        showToast(on ? `خبر نوبر ${name} خاموش شد.` : `وقتی اولین ${name} فصل برسد، خبرتان می‌کنیم.`);
      }}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-bold",
        on ? "bg-nobar-soft text-nobar" : "text-ink-soft hover:bg-surface-2",
      )}
      aria-label={withLabel ? undefined : on ? `لغو خبر نوبر ${name}` : `خبرم کن وقتی ${name} نوبر شد`}
    >
      {on ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
      {withLabel ? (on ? "خبرتان می‌کنیم" : "نوبر شد، خبرم کن") : null}
    </button>
  );
}
