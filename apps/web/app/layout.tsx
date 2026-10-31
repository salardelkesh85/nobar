import { Logo, ProduceDefs } from "@nobar/ui";
import { Sprout } from "lucide-react";
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
import "./nobar.css";

export const metadata: Metadata = {
  title: { default: "نوبر — خرید تازه، مستقیم از باغ", template: "%s | نوبر" },
  description:
    "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار. تاریخ برداشت، تازگی در مقصد و قیمت تمام‌شده تا درِ خانه را ببینید.",
  applicationName: "نوبر",
  appleWebApp: { capable: true, title: "نوبر", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbf6" },
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
            <div className="studio-header-main">
              <Link
                href="/"
                aria-label="نوبر — صفحهٔ اصلی"
                className="studio-brand"
              >
                <Logo subtitle="خوب بخور، تازه زندگی کن" />
              </Link>
              <nav className="nobar-desktop-links" aria-label="کشف نوبر">
                <Link href="/search">بازار تازه‌ها</Link>
                <Link href="/shops">آدم‌ها و غرفه‌ها</Link>
                <Link href="/season">به وقت فصل</Link>
                <Link href="/about">قصهٔ نوبر</Link>
              </nav>
              <div className="studio-header-actions">
                <HeaderActions />
              </div>
            </div>
            <div className="studio-navigation">
              <div>
                <MegaMenu />
                <Suspense
                  fallback={<div className="studio-search-placeholder" />}
                >
                  <SearchBox className="studio-header-search" />
                </Suspense>
                <CityPicker compact />
                <Link href="/baghboon" className="studio-nav-assistant">
                  <Sprout size={17} /> از باغبون بپرس
                </Link>
              </div>
            </div>
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
