import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { extendTailwindMerge } from "tailwind-merge";

/** Class merger that knows the Nobar tokens, so a passed `bg-brand-soft` replaces a default `bg-surface`. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "bg", "surface", "surface-2", "surface-3", "ink", "ink-soft", "line", "line-strong",
        "brand", "brand-strong", "brand-soft", "brand-solid", "on-brand", "nobar", "nobar-soft", "nobar-solid",
        "saffron", "saffron-soft", "warn", "warn-soft", "danger", "danger-soft", "cream",
      ],
      radius: ["card", "control", "tile"],
      shadow: ["soft", "lift", "float"],
    },
  },
});

export const cn = (...parts: Array<string | false | null | undefined>): string => twMerge(parts.filter(Boolean).join(" "));

type Variant = "primary" | "secondary" | "ghost" | "danger" | "nobar" | "onDark" | "outlineOnDark";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_6px_16px_-6px_rgb(var(--shadow-color)/0.45)] hover:bg-brand-strong dark:hover:bg-brand-strong",
  secondary: "bg-surface text-ink border border-line-strong shadow-soft hover:border-brand hover:text-brand-strong",
  ghost: "text-brand-strong hover:bg-brand-soft",
  danger: "bg-danger-soft text-danger border border-transparent hover:border-danger",
  nobar: "bg-nobar text-white shadow-soft hover:opacity-90 dark:text-bg",
  /** on the dark-green hero */
  onDark: "bg-white text-brand-strong hover:bg-cream dark:bg-brand dark:text-on-brand dark:hover:bg-brand-strong",
  outlineOnDark: "text-white ring-1 ring-white/50 hover:bg-white/10 dark:text-ink dark:ring-line dark:hover:bg-surface-2",
};
const SIZE: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-sm gap-1.5",
  md: "min-h-11 px-5 text-sm gap-2",
  lg: "min-h-13 px-7 text-base gap-2.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string): string {
  return cn(
    "n-ui-button inline-flex items-center justify-center rounded-control font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

type Tone = "brand" | "nobar" | "saffron" | "neutral" | "warn" | "danger" | "solid";
const TONE: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/15",
  nobar: "bg-nobar-soft text-nobar ring-1 ring-inset ring-nobar/15",
  saffron: "bg-saffron-soft text-warn",
  neutral: "bg-surface-2 text-ink-soft",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  solid: "bg-brand text-on-brand",
};

export function Badge({ tone = "brand", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] leading-none font-bold whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("n-ui-card rounded-card border border-line bg-surface shadow-soft", className)} {...rest} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-surface-2", className)} />;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="n-ui-section-header mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="n-ui-empty flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      {icon ? <div className="text-4xl text-brand">{icon}</div> : null}
      <h3 className="text-lg font-bold">{title}</h3>
      {body ? <p className="max-w-md text-ink-soft">{body}</p> : null}
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "n-ui-input min-h-11 w-full rounded-control border border-line-strong bg-surface px-3.5 text-ink shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04)] transition-shadow placeholder:text-ink-soft/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "py-2 leading-7", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pe-8", className)} {...rest} />;
}

export function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "brand" | "nobar" | "warn" }) {
  const ring = tone === "brand" ? "border-brand/40" : tone === "nobar" ? "border-nobar/40" : tone === "warn" ? "border-saffron/50" : "border-line";
  return (
    <div className={cn("n-ui-stat min-w-0 rounded-card border bg-surface p-4 shadow-soft", ring)}>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-ink sm:text-2xl [&_span]:whitespace-normal">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
