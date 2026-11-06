"use client";

import { IdentityApiError, IdentityClient, type OrderDto } from "@nobar/contracts";
import { LISTINGS, PAYOUTS, SHOP_ORDERS, shopById, type Listing, type Payout, type Shop, type ShopOrder, type ShopOrderStatus } from "@nobar/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** The demo seller is signed in as shop s1 (باغ سیب حاج رحیم, Miandoab). */
export const SHOP_ID = "s1";

/** Set at build/start time; unset (GitHub Pages) keeps the demo data. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";

type OrderPatch = Partial<Pick<ShopOrder, "status" | "trackingCode" | "shippedAt" | "deliveredAt">>;
type ListingPatch = Partial<{ prices: Record<string, number>; stockBase: number; paused: boolean }>;
export type SellerListing = Listing & { paused: boolean; moderationNote?: string | null };

/** API mode: where the signed-in user stands as a seller. */
export type SellerStage = "loading" | "signed-out" | "no-shop" | "pending" | "rejected" | "suspended" | "active";

interface SellerState {
  ready: boolean;
  apiMode: boolean;
  stage: SellerStage;
  client: IdentityClient;
  shop: Shop;
  reviewNote: string | null;
  orders: ShopOrder[];
  /** resolves false when the API refused (the error is already shown) */
  updateOrder: (code: string, patch: OrderPatch) => boolean | Promise<boolean>;
  listings: SellerListing[];
  payouts: Payout[];
  /** API mode: settled balance waiting for the next payout (demo: computed from completed orders) */
  balanceRial: number | null;
  updateListing: (id: string, patch: ListingPatch) => boolean | Promise<boolean>;
  /** re-read shop, orders and listings from the API */
  reload: () => Promise<void>;
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

export const errorText = (e: unknown) => (e instanceof IdentityApiError ? e.message : "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
const maskPhone = (p: string) => {
  const local = p.replace(/^\+98/, "0");
  return `${local.slice(0, 4)}***${local.slice(-4)}`;
};

/** API shop order → the panel's ShopOrder shape (pages stay the same in both modes). */
function toShopOrder(o: OrderDto): ShopOrder & { id: string } {
  return {
    id: o.id,
    code: o.code,
    shopId: o.shopId,
    buyerName: o.address.name,
    buyerPhoneMasked: maskPhone(o.address.phone),
    destCityId: o.address.cityId,
    placedAt: o.createdAt,
    status: o.status as ShopOrderStatus,
    lines: o.items.map((i) => ({ listingId: i.listingId, packageId: i.packageId, title: i.title, packageLabel: i.packageLabel, quantity: i.qty, unitPriceRial: i.unitPriceRial })),
    shippingRial: o.deliveryFeeRial,
    method: (o.shippingMethod ?? "POST") as ShopOrder["method"],
    commissionBps: 0,
    commissionRial: o.commissionRial ?? 0,
    refundedRial: o.refundedRial,
    ...(o.acceptDeadline ? { acceptDeadline: o.acceptDeadline } : {}),
    ...(o.trackingCode ? { trackingCode: o.trackingCode } : {}),
    ...(o.shippedAt ? { shippedAt: o.shippedAt } : {}),
    ...(o.deliveredAt ? { deliveredAt: o.deliveredAt } : {}),
    ...(o.complaintEndsAt ? { complaintEndsAt: o.complaintEndsAt } : {}),
  };
}

const STAGE: Record<Shop["status"], SellerStage> = { ACTIVE: "active", PENDING_REVIEW: "pending", REJECTED: "rejected", SUSPENDED: "suspended" };

function useDemoSeller(): Omit<SellerState, "toast" | "showToast" | "client"> {
  const [ready, setReady] = useState(false);
  const [orderPatches, setOrderPatches] = useState<Record<string, OrderPatch>>({});
  const [listingPatches, setListingPatches] = useState<Record<string, ListingPatch>>({});
  useEffect(() => {
    setOrderPatches(load("seller_orders", {}));
    setListingPatches(load("seller_listings", {}));
    setReady(true);
  }, []);
  return useMemo(() => {
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
      apiMode: false,
      stage: "active" as const,
      shop: shopById(SHOP_ID)!,
      reviewNote: null,
      orders,
      listings,
      payouts: PAYOUTS.filter((p) => p.shopId === SHOP_ID),
      balanceRial: null,
      reload: async () => undefined,
      updateOrder: (code: string, patch: OrderPatch) => {
        setOrderPatches((prev) => {
          const next = { ...prev, [code]: { ...prev[code], ...patch } };
          save("seller_orders", next);
          return next;
        });
        return true;
      },
      updateListing: (id: string, patch: ListingPatch) => {
        setListingPatches((prev) => {
          const cur = prev[id] ?? {};
          const next = { ...prev, [id]: { ...cur, ...patch, prices: { ...cur.prices, ...patch.prices } } };
          save("seller_listings", next);
          return next;
        });
        return true;
      },
    };
  }, [ready, orderPatches, listingPatches]);
}

/** API mode: the signed-in user's own shop, orders and listings (the API checks ownership on every call). */
function useApiSeller(client: IdentityClient, showToast: (m: string) => void): Omit<SellerState, "toast" | "showToast" | "client"> {
  const [stage, setStage] = useState<SellerStage>("loading");
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<ShopOrder & { id: string }>>([]);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balanceRial, setBalance] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      if (!client.user) await client.restore();
    } catch {
      setStage("signed-out");
      return;
    }
    try {
      const mine = await client.call<{ shop: Shop; reviewNote: string | null }>("seller/shop");
      setShop(mine.shop);
      setReviewNote(mine.reviewNote);
      setStage(STAGE[mine.shop.status]);
      if (mine.shop.status !== "ACTIVE") return;
      const [o, l, b] = await Promise.all([
        client.call<OrderDto[]>("seller/orders"),
        client.call<Array<{ listing: Listing; moderationNote: string | null }>>("seller/listings"),
        client.call<Array<{ shopId: string; balanceRial: number; payouts: Array<{ id: string; amountRial: number; status: Payout["status"]; createdAt: string; paidAt: string | null }> }>>("seller/balance"),
      ]);
      setOrders(o.map(toShopOrder));
      const mineBalance = b.find((x) => x.shopId === mine.shop.id);
      setBalance(mineBalance?.balanceRial ?? 0);
      setPayouts((mineBalance?.payouts ?? []).map((p) => ({ id: p.id, shopId: mine.shop.id, amountRial: p.amountRial, orders: 0, status: p.status, date: p.paidAt ?? p.createdAt, shebaLast4: "" })));
      setListings(l.map((x) => ({ ...x.listing, paused: x.listing.status === "PAUSED", moderationNote: x.moderationNote })));
    } catch (e) {
      if (e instanceof IdentityApiError && e.status === 404) setStage("no-shop");
      else if (e instanceof IdentityApiError && e.status === 401) setStage("signed-out");
      else showToast(errorText(e));
    }
  }, [client, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ready: stage !== "loading",
    apiMode: true,
    stage,
    shop: shop ?? shopById(SHOP_ID)!,
    reviewNote,
    orders,
    listings,
    payouts,
    balanceRial,
    reload,
    updateOrder: async (code, patch) => {
      const o = orders.find((x) => x.code === code);
      if (!o) return false;
      try {
        const path =
          patch.status === "ACCEPTED" ? "accept" : patch.status === "REJECTED" ? "reject" : patch.status === "SHIPPED" ? "ship" : null;
        if (!path) {
          showToast("تحویل را خریدار یا پشتیبانی نوبر ثبت می‌کند.");
          return false;
        }
        const body =
          path === "reject" ? { reason: "غرفه امکان انجام این سفارش را ندارد" } : path === "ship" ? (patch.trackingCode ? { trackingCode: patch.trackingCode } : {}) : undefined;
        const next = await client.call<OrderDto>(`seller/orders/${o.id}/${path}`, { method: "POST", ...(body ? { body } : {}) });
        setOrders((list) => list.map((x) => (x.id === next.id ? toShopOrder(next) : x)));
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    updateListing: async (id, patch) => {
      try {
        const current = listings.find((l) => l.id === id);
        if (patch.prices && Object.keys(patch.prices).length) {
          const prices = Object.entries(patch.prices)
            .filter(([pid, rial]) => current?.packages.find((p) => p.id === pid)?.priceRial !== rial)
            .map(([packageId, priceRial]) => ({ packageId, priceRial }));
          if (prices.length) await client.call(`seller/listings/${id}/prices`, { method: "PATCH", body: { prices } });
        }
        if (patch.stockBase !== undefined && patch.stockBase !== current?.stockBase) await client.call(`seller/listings/${id}/stock`, { method: "PATCH", body: { stockBase: patch.stockBase } });
        if (patch.paused !== undefined) await client.call(`seller/listings/${id}/${patch.paused ? "pause" : "resume"}`, { method: "POST" });
        await reload();
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
  };
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);
  return { toast, showToast };
}

function DemoSellerProvider({ children }: { children: ReactNode }) {
  const { toast, showToast } = useToast();
  const [client] = useState(() => new IdentityClient(API_URL));
  const state = useDemoSeller();
  const value = useMemo<SellerState>(() => ({ ...state, client, toast, showToast }), [state, client, toast, showToast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function ApiSellerProvider({ children }: { children: ReactNode }) {
  const { toast, showToast } = useToast();
  const [client] = useState(() => new IdentityClient(API_URL));
  const state = useApiSeller(client, showToast);
  const value = useMemo<SellerState>(() => ({ ...state, client, toast, showToast }), [state, client, toast, showToast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Demo data on GitHub Pages; the seller's own shop from the API when NEXT_PUBLIC_API_URL is set. */
export const SellerProvider = API_URL ? ApiSellerProvider : DemoSellerProvider;

export function useSeller(): SellerState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSeller outside SellerProvider");
  return s;
}

export const ACTIVE: ShopOrderStatus[] = ["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED"];
