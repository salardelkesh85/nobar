"use client";

import { LISTINGS, SHOP_ORDERS, type Listing, type ShopOrder, type ShopOrderStatus } from "@nobar/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** The demo seller is signed in as shop s1 (باغ سیب حاج رحیم, Miandoab). */
export const SHOP_ID = "s1";

type OrderPatch = Partial<Pick<ShopOrder, "status" | "trackingCode" | "shippedAt" | "deliveredAt">>;
type ListingPatch = Partial<{ prices: Record<string, number>; stockBase: number; paused: boolean }>;

interface SellerState {
  ready: boolean;
  orders: ShopOrder[];
  updateOrder: (code: string, patch: OrderPatch) => void;
  listings: Array<Listing & { paused: boolean }>;
  updateListing: (id: string, patch: ListingPatch) => void;
  toast: string | null;
  showToast: (m: string) => void;
}

const Ctx = createContext<SellerState | null>(null);
const load = <T,>(k: string, f: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : f;
  } catch {
    return f;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export function SellerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [orderPatches, setOrderPatches] = useState<Record<string, OrderPatch>>({});
  const [listingPatches, setListingPatches] = useState<Record<string, ListingPatch>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setOrderPatches(load("seller_orders", {}));
    setListingPatches(load("seller_listings", {}));
    setReady(true);
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);

  const value = useMemo<SellerState>(() => {
    const orders = SHOP_ORDERS.filter((o) => o.shopId === SHOP_ID).map((o) => ({ ...o, ...orderPatches[o.code] }));
    const listings = LISTINGS.filter((l) => l.shopId === SHOP_ID).map((l) => {
      const p = listingPatches[l.id] ?? {};
      return {
        ...l,
        stockBase: p.stockBase ?? l.stockBase,
        packages: l.packages.map((pk) => ({ ...pk, priceRial: p.prices?.[pk.id] ?? pk.priceRial })),
        paused: p.paused ?? false,
      };
    });
    return {
      ready,
      orders,
      listings,
      updateOrder: (code, patch) =>
        setOrderPatches((prev) => {
          const next = { ...prev, [code]: { ...prev[code], ...patch } };
          save("seller_orders", next);
          return next;
        }),
      updateListing: (id, patch) =>
        setListingPatches((prev) => {
          const cur = prev[id] ?? {};
          const next = { ...prev, [id]: { ...cur, ...patch, prices: { ...cur.prices, ...patch.prices } } };
          save("seller_listings", next);
          return next;
        }),
      toast,
      showToast,
    };
  }, [ready, orderPatches, listingPatches, toast, showToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSeller(): SellerState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSeller outside SellerProvider");
  return s;
}

export const ACTIVE: ShopOrderStatus[] = ["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED"];
