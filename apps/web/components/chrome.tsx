"use client";

import { listingById, produceTypeById } from "@nobar/demo";
import { buttonClass, cn } from "@nobar/ui";
import { Photo } from "./photo";
import { House, LayoutGrid, LogIn, Mic, Scale, ShoppingBasket, ShoppingCart, Sprout, User, X } from "lucide-react";
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
    <nav aria-label="منوی اصلی" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-15 flex-col items-center justify-center gap-1 text-[0.7rem]", active ? "font-bold text-brand" : "text-ink-soft")}
              >
                <Icon className="size-6" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                {label}
                {href === "/cart" ? <CartCount className="absolute end-[calc(50%-1.5rem)] top-1.5" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Header actions: sign-in and cart (Digikala-style). */
export function HeaderActions() {
  return (
    <div className="ms-auto flex items-center gap-2">
      <Link href="/baghboon" className="hidden min-h-10 items-center gap-1.5 rounded-control px-3 text-sm font-bold text-brand hover:bg-brand-soft lg:inline-flex">
        <Sprout className="size-5" aria-hidden />
        باغبون
      </Link>
      <Link href="/me" className="hidden min-h-10 items-center gap-2 rounded-control border border-line-strong px-3 text-sm font-bold hover:bg-surface-2 md:inline-flex">
        <LogIn className="size-4" aria-hidden />
        ورود | ثبت‌نام
      </Link>
      <span className="hidden h-6 w-px bg-line-strong md:block" aria-hidden />
      <Link href="/cart" className="relative grid size-10 place-items-center rounded-control hover:bg-surface-2" aria-label="سبد خرید">
        <ShoppingCart className="size-6" strokeWidth={1.8} aria-hidden />
        <CartCount className="absolute -bottom-0.5 -start-0.5" />
      </Link>
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
      {toast ? <div className="animate-rise rounded-control bg-ink px-5 py-3 text-sm font-bold text-bg shadow-lift">{toast}</div> : null}
    </div>
  );
}

/** Floating tray for the comparison tool (2–4 offers). */
export function CompareTray() {
  const { compare, toggleCompare, clearCompare, ready } = useStore();
  const path = usePathname();
  if (!ready || compare.length === 0 || path.startsWith("/compare") || path.startsWith("/checkout")) return null;
  return (
    <div className="fixed inset-x-0 bottom-18 z-40 px-3 md:bottom-4">
      <div className="animate-rise mx-auto flex max-w-2xl items-center gap-3 rounded-card border border-line-strong bg-surface p-3 shadow-lift">
        <Scale className="size-6 shrink-0 text-brand" aria-hidden />
        <ul className="flex flex-1 gap-2 overflow-x-auto scrollbar-none" aria-label="محصولات انتخاب‌شده برای مقایسه">
          {compare.map((id) => {
            const l = listingById(id);
            const pt = l ? produceTypeById(l.produceTypeId) : undefined;
            if (!l || !pt) return null;
            return (
              <li key={id} className="relative shrink-0">
                <Photo kind={pt.id} alt={l.title} sizes="44px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="size-11 rounded-control" />
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
      className="fixed bottom-20 start-4 z-40 flex min-h-16 items-center gap-2 rounded-full bg-brand px-6 text-lg font-extrabold text-on-brand shadow-float md:bottom-6"
    >
      <Mic className="size-7" aria-hidden />
      بگویید چه می‌خواهید
    </Link>
  );
}
