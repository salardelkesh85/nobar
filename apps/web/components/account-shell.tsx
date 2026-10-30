"use client";

import { toFaDigits } from "@nobar/fa";
import { buttonClass, cn } from "@nobar/ui";
import { Bell, Heart, LayoutDashboard, LogOut, MapPin, Receipt, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/me", label: "خلاصه‌ی حساب", icon: LayoutDashboard },
  { href: "/orders", label: "سفارش‌ها", icon: Receipt },
  { href: "/me/favorites", label: "علاقه‌مندی‌ها", icon: Heart },
  { href: "/me/addresses", label: "آدرس‌ها", icon: MapPin },
  { href: "/me/alerts", label: "خبرهای نوبر شد", icon: Bell },
  { href: "/me/settings", label: "تنظیمات", icon: Settings },
];

export const maskPhone = (p: string) => toFaDigits(p.length >= 11 ? `${p.slice(0, 4)}***${p.slice(-4)}` : p);

/** Account area: sidebar on desktop, scrolling tabs on mobile (Digikala-style profile). */
export function AccountShell({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const path = usePathname().replace(/\/$/, "") || "/";
  const { user, signOut, showToast, ready } = useStore();
  const active = (href: string) => (href === "/me" ? path.endsWith("/me") : path.endsWith(href));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <UserRound className="size-6" aria-hidden />
          </span>
          {ready && user ? (
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name || "کاربر نوبر"}</p>
              <p className="text-xs text-ink-soft" dir="ltr">
                {maskPhone(user.phone)}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-bold">مهمان</p>
              <Link href="/login?next=/me" className="text-xs font-bold text-brand hover:underline">
                ورود یا ثبت‌نام
              </Link>
            </div>
          )}
        </div>
        <nav aria-label="حساب کاربری" className="flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1.5 scrollbar-none lg:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2.5 rounded-control px-3 text-sm",
                active(href) ? "bg-brand-soft font-bold text-brand-strong" : "text-ink hover:bg-surface-2",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
          {ready && user ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                showToast("از حساب خارج شدید.");
              }}
              className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-control px-3 text-sm text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-5" aria-hidden />
              خروج
            </button>
          ) : null}
        </nav>
      </aside>
      <section className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">{title}</h1>
          {action}
        </div>
        {children}
      </section>
    </div>
  );
}

/** Shown on account pages when nobody is signed in. */
export function SignInPrompt({ next, text }: { next: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-8 text-center">
      <UserRound className="size-10 text-brand" aria-hidden />
      <p className="text-ink-soft">{text}</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "md")}>
        ورود یا ثبت‌نام
      </Link>
    </div>
  );
}
