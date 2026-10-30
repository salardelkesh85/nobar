"use client";

import { listingById, quoteGroup, shopById, type CartLine, type GroupQuote } from "@nobar/demo";
import { useMemo } from "react";
import { useStore } from "./store";

/** Cart items grouped by shop with a delivery quote per shop (one shop order each). */
export function useCartGroups(): { groups: GroupQuote[]; count: number } {
  const { cart, dest } = useStore();
  return useMemo(() => {
    const byShop = new Map<string, CartLine[]>();
    for (const item of cart) {
      const listing = listingById(item.listingId);
      const pkg = listing?.packages.find((p) => p.id === item.packageId);
      if (!listing || !pkg) continue;
      const lines = byShop.get(listing.shopId) ?? [];
      lines.push({ listing, pkg, qty: item.qty });
      byShop.set(listing.shopId, lines);
    }
    const groups = [...byShop.entries()].map(([shopId, lines]) => quoteGroup(shopById(shopId)!, lines, dest));
    return { groups, count: cart.reduce((s, i) => s + i.qty, 0) };
  }, [cart, dest]);
}
