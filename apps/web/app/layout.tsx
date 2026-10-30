import { CATEGORIES } from "@nobar/demo";
import { Logo, ProduceDefs } from "@nobar/ui";
import { LayoutGrid, Leaf, ShieldCheck, Truck, Undo2 } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { BottomNav, CompareTray, HeaderActions, SimpleVoiceFab, Toast } from "@/components/chrome";
import { CityPicker } from "@/components/city-picker";
import { SearchBox } from "@/components/search-box";
import { SiteFooter } from "@/components/site-footer";
import { PREFS_BOOT_SCRIPT } from "@/lib/constants";
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101c15" },
  ],
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Script id="nobar-prefs" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
        <ProduceDefs />
        <StoreProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-3">
            رفتن به محتوای اصلی
          </a>

          <header className="sticky top-0 z-30 border-b border-line bg-surface">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2.5 px-4 pb-2.5 pt-3 lg:pb-0">
              <Link href="/" aria-label="نوبر — صفحه‌ی اصلی" className="shrink-0">
                <Logo subtitle="مستقیم از باغ" />
              </Link>
              <Suspense fallback={<div className="order-last h-11 w-full md:order-none md:max-w-2xl md:flex-1" />}>
                <SearchBox className="order-last w-full md:order-none md:max-w-2xl md:flex-1" />
              </Suspense>
              <HeaderActions />
            </div>
            <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 pb-2 lg:pt-1">
              <nav aria-label="دسته‌ها" className="hidden flex-1 items-center gap-0.5 text-sm lg:flex">
                <Link href="/categories" className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2.5 font-bold text-ink hover:bg-surface-2">
                  <LayoutGrid className="size-4" aria-hidden />
                  دسته‌بندی‌ها
                </Link>
                <span className="mx-1.5 h-4 w-px bg-line-strong" aria-hidden />
                {CATEGORIES.map((c) => (
                  <Link key={c.id} href={`/search?cat=${c.id}`} className="inline-flex min-h-10 items-center rounded-control px-2.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
                    {c.name}
                  </Link>
                ))}
                <Link href="/season" className="inline-flex min-h-10 items-center rounded-control px-2.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
                  تقویم نوبر
                </Link>
                <Link href="/shops" className="inline-flex min-h-10 items-center rounded-control px-2.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
                  غرفه‌ها
                </Link>
                <Link href="/search?nobar=1" className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2.5 font-bold text-nobar hover:bg-nobar-soft">
                  <span className="size-1.5 rounded-full bg-nobar" aria-hidden />
                  نوبر شد!
                </Link>
              </nav>
              <div className="lg:ms-auto">
                <CityPicker compact />
              </div>
            </div>
          </header>

          <main id="main" className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-4 md:pb-16">
            {children}
          </main>

          <SiteFooter />
          <CompareTray />
          <SimpleVoiceFab />
          <Toast />
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
