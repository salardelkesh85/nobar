"use client";

import { listingById, produceTypeById } from "@nobar/demo";
import { buttonClass, cn, ProduceArt } from "@nobar/ui";
import { House, LayoutGrid, Mic, Scale, ShoppingBasket, Sprout, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toFaDigits } from "@nobar/fa";
import { useStore } from "@/lib/store";

export function CartCount({ className }: { className?: string }) {
  const { cart, ready } = useStore();
  const n = cart.reduce((s, i) => s + i.qty, 0);
  if (!ready || n === 0) return null;
  return (
    <span className={cn("grid min-w-5 place-items-center rounded-full bg-nobar px-1 text-[0.7rem] font-bold leading-5 text-white dark:text-bg", className)}>
      {toFaDigits(n)}
      <span className="sr-only">قلم در سبد</span>
    </span>
  );
}

const NAV = [
  { href: "/", label: "خانه", icon: House },
  { href: "/categories", label: "دسته‌ها", icon: LayoutGrid },
  { href: "/baghboon", label: "باغبون", icon: Sprout },
  { href: "/cart", label: "سبد", icon: ShoppingBasket },
  { href: "/me", label: "من", icon: User },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="منوی اصلی" className="fixed inset-x-3 bottom-3 z-40 mb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="glass mx-auto grid max-w-md grid-cols-5 items-end rounded-[1.75rem] border border-line/80 px-1.5 shadow-float">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          if (href === "/baghboon")
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 mb-1.5 flex flex-col items-center gap-0.5 text-[0.7rem] font-bold text-brand-strong"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-lift ring-4 ring-bg transition-transform active:scale-95">
                    <Icon className="size-7" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] transition-colors", active ? "font-bold text-brand-strong" : "text-ink-soft")}
              >
                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-soft")}>
                  <Icon className="size-[1.35rem]" aria-hidden />
                </span>
                {label}
                {href === "/cart" ? <CartCount className="absolute end-[calc(50%-1.6rem)] top-1.5" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  const path = usePathname();
  return (
    <nav aria-label="منوی اصلی" className="hidden items-center gap-1 md:flex">
      {NAV.slice(1).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn("relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors", path.startsWith(href) ? "bg-brand-soft font-bold text-brand-strong" : "text-ink hover:bg-surface-2")}
        >
          <Icon className="size-5" aria-hidden />
          {label}
          {href === "/cart" ? <CartCount /> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 md:bottom-6">
      {toast ? <div className="animate-rise rounded-full bg-ink px-5 py-3 text-sm font-bold text-bg shadow-float">{toast}</div> : null}
    </div>
  );
}

/** Floating tray for the comparison tool (2–4 offers). */
export function CompareTray() {
  const { compare, toggleCompare, clearCompare, ready } = useStore();
  const path = usePathname();
  if (!ready || compare.length === 0 || path.startsWith("/compare") || path.startsWith("/checkout")) return null;
  return (
    <div className="fixed inset-x-0 bottom-26 z-40 px-3 md:bottom-4">
      <div className="glass animate-rise mx-auto flex max-w-2xl items-center gap-3 rounded-card border border-brand/30 p-3 shadow-float">
        <Scale className="size-6 shrink-0 text-brand" aria-hidden />
        <ul className="flex flex-1 gap-2 overflow-x-auto scrollbar-none" aria-label="محصولات انتخاب‌شده برای مقایسه">
          {compare.map((id) => {
            const l = listingById(id);
            const pt = l ? produceTypeById(l.produceTypeId) : undefined;
            if (!l || !pt) return null;
            return (
              <li key={id} className="relative shrink-0">
                <ProduceArt emoji={pt.emoji} hue={pt.hue} kind={pt.id} size="sm" className="size-11 rounded-control" label={l.title} />
                <button
                  type="button"
                  onClick={() => toggleCompare(id)}
                  className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-bg"
                  aria-label={`حذف ${l.title} از مقایسه`}
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={clearCompare} className="text-xs text-ink-soft underline-offset-4 hover:underline">
          پاک کردن
        </button>
        <Link href={`/compare?ids=${compare.join(",")}`} className={buttonClass("primary", "md", compare.length < 2 ? "pointer-events-none opacity-50" : "")} aria-disabled={compare.length < 2}>
          مقایسه ({toFaDigits(compare.length)})
        </Link>
      </div>
    </div>
  );
}

/** حالت ساده: one big voice button that opens Baghboon. */
export function SimpleVoiceFab() {
  const { simple, ready } = useStore();
  const path = usePathname();
  if (!ready || !simple || path.startsWith("/baghboon")) return null;
  return (
    <Link
      href="/baghboon?voice=1"
      className="fixed bottom-28 start-4 z-40 flex min-h-16 items-center gap-2 rounded-full bg-brand px-6 text-lg font-extrabold text-on-brand shadow-float md:bottom-6"
    >
      <Mic className="size-7" aria-hidden />
      بگویید چه می‌خواهید
    </Link>
  );
}
