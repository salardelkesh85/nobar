import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const LINKS: Array<[string, string]> = [
  ["/about", "درباره‌ی نوبر"],
  ["/faq", "سؤالات متداول"],
  ["/about/escrow", "پرداخت امن و حساب امانی"],
  ["/terms", "قوانین و شرایط"],
  ["/privacy", "حریم خصوصی"],
  ["/contact", "تماس با ما"],
  ["/about/sell", "فروش در نوبر"],
];

/** Layout for help and policy pages: side menu + article. */
export function InfoPage({ title, lead, children, current }: { title: string; lead?: ReactNode; children: ReactNode; current: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="راهنما" className="h-fit rounded-card border border-line bg-surface p-2 lg:sticky lg:top-36">
        <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col">
          {LINKS.map(([href, label]) => (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={href === current ? "page" : undefined}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-control px-3 text-sm ${href === current ? "bg-brand-soft font-bold text-brand-strong" : "hover:bg-surface-2"}`}
              >
                {label}
                <ChevronLeft className="hidden size-4 text-ink-soft lg:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="rounded-card border border-line bg-surface p-5 sm:p-8">
        <h1 className="text-2xl font-black">{title}</h1>
        {lead ? <p className="mt-2 leading-8 text-ink-soft">{lead}</p> : null}
        <div className="prose-nobar mt-6 space-y-6 leading-8">{children}</div>
      </article>
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold">{title}</h2>
      <div className="space-y-2 text-ink">{children}</div>
    </section>
  );
}

export const DraftNote = () => (
  <p className="rounded-control bg-saffron-soft p-3 text-sm text-warn">پیش‌نویس نسخه‌ی نمایشی است؛ متن نهایی پس از بررسی حقوقی منتشر می‌شود.</p>
);
