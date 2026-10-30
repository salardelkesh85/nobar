import { formatFaNumber } from "@nobar/fa";
import { Star } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Toman, Weight } from "./format";
import { hasIllustration, ProduceIllustration } from "./illustrations";
import { Badge, cn } from "./primitives";

/** Two-leaf mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 35 C20 24 21 16 27 9" fill="none" stroke="var(--brand-strong)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21.5 22 C 11 24, 5 17, 5 8 C 14 7.5, 21 13, 21.5 22 Z" fill="var(--brand)" />
      <path d="M22.5 18 C 25 9, 31 5, 37 5 C 37.5 13, 32 19.5, 22.5 18 Z" fill="var(--brand-strong)" />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-9" />
      <span className="flex flex-col leading-none">
        <span className="text-2xl font-black text-brand-strong">نوبر</span>
        {subtitle ? <span className="mt-1 text-[0.7rem] font-bold text-ink-soft">{subtitle}</span> : null}
      </span>
    </span>
  );
}

/**
 * Produce artwork tile: soft tint + hand-drawn illustration (falls back to the emoji).
 * Real seller photos replace it once the media module exists.
 */
export function ProduceArt({
  emoji,
  hue,
  kind,
  className,
  label,
  size = "md",
  float,
}: {
  emoji: string;
  hue: number;
  kind?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  float?: boolean;
}) {
  const text = size === "sm" ? "text-3xl" : size === "md" ? "text-5xl" : size === "lg" ? "text-7xl" : "text-8xl";
  const art = kind && hasIllustration(kind) ? kind : null;
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("produce-art grid place-items-center overflow-hidden", className)}
      style={{ "--h": hue } as CSSProperties}
    >
      {art ? (
        <ProduceIllustration
          kind={art}
          className={cn("produce-shadow aspect-square w-[62%] max-w-56 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3", float && "animate-float")}
        />
      ) : (
        <span className={cn(text, "drop-shadow-sm select-none")}>{emoji}</span>
      )}
    </div>
  );
}

export type FreshnessLevel = "FRESH_PICKED" | "FRESH" | "GOOD" | "PREORDER" | "NOT_FRESH";

export const FRESHNESS_FA: Record<FreshnessLevel, string> = {
  FRESH_PICKED: "تازه‌چین",
  FRESH: "تازه",
  GOOD: "مناسب",
  PREORDER: "پیش‌فروش",
  NOT_FRESH: "خارج از تازگی",
};

export function FreshnessBadge({ level, detail, className }: { level: FreshnessLevel; detail?: string; className?: string }) {
  const tone = level === "FRESH_PICKED" ? "solid" : level === "FRESH" ? "brand" : level === "GOOD" ? "saffron" : level === "PREORDER" ? "neutral" : "danger";
  return (
    <Badge tone={tone} className={className}>
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        <path d="M6 11 C6 7 6.5 4 9 1.5 M6.4 7 C3 7.5 1 5 1 2 C4 2 6.2 4 6.4 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      {FRESHNESS_FA[level]}
      {detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
    </Badge>
  );
}

/** Freshness meter: share of shelf life left, 0–1. */
export function FreshnessMeter({ ratio, label }: { ratio: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  const color = ratio >= 0.6 ? "bg-brand" : ratio >= 0.3 ? "bg-saffron" : "bg-nobar";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
        <span>تازه‌سنج</span>
        <span>{label}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-label="تازه‌سنج"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${formatFaNumber(pct)} درصد عمر تازگی باقی است`}
      >
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NobarBadge({ className, children = "نوبر شد!" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-nobar px-2.5 py-0.5 text-xs font-extrabold text-white dark:text-bg", className)}>
      <span aria-hidden>●</span>
      {children}
    </span>
  );
}

export function RatingStars({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-saffron text-saffron" aria-hidden />
      <span className="font-bold">{formatFaNumber(Math.round(value * 10) / 10)}</span>
      {count !== undefined ? <span className="text-ink-soft">({formatFaNumber(count)} نظر)</span> : null}
      <span className="sr-only">امتیاز از ۵</span>
    </span>
  );
}

/** Package price plus price per kilogram. */
export function PriceTag({
  priceRial,
  label,
  perKgRial,
  netGrams,
  size = "md",
}: {
  priceRial: number;
  label?: string;
  perKgRial?: number | null;
  netGrams?: number | null;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-col">
      <span className={cn("font-extrabold text-ink", size === "lg" ? "text-2xl" : "text-base")}>
        <Toman rial={priceRial} />
      </span>
      <span className="text-xs text-ink-soft">
        {label ? <>{label}</> : netGrams ? <Weight grams={netGrams} /> : null}
        {perKgRial ? (
          <>
            {" · "}هر کیلو <Toman rial={perKgRial} />
          </>
        ) : null}
      </span>
    </div>
  );
}
