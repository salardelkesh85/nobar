"use client";

import { cityById, DEFAULT_DESTINATION } from "@nobar/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEST_COOKIE } from "./constants";

// Demo-only client state. Everything lives in this browser (localStorage); the real app keeps it in the API.

export interface CartItem {
  listingId: string;
  packageId: string;
  qty: number;
}

export interface Address {
  id: string;
  title: string;
  cityId: string;
  name: string;
  phone: string;
  line: string;
  postalCode: string;
}

export interface PlacedOrder {
  code: string;
  placedAt: string;
  destCityId: string;
  address: { name: string; phone: string; line: string; postalCode: string };
  shops: Array<{ shopId: string; method: string; shippingRial: number; items: Array<CartItem & { unitPriceRial: number }> }>;
  payableRial: number;
}

export interface User {
  phone: string;
  name: string;
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
  user: User | null;
  signIn: (u: User) => void;
  updateUser: (patch: Partial<User>) => void;
  signOut: () => void;
  favorites: string[];
  toggleFavorite: (listingId: string) => boolean;
  addresses: Address[];
  saveAddress: (a: Address) => void;
  removeAddress: (id: string) => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
  simple: boolean;
  setSimple: (on: boolean) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — state stays in memory */
  }
}

/** Destination city from the cookie set by the city picker (static hosting: read in the browser). */
function readDestCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${DEST_COOKIE}=([^;]+)`));
    const v = m ? decodeURIComponent(m[1]!) : null;
    return v && cityById(v)?.destination ? v : null;
  } catch {
    return null;
  }
}

/** State that is persisted under one localStorage key. */
function usePersisted<T>(key: string, initial: T): [T, (fn: (prev: T) => T) => void, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const update = useCallback(
    (fn: (prev: T) => T) =>
      setValue((prev) => {
        const next = fn(prev);
        write(key, next);
        return next;
      }),
    [key],
  );
  return [value, update, setValue];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dest, setDestState] = useState(DEFAULT_DESTINATION);
  const [cart, updateCartRaw, loadCart] = usePersisted<CartItem[]>("nobar_cart", []);
  const [compare, updateCompare, loadCompare] = usePersisted<string[]>("nobar_compare", []);
  const [orders, updateOrders, loadOrders] = usePersisted<PlacedOrder[]>("nobar_orders", []);
  const [user, updateUser, loadUser] = usePersisted<User | null>("nobar_user", null);
  const [favorites, updateFavorites, loadFavorites] = usePersisted<string[]>("nobar_favorites", []);
  const [addresses, updateAddresses, loadAddresses] = usePersisted<Address[]>("nobar_addresses", []);
  const [recentSearches, updateRecent, loadRecent] = usePersisted<string[]>("nobar_recent_searches", []);
  const [theme, setThemeState] = useState<Store["theme"]>("system");
  const [simple, setSimpleState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadCart(read("nobar_cart", []));
    loadCompare(read("nobar_compare", []));
    loadOrders(read("nobar_orders", []));
    loadUser(read("nobar_user", null));
    loadFavorites(read("nobar_favorites", []));
    loadAddresses(read("nobar_addresses", []));
    loadRecent(read("nobar_recent_searches", []));
    setThemeState(read("nobar_theme", "system"));
    setSimpleState(read("nobar_simple", false));
    const saved = readDestCookie();
    if (saved) setDestState(saved);
    setReady(true);
  }, [loadCart, loadCompare, loadOrders, loadUser, loadFavorites, loadAddresses, loadRecent]);

  const setDest = useCallback((cityId: string) => {
    setDestState(cityId);
    document.cookie = `${DEST_COOKIE}=${cityId}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const updateCart = useCallback((fn: (c: CartItem[]) => CartItem[]) => updateCartRaw((prev) => fn(prev).filter((i) => i.qty > 0)), [updateCartRaw]);

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
      toggleCompare: (id) => updateCompare((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-4))),
      clearCompare: () => updateCompare(() => []),
      orders,
      addOrder: (o) => updateOrders((prev) => [o, ...prev]),
      user,
      signIn: (u) => updateUser(() => u),
      updateUser: (patch) => updateUser((prev) => (prev ? { ...prev, ...patch } : prev)),
      signOut: () => updateUser(() => null),
      favorites,
      toggleFavorite: (id) => {
        const on = !favorites.includes(id);
        updateFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
        return on;
      },
      addresses,
      saveAddress: (a) => updateAddresses((prev) => (prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a])),
      removeAddress: (id) => updateAddresses((prev) => prev.filter((x) => x.id !== id)),
      recentSearches,
      addRecentSearch: (q) => updateRecent((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 6)),
      clearRecentSearches: () => updateRecent(() => []),
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
    [ready, dest, setDest, cart, updateCart, compare, updateCompare, orders, updateOrders, user, updateUser, favorites, updateFavorites, addresses, updateAddresses, recentSearches, updateRecent, theme, simple, toast, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
