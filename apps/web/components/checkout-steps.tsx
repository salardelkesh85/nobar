import { cn } from "@nobar/ui";
import { CreditCard, MapPin, ShoppingCart } from "lucide-react";

const STEPS = [
  { label: "سبد خرید", icon: ShoppingCart },
  { label: "آدرس و ارسال", icon: MapPin },
  { label: "پرداخت", icon: CreditCard },
];

/** Cart → shipping → payment progress bar. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mb-4 flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-sm" aria-label="مراحل خرید">
      {STEPS.map(({ label, icon: Icon }, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", i <= current ? "font-bold text-brand" : "text-ink-soft")} aria-current={i === current ? "step" : undefined}>
            <Icon className="size-5" aria-hidden />
            {label}
          </span>
          {i < STEPS.length - 1 ? <span className={cn("h-0.5 flex-1 rounded-full", i < current ? "bg-brand" : "bg-line-strong")} aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}
