"use client";

import type { SearchHit } from "@nobar/demo";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ListingCard } from "@/components/listing-card";

export function NobarFreshCarousel({ hits }: { hits: SearchHit[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const go = useCallback((next: number) => {
    const safeIndex = Math.max(0, Math.min(hits.length - 1, next));
    const target = railRef.current?.children.item(safeIndex);
    if (!(target instanceof HTMLElement)) return;
    setActive(safeIndex);
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [hits.length]);

  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const edge = rail.getBoundingClientRect().right;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    Array.from(rail.children).forEach((item, index) => {
      const distance = Math.abs(item.getBoundingClientRect().right - edge);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActive(closestIndex);
  }, []);

  if (!hits.length) return null;

  const progress = ((active + 1) / hits.length) * 100;

  return (
    <div className="nobar-v5-fresh-carousel">
      <div className="nobar-v5-fresh-toolbar">
        <div className="nobar-v5-fresh-progress" aria-live="polite">
          <span>محصول { (active + 1).toLocaleString("fa-IR") } از { hits.length.toLocaleString("fa-IR") }</span>
          <span className="nobar-v5-fresh-progress-track"><i style={{ width: progress + "%" }} /></span>
        </div>
        <div className="nobar-v5-fresh-arrows">
          <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="محصول قبلی">
            <ChevronRight className="size-4" />
          </button>
          <button type="button" onClick={() => go(active + 1)} disabled={active >= hits.length - 1} aria-label="محصول بعدی">
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
      <ul ref={railRef} onScroll={syncActive} className="nobar-v5-fresh-track" aria-label="محصولات نوبر شده">
        {hits.map((hit) => (
          <li key={hit.listing.id} className="nobar-v5-fresh-item">
            <ListingCard hit={hit} variant="row" />
          </li>
        ))}
      </ul>
    </div>
  );
}
