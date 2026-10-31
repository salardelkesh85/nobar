import { CATEGORIES } from "@nobar/demo";
import { Logo, ProduceDefs } from "@nobar/ui";
import { ArrowLeft, LayoutGrid, Sprout } from "lucide-react";
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
  title: { default: "نوبر — خرید تازه، مستقیم از باغ", template: "%s | نوبر" },
  description: "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار. تاریخ برداشت، تازگی در مقصد و قیمت تمام‌شده تا درِ خانه را ببینید.",
  applicationName: "نوبر",
  appleWebApp: { capable: true, title: "نوبر", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#101c15" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Script id="nobar-prefs" strategy="beforeInteractive">{PREFS_BOOT_SCRIPT}</Script>
        <ProduceDefs />
        <StoreProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-3">رفتن به محتوای اصلی</a>
          <header className="sticky top-0 z-30 border-b border-line bg-surface/95 shadow-[0_2px_12px_rgb(16_24_20_/_0.04)] backdrop-blur-xl">
            <div className="border-b border-line bg-[#173b27] text-white">
              <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-1.5 text-[10px] sm:text-xs">
                <span className="font-bold">نوبرِ هر فصل، مستقیم از باغ</span>
                <span className="hidden text-white/75 sm:inline">تازگی را ببینید؛ آگاهانه انتخاب کنید.</span>
                <Link href="/about/sell" className="inline-flex items-center gap-1 font-bold text-[#d8e8bd] hover:text-white">فروشنده هستید؟ <ArrowLeft className="size-3" /></Link>
              </div>
            </div>
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3 sm:px-4 lg:flex-nowrap">
              <Link href="/" aria-label="نوبر — صفحه‌ی اصلی" className="shrink-0"><Logo subtitle="تازه، مستقیم از باغ" /></Link>
              <Suspense fallback={<div className="order-last h-11 w-full lg:order-none lg:flex-1" />}>
                <SearchBox className="order-last w-full lg:order-none lg:flex-1" />
              </Suspense>
              <div className="order-2 flex w-full items-center justify-between gap-2 lg:order-none lg:w-auto lg:justify-end">
                <CityPicker compact />
                <HeaderActions />
              </div>
            </div>
            <div className="mx-auto hidden max-w-[1440px] items-center gap-1 overflow-x-auto px-4 pb-2 lg:flex">
              <Link href="/categories" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black hover:bg-surface-2"><LayoutGrid className="size-4" /> دسته‌بندی کالاها</Link>
              <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" />
              {CATEGORIES.map((c) => <Link key={c.id} href={"/search?cat=" + c.id} className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">{c.name}</Link>)}
              <Link href="/season" className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs text-ink-soft hover:bg-surface-2">تقویم نوبر</Link>
              <Link href="/shops" className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs text-ink-soft hover:bg-surface-2">غرفه‌ها</Link>
              <Link href="/search?nobar=1" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-black text-nobar hover:bg-nobar-soft"><span className="size-1.5 rounded-full bg-nobar" /> نوبر شد!</Link>
              <Link href="/baghboon" className="ms-auto inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-brand-soft px-3 text-xs font-black text-brand-strong"><Sprout className="size-4" /> باغبون</Link>
            </div>
          </header>
          <main id="main" className="mx-auto max-w-[1440px] px-3 pb-28 pt-4 sm:px-4 sm:pt-6 md:pb-16">
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
