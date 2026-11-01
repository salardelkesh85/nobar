"use client";

import {
  LISTINGS,
  REASON_FA,
  SHOPS,
  categoryById,
  cityById,
  currentMonth,
  freshnessOf,
  harvestPhrase,
  inSeason,
  isNobar,
  isPeak,
  listingBySlug,
  marketStat,
  pricePosition,
  produceTypeBySlug,
  provinceOfCity,
  quoteDelivery,
  search as demoSearch,
  shopBySlug,
  suggest as demoSuggest,
  type Category,
  type City,
  type DeliveryQuote,
  type Freshness,
  type Listing,
  type MarketStat,
  type NotDeliverableReason,
  type Offer,
  type PricePosition,
  type ProduceType,
  type Province,
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
export type ListingDetail = {
  listing: Listing;
  shop: ShopCard;
  type: ProduceType;
  category: Category;
  freshness: Freshness & { phrase: string };
  delivery: DeliveryQuote;
  marketStat: MarketStat | null;
  pricePosition: PricePosition;
  isNobar: boolean;
};
export type ShopDetail = { shop: ShopCard; listings: Listing[] };
export type ProduceTypeDetail = ProduceType & {
  category: Category;
  inSeason: boolean;
  isPeak: boolean;
  marketStat: MarketStat | null;
};
type ApiOriginDetail = { city: City; province: Province; shops: ShopCard[]; totalListings: number; search: ApiSearchResult };
export type OriginDetail = Omit<ApiOriginDetail, "search"> & { search: SearchResult };
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

const hydrateOrigin = (result: ApiOriginDetail): OriginDetail => ({ ...result, search: hydrate(result.search) });
const identity = <T,>(value: T): T => value;

export const catalogErrorMessage = (error: unknown) =>
  error instanceof CatalogApiError && error.status === 404
    ? "این اطلاعات در بازار پیدا نشد."
    : error instanceof CatalogApiError && error.status >= 400 && error.status < 500
      ? "فیلتر یا شهر انتخاب‌شده معتبر نیست."
    : "ارتباط با بازار برقرار نشد؛ دوباره تلاش کنید.";

function useCatalogResource<TApi, TData = TApi>(path: string, fallback: TData | undefined, transform: (value: TApi) => TData = identity as (value: TApi) => TData) {
  const [state, setState] = useState<{ data: TData | undefined; loading: boolean; error: string | null }>({
    data: API_URL ? undefined : fallback,
    loading: Boolean(API_URL),
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!API_URL) {
      setState({ data: fallback, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState({ data: undefined, loading: true, error: null });
    request<TApi>(path, controller.signal)
      .then((value) => setState({ data: transform(value), loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ data: undefined, loading: false, error: catalogErrorMessage(error) });
      });
    return () => controller.abort();
  }, [path, fallback, transform, attempt]);

  return { ...state, retry, apiMode: Boolean(API_URL) };
}

export function useCatalogListing(id: string, dest: string) {
  const fallback = useMemo<ListingDetail | undefined>(() => {
    const listing = listingBySlug(id);
    if (!listing) return undefined;
    const shop = SHOPS.find((item) => item.id === listing.shopId);
    const type = produceTypeBySlug(listing.produceTypeId);
    const category = type ? categoryById(type.categoryId) : undefined;
    if (!shop || !type || !category) return undefined;
    const freshness = freshnessOf(listing);
    return {
      listing,
      shop: { ...shop, rating: shop.ratingAvg },
      type,
      category,
      freshness: { ...freshness, phrase: harvestPhrase(freshness) },
      delivery: quoteDelivery(listing, dest),
      marketStat: marketStat(type.id) ?? null,
      pricePosition: pricePosition(listing),
      isNobar: isNobar(listing),
    };
  }, [id, dest]);
  return useCatalogResource<ListingDetail>(`listings/${encodeURIComponent(id)}?dest=${encodeURIComponent(dest)}`, fallback);
}

export function useCatalogShop(id: string) {
  const fallback = useMemo<ShopDetail | undefined>(() => {
    const shop = shopBySlug(id);
    return shop
      ? { shop: { ...shop, rating: shop.ratingAvg }, listings: LISTINGS.filter((listing) => listing.shopId === shop.id && listing.status === "PUBLISHED") }
      : undefined;
  }, [id]);
  return useCatalogResource<ShopDetail>(`shops/${encodeURIComponent(id)}`, fallback);
}

export function useCatalogProduceType(id: string) {
  const fallback = useMemo<ProduceTypeDetail | undefined>(() => {
    const type = produceTypeBySlug(id);
    const category = type ? categoryById(type.categoryId) : undefined;
    if (!type || !category) return undefined;
    const month = currentMonth();
    return { ...type, category, inSeason: inSeason(type, month), isPeak: isPeak(type, month), marketStat: marketStat(type.id) ?? null };
  }, [id]);
  return useCatalogResource<ProduceTypeDetail>(`catalog/produce-types/${encodeURIComponent(id)}`, fallback);
}

export function useCatalogOrigin(id: string, dest: string) {
  const fallback = useMemo<OriginDetail | undefined>(() => {
    const city = cityById(id);
    const province = city ? provinceOfCity(city.id) : undefined;
    if (!city || !province) return undefined;
    const result = demoSearch({ dest });
    const hits = result.hits.filter((hit) => hit.listing.originCityId === city.id);
    const notDeliverable = result.notDeliverable.filter((item) => item.listing.originCityId === city.id);
    return {
      city,
      province,
      shops: SHOPS.filter((shop) => shop.status === "ACTIVE" && shop.cityId === city.id).map((shop) => ({ ...shop, rating: shop.ratingAvg })),
      totalListings: LISTINGS.filter((listing) => listing.status === "PUBLISHED" && listing.originCityId === city.id).length,
      search: { total: hits.length, hits, notDeliverable },
    };
  }, [id, dest]);
  return useCatalogResource<ApiOriginDetail, OriginDetail>(`origins/${encodeURIComponent(id)}?dest=${encodeURIComponent(dest)}`, fallback, hydrateOrigin);
}

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
