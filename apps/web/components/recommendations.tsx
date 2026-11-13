"use client";

import { produceTypeById } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Badge, Toman } from "@nobar/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/photo";
import { API_URL } from "@/lib/api-config";
import { useStore } from "@/lib/store";

/** GET /v1/recommendations (apps/api recommendation module). */
interface Recommendation {
  listingId: string;
  slug: string;
  title: string;
  produceTypeId: string;
  shopName: string;
  landedPerKgRial: number;
  arrivesWithinDays: number;
  reasonCode: "BOUGHT_TOGETHER" | "POPULAR" | "PEAK_SEASON" | "IN_SEASON";
  reason: string;
}

const TONE = { BOUGHT_TOGETHER: "brand", POPULAR: "nobar", PEAK_SEASON: "saffron", IN_SEASON: "neutral" } as const;

/**
 * API mode only: recommendations with their reason. `for` picks the list — the home page, what goes with a
 * listing, or what goes with the signed-in buyer's cart. Renders nothing when the list is empty, the flag is
 * off, or the call fails (recommendations are never essential).
 */
export function Recommendations({ for: target, title }: { for: { home: true } | { listingId: string } | { cart: true }; title: string }) {
  const { dest, api, user, cart } = useStore();
  const [items, setItems] = useState<Recommendation[]>([]);
  const key = "listingId" in target ? `l:${target.listingId}` : "cart" in target ? `c:${cart.map((c) => c.listingId).join(",")}` : "h";

  useEffect(() => {
    if (!API_URL) return;
    let live = true;
    const q = `dest=${encodeURIComponent(dest)}`;
    const load =
      "cart" in target
        ? user
          ? api.call<{ items: Recommendation[] }>(`recommendations/cart?${q}`)
          : fetch(`${API_URL}/v1/recommendations?${q}`).then((r) => r.json() as Promise<{ items: Recommendation[] }>)
        : fetch(`${API_URL}/v1/recommendations?${q}${"listingId" in target ? `&listingId=${encodeURIComponent(target.listingId)}` : ""}`).then((r) => (r.ok ? (r.json() as Promise<{ items: Recommendation[] }>) : { items: [] }));
    load.then((r) => live && setItems(r.items ?? [])).catch(() => live && setItems([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dest, user, api]);

  if (!API_URL || !items.length) return null;
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface" aria-label={title}>
      <h2 className="px-4 pt-4 text-lg font-extrabold">{title}</h2>
      <ul className="flex snap-x gap-3 overflow-x-auto p-4 scrollbar-none">
        {items.map((r) => {
          const type = produceTypeById(r.produceTypeId);
          return (
            <li key={r.listingId} className="w-56 shrink-0 snap-start">
              <Link href={`/l/${r.listingId}`} className="flex h-full flex-col gap-2 rounded-control border border-line p-2 hover:border-brand">
                <Photo kind={r.produceTypeId} alt="" className="aspect-[4/3] w-full rounded-control" fallback={{ emoji: type?.emoji ?? "🍎", hue: type?.hue ?? 120 }} />
                <Badge tone={TONE[r.reasonCode]} className="self-start">
                  {r.reason}
                </Badge>
                <p className="line-clamp-1 text-sm font-bold">{r.title}</p>
                <p className="text-xs text-ink-soft">{r.shopName}</p>
                <p className="mt-auto text-xs">
                  هر کیلو تا درِ خانه <Toman rial={r.landedPerKgRial} className="font-bold" /> · تا {toFaDigits(r.arrivesWithinDays)} روز
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
