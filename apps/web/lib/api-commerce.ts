"use client";

import { IdentityApiError, type IdentityClient } from "@nobar/contracts";
import type { CartLine, DeliveryOption, Shop } from "@nobar/demo";
import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "./store";

/** One shop's part of the cart, the same shape in demo and API mode. `reasonFa` is ready to show. */
export interface CartGroup {
  shop: Shop;
  lines: CartLine[];
  itemsRial: number;
  grams: number;
  options: DeliveryOption[];
  blocked: Array<{ line: CartLine; reason: string; reasonFa: string }>;
}

/** GET /v1/cart (apps/api cart.service CartView). */
interface ServerCart {
  groups: Array<Omit<CartGroup, "blocked"> & { blocked: Array<{ line: CartLine; reason: string; reasonFa: string }> }>;
  itemCount: number;
}

/** A fresh Idempotency-Key for one user action. */
export const newIdempotencyKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const apiErrorMessage = (e: unknown) =>
  e instanceof IdentityApiError ? e.message : "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.";

const lineKey = (l: CartLine) => `${l.listing.id}:${l.pkg.id}`;

/** JSON gives blocked lines their own copies; point them back at the group's line objects. */
function normalize(view: ServerCart): CartGroup[] {
  return view.groups.map((g) => {
    const byKey = new Map(g.lines.map((l) => [lineKey(l), l]));
    return { ...g, blocked: g.blocked.map((b) => ({ ...b, line: byKey.get(lineKey(b.line)) ?? b.line })) };
  });
}

/**
 * The server cart (API mode, signed in). Every change answers with the revalidated cart, so prices,
 * stock and delivery options always come from the API.
 */
export function useApiCart(client: IdentityClient, signedIn: boolean, dest: string) {
  const [groups, setGroups] = useState<CartGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const apply = useCallback((view: ServerCart) => setGroups(normalize(view)), []);

  useEffect(() => {
    if (!signedIn) {
      setGroups([]);
      setLoaded(false);
      return;
    }
    let live = true;
    client
      .call<ServerCart>(`cart?dest=${encodeURIComponent(dest)}`)
      .then((v) => live && apply(v))
      .catch(() => live && setGroups([]))
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [client, signedIn, dest, apply]);

  const q = `?dest=${encodeURIComponent(dest)}`;
  const items: CartItem[] = groups.flatMap((g) => g.lines.map((l) => ({ listingId: l.listing.id, packageId: l.pkg.id, qty: l.qty })));
  return {
    groups,
    /** false until the first answer for this session (avoids flashing an empty cart) */
    loaded,
    items,
    /** re-read the cart after something else changed it (a confirmed assistant proposal) */
    refresh: async () => apply(await client.call<ServerCart>(`cart${q}`)),
    add: async (item: CartItem) => apply(await client.call<ServerCart>(`cart/items${q}`, { method: "POST", body: item, idempotencyKey: newIdempotencyKey() })),
    set: async (listingId: string, packageId: string, qty: number) => apply(await client.call<ServerCart>(`cart/items${q}`, { method: "PATCH", body: { listingId, packageId, qty } })),
    clear: async () => apply(await client.call<ServerCart>(`cart${q}`, { method: "DELETE" })),
  };
}
