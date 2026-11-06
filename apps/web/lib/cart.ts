"use client";

import { listingById, quoteGroup, REASON_FA, shopById, type CartLine } from "@nobar/demo";
import { useMemo } from "react";
import type { CartGroup } from "./api-commerce";
import { useStore } from "./store";

/** Cart items grouped by shop with a delivery quote per shop (one shop order each). API mode: the server's quote. */
export function useCartGroups(): { groups: CartGroup[]; count: number; loading: boolean } {
  const { cart, dest, apiMode, serverCart, serverCartLoaded, user } = useStore();
  return useMemo(() => {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    if (apiMode) return { groups: serverCart, count, loading: !!user && !serverCartLoaded };
    const byShop = new Map<string, CartLine[]>();
    for (const item of cart) {
      const listing = listingById(item.listingId);
      const pkg = listing?.packages.find((p) => p.id === item.packageId);
      if (!listing || !pkg) continue;
      const lines = byShop.get(listing.shopId) ?? [];
      lines.push({ listing, pkg, qty: item.qty });
      byShop.set(listing.shopId, lines);
    }
    const groups = [...byShop.entries()].map(([shopId, lines]) => {
      const q = quoteGroup(shopById(shopId)!, lines, dest);
      return { ...q, blocked: q.blocked.map((b) => ({ ...b, reasonFa: REASON_FA[b.reason] })) };
    });
    return { groups, count, loading: false };
  }, [cart, dest, apiMode, serverCart, serverCartLoaded, user]);
}
