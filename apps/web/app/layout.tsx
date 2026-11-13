import { LogoMark, ProduceDefs } from "@nobar/ui";
import { ArrowLeft, Sprout } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import {
  BottomNav,
  CompareTray,
  HeaderActions,
  SimpleVoiceFab,
  Toast,
} from "@/components/chrome";
import { CityPicker } from "@/components/city-picker";
import { MegaMenu } from "@/components/mega-menu";
import { SearchBox } from "@/components/search-box";
import { PageFrame } from "@/components/page-frame";
import { SiteFooter } from "@/components/site-footer";
import { PREFS_BOOT_SCRIPT } from "@/lib/constants";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
import "./studio.css";
import "./market.css";

export const metadata: Metadata = {
  title: { default: "نوبر — خرید تازه، مستقیم از باغ", template: "%s | نوبر" },
  description:
    "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار. تاریخ برداشت، تازگی در مقصد و قیمت تمام‌شده تا درِ خانه را ببینید.",
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
      <body className="studio-app nx min-h-dvh">
        <Script id="nobar-prefs" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
        <ProduceDefs />
        <StoreProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-3"
          >
            رفتن به محتوای اصلی
          </a>
          <header className="nx-header">
            <div className="nx-header-row">
              <Link href="/" aria-label="نوبر — صفحهٔ اصلی" className="nx-brand">
                <LogoMark className="nx-brand-mark" />
                <span className="nx-brand-name">نوبر</span>
              </Link>
              <Suspense fallback={<div className="nx-search-placeholder" />}>
                <SearchBox className="nx-header-search" />
              </Suspense>
              <div className="nx-header-city">
                <CityPicker compact />
              </div>
              <HeaderActions />
            </div>
            <nav aria-label="دسته‌بندی اصلی" className="nx-nav">
              <div className="nx-nav-inner">
                <MegaMenu />
                <span className="nx-nav-sep" aria-hidden />
                <Link href="/search?nobar=1" className="nx-nav-link nx-nav-fresh">
                  <span aria-hidden /> نوبرهای تازه
                </Link>
                <Link href="/shops" className="nx-nav-link">غرفه‌ها</Link>
                <Link href="/season" className="nx-nav-link">تقویم فصل</Link>
                <Link href="/origin/miandoab" className="nx-nav-link">مبدأها</Link>
                <Link href="/baghboon" className="nx-nav-link nx-nav-assistant">
                  <Sprout size={16} aria-hidden /> باغبون
                </Link>
                <Link href="/about/sell" className="nx-nav-link nx-nav-sell">
                  در نوبر بفروشید <ArrowLeft size={14} aria-hidden />
                </Link>
              </div>
            </nav>
          </header>
          <main id="main" className="studio-main">
            <PageFrame>{children}</PageFrame>
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
