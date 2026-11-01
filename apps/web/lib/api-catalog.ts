"use client";

import {
  REASON_FA,
  search as demoSearch,
  suggest as demoSuggest,
  type Freshness,
  type Listing,
  type NotDeliverableReason,
  type Offer,
  type ProduceType,
  type SearchParams,
  type SearchResult,
  type Shop,
} from "@nobar/demo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "./api-config";

type ShopCard = Shop & {
  rating: number;
};
type OfferView = Omit<Offer, "listing" | "shop"> & { listingId: string; shopId: string };
type ApiHit = {
  listing: Listing;
  shop: ShopCard;
  type: ProduceType;
  freshness: Freshness;
  offer: OfferView;
  relevance: number;
};
type ApiExcluded = {
  listingId: string;
  shopId: string;
  listing: Listing;
  shop: ShopCard;
  reason: NotDeliverableReason;
  reasonFa: string;
};
type ApiSearchResult = { total: number; hits: ApiHit[]; notDeliverable: ApiExcluded[] };
export type CatalogSuggestion = Pick<ProduceType, "id" | "slug" | "name" | "emoji" | "hue" | "categoryId">;
const EMPTY_RESULT: SearchResult = { total: 0, hits: [], notDeliverable: [] };

export class CatalogApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}/v1/${path}`, { cache: "no-store", signal });
  if (!response.ok) throw new CatalogApiError(response.status, "دریافت اطلاعات بازار انجام نشد.");
  return response.json() as Promise<T>;
}

const query = (params: SearchParams) => {
  const value = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) {
    if (item !== undefined && item !== "") value.set(key, String(item));
  }
  return value.toString();
};

const hydrate = (result: ApiSearchResult): SearchResult => ({
  total: result.total,
  hits: result.hits.map((hit) => ({
    ...hit,
    shop: hit.shop,
    offer: { ...hit.offer, listing: hit.listing, shop: hit.shop },
  })),
  notDeliverable: result.notDeliverable.map((item) => ({
    listing: item.listing,
    shop: item.shop,
    reason: item.reason,
  })),
});

export const catalogErrorMessage = (error: unknown) =>
  error instanceof CatalogApiError && error.status >= 400 && error.status < 500
    ? "فیلتر یا شهر انتخاب‌شده معتبر نیست."
    : "ارتباط با بازار برقرار نشد؛ دوباره تلاش کنید.";

export function useCatalogSearch(params: SearchParams) {
  const serialized = useMemo(() => query(params), [params]);
  const demo = useMemo(() => demoSearch(params), [serialized]);
  const [state, setState] = useState<{ result: SearchResult; loading: boolean; error: string | null }>({
    result: API_URL ? EMPTY_RESULT : demo,
    loading: Boolean(API_URL),
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!API_URL) {
      setState({ result: demo, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    request<ApiSearchResult>(`search?${serialized}`, controller.signal)
      .then((result) => setState({ result: hydrate(result), loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((previous) => ({ ...previous, loading: false, error: catalogErrorMessage(error) }));
      });
    return () => controller.abort();
  }, [serialized, demo, attempt]);

  return { ...state, retry, apiMode: Boolean(API_URL) };
}

export function useCatalogSuggestions(text: string, enabled: boolean) {
  const demo = useMemo(() => (enabled ? demoSuggest(text) : []), [text, enabled]);
  const [items, setItems] = useState<CatalogSuggestion[]>(demo);
  const requestNumber = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    if (!API_URL) {
      setItems(demo);
      return;
    }
    const current = ++requestNumber.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      request<CatalogSuggestion[]>(`suggest?q=${encodeURIComponent(text)}`, controller.signal)
        .then((next) => {
          if (current === requestNumber.current) setItems(next);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError") && current === requestNumber.current) setItems([]);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, enabled, demo]);

  return items;
}
