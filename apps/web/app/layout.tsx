import { BrandLogo, ProduceDefs } from "@nobar/ui";
import { CalendarDays, Sparkles, Sprout, Store, Wallet } from "lucide-react";
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
import { AppBridge, AppHeaderSwitch } from "@/components/app-shell";
import { PageFrame } from "@/components/page-frame";
import { SiteFooter } from "@/components/site-footer";
import { IS_APP } from "@/lib/app-mode";
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
  // the app draws behind the status and navigation bars and pads its own bars (market.css, "app mode")
  ...(IS_APP ? { viewportFit: "cover" as const } : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={IS_APP ? "is-app" : undefined}
      suppressHydrationWarning
    >
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
          <AppHeaderSwitch>
            <header className="nx-header">
              <div className="nx-header-row">
                <Link href="/" aria-label="نوبر — صفحهٔ اصلی" className="nx-brand">
                  <BrandLogo className="nx-brand-logo" height={40} />
                </Link>
                <div className="nx-header-searchwrap">
                  <Suspense fallback={<div className="nx-search-placeholder" />}>
                    <SearchBox className="nx-header-search" />
                  </Suspense>
                  {/* mobile: "search in [logo]" inside the empty search field, as marketplace apps do */}
                  <span className="nx-search-brand" aria-hidden>
                    جستجو در <BrandLogo height={22} />
                  </span>
                </div>
                <HeaderActions />
              </div>
              <div className="nx-header-cityline">
                <CityPicker compact />
              </div>
              <nav aria-label="دسته‌بندی اصلی" className="nx-nav">
                <div className="nx-nav-inner">
                  <MegaMenu />
                  <span className="nx-nav-sep" aria-hidden />
                  <Link href="/search?nobar=1" className="nx-nav-link nx-nav-fresh">
                    <Sparkles size={16} aria-hidden /> نوبرهای تازه
                  </Link>
                  <Link href="/search?sort=landed" className="nx-nav-link">
                    <Wallet size={16} aria-hidden /> به‌صرفه‌ترین‌ها
                  </Link>
                  <Link href="/shops" className="nx-nav-link">
                    <Store size={16} aria-hidden /> غرفه‌ها
                  </Link>
                  <Link href="/season" className="nx-nav-link">
                    <CalendarDays size={16} aria-hidden /> تقویم فصل
                  </Link>
                  <Link href="/baghboon" className="nx-nav-link nx-nav-assistant">
                    <Sprout size={16} aria-hidden /> باغبون
                  </Link>
                  <Link href="/about/sell" className="nx-nav-link">
                    در نوبر بفروشید
                  </Link>
                  <div className="nx-nav-city">
                    <CityPicker compact />
                  </div>
                </div>
              </nav>
            </header>
          </AppHeaderSwitch>
          <main id="main" className="studio-main">
            <PageFrame>{children}</PageFrame>
          </main>
          {IS_APP ? <AppBridge /> : <SiteFooter />}
          <CompareTray />
          <SimpleVoiceFab />
          <Toast />
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
