"use client";

import { shopById } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { cn, Logo } from "@nobar/ui";
import { Photo } from "./photo";
import { ClipboardList, LayoutDashboard, MessageCircle, Package, Plus, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SHOP_ID, useSeller } from "@/lib/state";

const NAV = [
  { href: "/", label: "پیشخوان", icon: LayoutDashboard, mobile: false },
  { href: "/orders", label: "سفارش‌ها", icon: ClipboardList, mobile: true },
  { href: "/products", label: "محصولات", icon: Package, mobile: true },
  { href: "/products/new", label: "محصول تازه", icon: Plus, mobile: true },
  { href: "/shop", label: "غرفه", icon: Store, mobile: true },
  { href: "/payouts", label: "تسویه", icon: Wallet, mobile: true },
  { href: "/reviews", label: "نظرها", icon: MessageCircle, mobile: false },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { orders, toast } = useSeller();
  const pending = orders.filter((o) => o.status === "AWAITING_ACCEPTANCE").length;
  const shop = shopById(SHOP_ID)!;
  const isActive = (href: string) => (href === "/" ? path === "/" : href === "/products" ? path === "/products" || /^\/products\/(?!new)/.test(path) : path.startsWith(href));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-surface p-4 md:flex">
        <Logo subtitle="پنل غرفه‌دار" />
        <div className="mt-6 flex items-center gap-3 rounded-card bg-surface-2 p-3">
          <Photo kind={shop.art} alt="" sizes="40px" className="size-10 shrink-0 rounded-full" />
          <div>
          <p className="text-xs text-ink-soft">غرفه</p>
          <p className="font-bold">{shop.name}</p>
          </div>
        </div>
        <nav aria-label="منوی پنل" className="mt-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn("flex min-h-11 items-center gap-3 rounded-full px-4 transition-colors", isActive(href) ? "bg-brand text-on-brand font-bold shadow-soft" : "hover:bg-surface-2")}
            >
              <Icon className="size-5" aria-hidden />
              {label}
              {href === "/orders" && pending ? <span className="ms-auto rounded-full bg-nobar px-2 text-xs font-bold text-white">{toFaDigits(pending)}</span> : null}
            </Link>
          ))}
        </nav>
        <a href={process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000/"} className="mt-auto text-sm text-ink-soft hover:text-brand">
          دیدن فروشگاه نوبر ←
        </a>
      </aside>

      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line/70 px-4 py-3 md:hidden">
          <Logo subtitle="پنل غرفه‌دار" />
          <span className="text-sm font-bold">{shop.name}</span>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">
          {children}
        </main>
      </div>

      <nav aria-label="منوی پنل" className="glass fixed inset-x-3 bottom-3 z-40 mb-[env(safe-area-inset-bottom)] rounded-[1.75rem] border border-line/80 shadow-float md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs", isActive(href) ? "font-bold text-brand" : "text-ink-soft")}
              >
                {href === "/products/new" ? (
                  <span className="grid size-11 place-items-center rounded-full bg-brand text-on-brand shadow-lift">
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-6" aria-hidden />
                )}
                {href === "/products/new" ? null : label}
                {href === "/products/new" ? <span className="sr-only">{label}</span> : null}
                {href === "/orders" && pending ? (
                  <span className="absolute end-[calc(50%-1.5rem)] top-1.5 rounded-full bg-nobar px-1.5 text-[0.7rem] font-bold text-white">{toFaDigits(pending)}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
        {toast ? <div className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-bg shadow-lg">{toast}</div> : null}
      </div>
    </div>
  );
}
