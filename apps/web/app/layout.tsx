import { Logo, ProduceDefs } from "@nobar/ui";
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
      <body className="studio-app min-h-dvh">
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
          <header className="studio-header sticky top-0 z-30">
            <div className="studio-announcement">
              <span>فصل عوض می‌شود؛ طعم خوب می‌ماند.</span>
              <Link href="/season">
                کشف طعم‌های فصل <ArrowLeft size={13} />
              </Link>
            </div>
            <div className="studio-header-main">
              <Link
                href="/"
                aria-label="نوبر — صفحهٔ اصلی"
                className="studio-brand"
              >
                <Logo subtitle="از باغ، برای زندگی" />
              </Link>
              <Suspense
                fallback={<div className="studio-search-placeholder" />}
              >
                <SearchBox className="studio-header-search" />
              </Suspense>
              <div className="studio-header-actions">
                <CityPicker compact />
                <HeaderActions />
              </div>
            </div>
            <nav aria-label="دسته‌بندی اصلی" className="studio-navigation">
              <div>
                <MegaMenu />
                <span className="studio-nav-separator" />
                <Link href="/search?nobar=1" className="studio-nav-fresh">
                  <span /> نوبرهای تازه
                </Link>
                <Link href="/shops">غرفه‌گردی</Link>
                <Link href="/season">تقویم فصل‌ها</Link>
                <Link href="/origin/miandoab" className="studio-nav-origin">
                  کشف مبدأها
                </Link>
                <Link href="/baghboon" className="studio-nav-assistant">
                  <Sprout size={16} /> از باغبون بپرس
                </Link>
                <Link href="/about/sell" className="studio-nav-sell">
                  غرفه‌دار شو <ArrowLeft size={14} />
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
