"use client";

import { DEFAULT_DESTINATION } from "@nobar/demo";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEST_COOKIE } from "./constants";

export interface CartItem {
  listingId: string;
  packageId: string;
  qty: number;
}

export interface PlacedOrder {
  code: string;
  placedAt: string;
  destCityId: string;
  address: { name: string; phone: string; line: string; postalCode: string };
  shops: Array<{ shopId: string; method: string; shippingRial: number; items: Array<CartItem & { unitPriceRial: number }> }>;
  payableRial: number;
}

interface Store {
  ready: boolean;
  dest: string;
  setDest: (cityId: string) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  setQty: (listingId: string, packageId: string, qty: number) => void;
  clearCart: () => void;
  compare: string[];
  toggleCompare: (listingId: string) => void;
  clearCompare: () => void;
  orders: PlacedOrder[];
  addOrder: (o: PlacedOrder) => void;
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
  simple: boolean;
  setSimple: (on: boolean) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — state stays in memory */
  }
}

export function StoreProvider({ initialDest, children }: { initialDest: string; children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dest, setDestState] = useState(initialDest || DEFAULT_DESTINATION);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [theme, setThemeState] = useState<Store["theme"]>("system");
  const [simple, setSimpleState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCart(read("nobar_cart", []));
    setCompare(read("nobar_compare", []));
    setOrders(read("nobar_orders", []));
    setThemeState(read("nobar_theme", "system"));
    setSimpleState(read("nobar_simple", false));
    setReady(true);
  }, []);

  const setDest = useCallback(
    (cityId: string) => {
      setDestState(cityId);
      document.cookie = `${DEST_COOKIE}=${cityId}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const updateCart = useCallback((fn: (c: CartItem[]) => CartItem[]) => {
    setCart((prev) => {
      const next = fn(prev).filter((i) => i.qty > 0);
      write("nobar_cart", next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      dest,
      setDest,
      cart,
      addToCart: (item) =>
        updateCart((c) => {
          const found = c.find((x) => x.listingId === item.listingId && x.packageId === item.packageId);
          return found ? c.map((x) => (x === found ? { ...x, qty: x.qty + item.qty } : x)) : [...c, item];
        }),
      setQty: (listingId, packageId, qty) =>
        updateCart((c) => c.map((x) => (x.listingId === listingId && x.packageId === packageId ? { ...x, qty } : x))),
      clearCart: () => updateCart(() => []),
      compare,
      toggleCompare: (id) =>
        setCompare((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-4);
          write("nobar_compare", next);
          return next;
        }),
      clearCompare: () => {
        setCompare([]);
        write("nobar_compare", []);
      },
      orders,
      addOrder: (o) =>
        setOrders((prev) => {
          const next = [o, ...prev];
          write("nobar_orders", next);
          return next;
        }),
      theme,
      setTheme: (t) => {
        setThemeState(t);
        write("nobar_theme", t);
        if (t === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = t;
      },
      simple,
      setSimple: (on) => {
        setSimpleState(on);
        write("nobar_simple", on);
        if (on) document.documentElement.setAttribute("data-simple-mode", "");
        else document.documentElement.removeAttribute("data-simple-mode");
      },
      toast,
      showToast,
    }),
    [ready, dest, setDest, cart, updateCart, compare, orders, theme, simple, toast, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
