import { CATEGORIES } from "@nobar/demo";
import { Logo, ProduceDefs, ProduceIllustration } from "@nobar/ui";
import { Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { BottomNav, CompareTray, DesktopNav, SimpleVoiceFab, Toast } from "@/components/chrome";
import { CityPicker } from "@/components/city-picker";
import { SearchBox } from "@/components/search-box";
import { PREFS_BOOT_SCRIPT } from "@/lib/constants";
import { getDestination } from "@/lib/server";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "نوبر — نوبرِ هر شهر، مستقیم از باغ", template: "%s | نوبر" },
  description: "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار. تاریخ برداشت، تازگی در مقصد و قیمت تمام‌شده تا درِ خانه را ببینید.",
  applicationName: "نوبر",
  appleWebApp: { capable: true, title: "نوبر", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a130e" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const dest = await getDestination();
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Script id="nobar-prefs" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
        <ProduceDefs />
        <StoreProvider initialDest={dest}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-3">
            رفتن به محتوای اصلی
          </a>

          {/* announcement strip */}
          <div className="bg-brand-strong text-[0.78rem] text-white dark:bg-brand-soft dark:text-brand-strong">
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-5 overflow-x-auto px-4 py-1.5 whitespace-nowrap scrollbar-none">
              <span className="inline-flex items-center gap-1.5"><Leaf className="size-3.5" aria-hidden />تاریخ برداشت روی هر محصول</span>
              <span className="hidden items-center gap-1.5 sm:inline-flex"><Truck className="size-3.5" aria-hidden />فقط محصولی که تازه به شهرتان برسد</span>
              <span className="hidden items-center gap-1.5 md:inline-flex"><ShieldCheck className="size-3.5" aria-hidden />پول شما تا تحویل سالم امانت می‌ماند</span>
            </div>
          </div>

          <header className="glass sticky top-0 z-30 border-b border-line/70">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3">
              <Link href="/" aria-label="نوبر — صفحه‌ی اصلی" className="shrink-0">
                <Logo subtitle="مستقیم از باغ" />
              </Link>
              <Suspense fallback={<div className="order-last h-12 w-full lg:order-none lg:flex-1" />}>
                <SearchBox className="order-last w-full lg:order-none lg:max-w-xl lg:flex-1" />
              </Suspense>
              <div className="ms-auto flex items-center gap-2">
                <CityPicker />
                <DesktopNav />
              </div>
            </div>
            <nav aria-label="دسته‌ها" className="mx-auto hidden max-w-7xl items-center gap-1 px-4 pb-2.5 lg:flex">
              {CATEGORIES.map((c) => (
                <Link key={c.id} href={`/search?cat=${c.id}`} className="group inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
                  <ProduceIllustration kind={c.art} className="size-5 transition-transform group-hover:-rotate-6" />
                  {c.name}
                </Link>
              ))}
              <span className="mx-2 h-5 w-px bg-line-strong" aria-hidden />
              <Link href="/season" className="inline-flex min-h-9 items-center rounded-full px-3 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink">تقویم نوبر</Link>
              <Link href="/search?nobar=1" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-nobar hover:bg-nobar-soft">
                <span className="size-1.5 rounded-full bg-nobar" aria-hidden />
                نوبر شد!
              </Link>
            </nav>
          </header>

          <div className="page-glow">
            <main id="main" className="mx-auto max-w-7xl px-4 pb-32 pt-5 md:pb-16">
              {children}
            </main>
          </div>

          <footer className="border-t border-line bg-surface pb-28 md:pb-0">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Logo subtitle="نوبرِ هر شهر، مستقیم از باغ" />
                <p className="mt-4 leading-7">بازار آنلاین میوه و سبزی تازه. باغدارها و میوه‌فروشی‌های هر شهر، محصول منطقه‌ی خودشان را مستقیم به شما می‌فروشند.</p>
              </div>
              <div>
                <h2 className="mb-3 font-bold text-ink">خرید</h2>
                <ul className="space-y-2">
                  <li><Link href="/season" className="hover:text-brand">تقویم نوبر</Link></li>
                  <li><Link href="/categories" className="hover:text-brand">دسته‌ها و شهرهای مبدأ</Link></li>
                  <li><Link href="/compare?type=انار" className="hover:text-brand">مقایسه‌گر</Link></li>
                  <li><Link href="/baghboon" className="hover:text-brand">باغبون، دستیار خرید</Link></li>
                </ul>
              </div>
              <div>
                <h2 className="mb-3 font-bold text-ink">اعتماد</h2>
                <ul className="space-y-2">
                  <li><Link href="/about/escrow" className="hover:text-brand">پرداخت امن و حساب امانی</Link></li>
                  <li><span>قوانین و حریم خصوصی (به‌زودی)</span></li>
                </ul>
              </div>
              <div>
                <h2 className="mb-3 font-bold text-ink">غرفه‌داران</h2>
                <ul className="space-y-2">
                  <li><Link href="/about/sell" className="hover:text-brand">در نوبر غرفه باز کنید</Link></li>
                </ul>
              </div>
            </div>
            <p className="border-t border-line py-4 text-center text-xs text-ink-soft">نسخه‌ی نمایشی — داده‌ها نمونه است و پرداخت واقعی انجام نمی‌شود.</p>
          </footer>
          <CompareTray />
          <SimpleVoiceFab />
          <Toast />
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
