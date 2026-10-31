"use client";

import { DISPUTES, KYC_QUEUE, MODERATION_QUEUE } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { cn, Logo } from "@nobar/ui";
import {
  ArrowUpLeft,
  BadgeCheck,
  Banknote,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  Percent,
  ScrollText,
  ShieldAlert,
  Store,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const NAV = [
  { href: "/", label: "پیشخوان", icon: LayoutDashboard },
  {
    href: "/kyc",
    label: "تأیید هویت غرفه‌ها",
    icon: BadgeCheck,
    count: KYC_QUEUE.length,
  },
  {
    href: "/moderation",
    label: "بررسی آگهی و نظر",
    icon: ShieldAlert,
    count: MODERATION_QUEUE.length,
  },
  {
    href: "/disputes",
    label: "داوری شکایت‌ها",
    icon: Gavel,
    count: DISPUTES.filter((d) => d.status === "AWAITING_STAFF").length,
  },
  { href: "/orders", label: "سفارش‌ها", icon: ClipboardList },
  { href: "/payouts", label: "تسویه‌ها", icon: Banknote },
  { href: "/shops", label: "غرفه‌ها", icon: Store },
  { href: "/taxonomy", label: "انواع محصول و فصل", icon: Tags },
  { href: "/commission", label: "کمیسیون", icon: Percent },
  { href: "/audit", label: "گزارش ممیزی", icon: ScrollText },
];

const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <ToastCtx.Provider value={show}>
      <div className="studio-workspace studio-workspace-admin min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="studio-workspace-sidebar border-b border-line bg-surface p-3 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-e">
          <div className="flex items-center justify-between lg:block">
            <Logo subtitle="پنل مدیریت" />
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs lg:mt-4 lg:inline-block">
              نگار · پشتیبانی
            </span>
          </div>
          <nav
            aria-label="منوی مدیریت"
            className="mt-3 flex gap-1 overflow-x-auto scrollbar-none lg:mt-5 lg:flex-col"
          >
            {NAV.map(({ href, label, icon: Icon, count }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors",
                  active(href)
                    ? "bg-brand text-on-brand font-bold shadow-soft"
                    : "hover:bg-surface-2",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {count ? (
                  <span className="ms-auto rounded-full bg-nobar px-1.5 text-[0.7rem] font-bold text-white">
                    {toFaDigits(count)}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="studio-workspace-content">
          <div className="studio-workspace-topbar">
            <div>
              <span>فضای کار نوبر</span>
              <strong>
                {NAV.find((n) => active(n.href))?.label ?? "مدیریت بازار"}
              </strong>
            </div>
            <span className="studio-demo-badge">
              <span /> محیط نمایشی
            </span>
            <a
              href={
                process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000/"
              }
            >
              دیدن فروشگاه <ArrowUpLeft size={16} />
            </a>
          </div>
          <main
            id="main"
            className="studio-workspace-main min-w-0 px-4 py-5 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast ? (
          <div className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-bg shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>
    </ToastCtx.Provider>
  );
}

/** Dense table wrapper used across the back office. */
export function Table({
  caption,
  head,
  children,
}: {
  caption?: string;
  head: string[];
  children: ReactNode;
}) {
  return (
    <div
      className="studio-workspace-table overflow-x-auto rounded-card border border-line bg-surface shadow-soft"
      role="region"
      aria-label={caption ?? "جدول داده‌ها؛ قابل پیمایش افقی"}
      tabIndex={0}
    >
      <table className="w-full min-w-[42rem] text-sm">
        {caption ? (
          <caption className="p-4 text-start text-base font-extrabold">
            {caption}
          </caption>
        ) : null}
        <thead className="bg-surface-2 text-ink-soft">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2 text-start font-bold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&_td]:px-3 [&_td]:py-2.5">
          {children}
        </tbody>
      </table>
    </div>
  );
}
