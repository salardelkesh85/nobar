"use client";

import { ChevronRight, ShoppingCart, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IS_APP } from "@/lib/app-mode";
import { CartCount } from "./chrome";

/** Pages reached from the bottom tabs keep the full header (logo, search, city); every other page gets an app bar. */
const TAB_ROOTS = new Set(["/", "/categories", "/baghboon", "/cart", "/me", "/search"]);

const TITLES: Record<string, string> = {
  l: "جزئیات محصول",
  p: "محصول",
  shop: "غرفه",
  shops: "غرفه‌ها",
  origin: "مبدأ",
  season: "تقویم فصل",
  compare: "مقایسه",
  checkout: "تکمیل خرید",
  orders: "سفارش‌های من",
  order: "پیگیری سفارش",
  login: "ورود به نوبر",
  about: "درباره‌ی نوبر",
  contact: "تماس با ما",
  faq: "پرسش‌های پرتکرار",
  privacy: "حریم خصوصی",
  terms: "قوانین",
};
const ME_TITLES: Record<string, string> = {
  addresses: "آدرس‌ها",
  alerts: "خبرهای نوبر شد",
  favorites: "علاقه‌مندی‌ها",
  settings: "تنظیمات",
};

const clean = (path: string) => path.replace(/\/$/, "") || "/";

function titleFor(path: string): string {
  const [first = "", second = ""] = path.split("/").filter(Boolean);
  if (first === "me") return ME_TITLES[second] ?? "حساب من";
  if (first === "about" && second === "sell") return "فروش در نوبر";
  return TITLES[first] ?? "نوبر";
}

function goBack(router: ReturnType<typeof useRouter>) {
  if (window.history.length > 1) router.back();
  else router.replace("/");
}

/** In the app, swaps the site header for a back-arrow app bar on inner pages. On the website it renders the header as is. */
export function AppHeaderSwitch({ children }: { children: ReactNode }) {
  const path = clean(usePathname());
  const router = useRouter();
  if (!IS_APP || TAB_ROOTS.has(path)) return <>{children}</>;
  return (
    <header className="nx-appbar">
      <button type="button" className="nx-appbar-button" onClick={() => goBack(router)} aria-label="بازگشت">
        <ChevronRight className="size-6" aria-hidden />
      </button>
      <span className="nx-appbar-title">{titleFor(path)}</span>
      <Link href="/cart" className="nx-appbar-button" aria-label="سبد خرید">
        <ShoppingCart className="size-[22px]" strokeWidth={1.8} aria-hidden />
        <CartCount className="nx-appbar-count" />
      </Link>
    </header>
  );
}

/**
 * Native glue for the Android app: the hardware back button (closes an open sheet, goes back, or leaves the app from
 * the home page), system bar colours, hiding the splash screen once the page is drawn, and an offline notice.
 */
export function AppBridge() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!IS_APP) return;
    let removeBack: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const [{ App }, { SplashScreen }, { SystemBars, SystemBarsStyle }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
        import("@capacitor/core"),
      ]);
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        const sheet = document.querySelector<HTMLDialogElement>("dialog[open]");
        if (sheet) return sheet.close();
        const path = clean(window.location.pathname);
        if (path === "/") return void App.exitApp();
        if (canGoBack) window.history.back();
        else router.replace("/");
      });
      if (cancelled) return void handle.remove();
      removeBack = () => void handle.remove();
      await SystemBars.setStyle({ style: SystemBarsStyle.Default }).catch(() => undefined);
      await SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      removeBack?.();
    };
  }, [router]);

  useEffect(() => {
    if (!IS_APP) return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="nx-offline">
      <WifiOff className="size-4" aria-hidden /> اتصال اینترنت برقرار نیست
    </div>
  );
}
