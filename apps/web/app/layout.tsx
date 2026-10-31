import { Logo, ProduceDefs } from "@nobar/ui";
import { ArrowLeft, Sprout } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { BottomNav, CompareTray, HeaderActions, SimpleVoiceFab, Toast } from "@/components/chrome";
import { CityPicker } from "@/components/city-picker";
import { MegaMenu } from "@/components/mega-menu";
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
          <header className="nobar-header sticky top-0 z-30">
            <div className="nobar-topline">
              <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4">
                <span className="flex items-center gap-2"><span className="nobar-topline-spark" />نوبر؛ طعم تازه‌ی هر فصل</span>
                <div className="flex items-center gap-3">
                  <span className="hidden text-white/65 sm:inline">خرید آگاهانه، از مبدأ تا مقصد</span>
                  <Link href="/about/sell" className="nobar-topline-link">فروشنده هستید؟ <ArrowLeft className="size-3.5" /></Link>
                </div>
              </div>
            </div>
            <div className="nobar-header-main mx-auto max-w-[1480px] px-3 sm:px-4">
              <Link href="/" aria-label="نوبر — صفحه‌ی اصلی" className="nobar-brand-lockup"><Logo subtitle="تازه، مستقیم از باغ" /></Link>
              <Suspense fallback={<div className="order-last h-12 w-full lg:order-none lg:flex-1" />}>
                <SearchBox className="order-last w-full lg:order-none lg:flex-1" />
              </Suspense>
              <div className="nobar-header-tools">
                <CityPicker compact />
                <HeaderActions />
              </div>
            </div>
            <nav aria-label="دسته‌بندی اصلی" className="nobar-nav nobar-v3-nav">
              <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-visible px-3 sm:px-4">
                <MegaMenu />
                <span className="nobar-nav-divider" />
                <Link href="/search?nobar=1" className="nobar-v3-nav-link nobar-v3-nav-highlight">نوبرهای تازه</Link>
                <Link href="/season" className="nobar-v3-nav-link">تقویم فصل‌ها</Link>
                <Link href="/shops" className="nobar-v3-nav-link">غرفه‌ها</Link>
                <Link href="/origin/miandoab" className="nobar-v3-nav-link">شهرهای مبدأ</Link>
                <Link href="/baghboon" className="nobar-v3-nav-link nobar-v3-nav-baghboon"><Sprout className="size-4" /> باغبون</Link>
                <Link href="/about/sell" className="nobar-v3-nav-seller">فروشنده هستید؟</Link>
              </div>
            </nav>
          </header>
          <main id="main" className="nobar-main mx-auto max-w-[1480px] px-3 pb-28 pt-5 sm:px-4 sm:pt-7 md:pb-16">
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
