// Data-independent rules: pricing (§7), shipping cost, phrases and labels.
import type { Listing, ListingPackage, ShippingMethodCode, Shop } from "./types";

/** price_rial × 1000 / net_grams, rounded half-up to whole Rial. */
export const pricePerKg = (priceRial: number, netGrams: number): number => Math.floor((priceRial * 1000 + Math.floor(netGrams / 2)) / netGrams);

export const packageGrams = (p: ListingPackage): number => p.netGrams ?? (p.units ?? 1) * 500; // bunch ≈ 500 g for shipping
export const minPricePerKg = (l: Listing): number | null => {
  const per = l.packages.filter((p) => p.netGrams).map((p) => pricePerKg(p.priceRial, p.netGrams!));
  return per.length ? Math.min(...per) : null;
};

export type PricePosition = "BELOW" | "FAIR" | "ABOVE" | "UNKNOWN";
export const PRICE_POSITION_FA: Record<PricePosition, string> = { BELOW: "پایین‌تر از بازار", FAIR: "قیمت منصفانه", ABOVE: "بالاتر از بازار", UNKNOWN: "آمار کافی نیست" };

export const METHOD_FA: Record<ShippingMethodCode, string> = { SELLER_LOCAL: "پیک غرفه‌دار (همان شهر)", POST: "پست پیشتاز", TIPAX: "تیپاکس", FREIGHT: "باربری" };

export function shippingCost(shop: Shop, method: ShippingMethodCode, grams: number, itemsRial: number): number | null {
  const rate = shop.shipping.find((r) => r.method === method);
  if (!rate || grams > rate.maxWeightGrams) return null;
  if (rate.freeOverRial !== undefined && itemsRial >= rate.freeOverRial) return 0;
  return rate.baseRial + rate.perKgRial * Math.ceil(grams / 1000);
}

export type NotDeliverableReason = "NOT_DELIVERABLE" | "NOT_FRESH_ON_ARRIVAL" | "OUT_OF_STOCK" | "TOO_HEAVY";
export const REASON_FA: Record<NotDeliverableReason, string> = {
  NOT_DELIVERABLE: "به شهر شما ارسال ندارد",
  NOT_FRESH_ON_ARRIVAL: "تا شهر شما تازه نمی‌رسد",
  OUT_OF_STOCK: "موجود نیست",
  TOO_HEAVY: "برای این روش ارسال سنگین است",
};

export function etaPhrase(o: { etaMinDays: number; etaMaxDays: number }): string {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (o.etaMaxDays === 0) return "همین امروز";
  if (o.etaMaxDays === 1 && o.etaMinDays <= 1) return o.etaMinDays === 0 ? "امروز یا فردا" : "فردا";
  if (o.etaMinDays === o.etaMaxDays) return `${fa(o.etaMaxDays)} روز دیگر`;
  return `${fa(o.etaMinDays)} تا ${fa(o.etaMaxDays)} روز دیگر`;
}

export type Preset = "balanced" | "budget" | "freshest" | "fastest";
export const PRESET_FA: Record<Preset, string> = { balanced: "متعادل", budget: "ارزان‌ترین", freshest: "تازه‌ترین", fastest: "زودترین" };

export type CompareBadge = "CHEAPEST_LANDED" | "FRESHEST" | "FASTEST" | "BEST_OVERALL";
export const COMPARE_BADGE_FA: Record<CompareBadge, string> = {
  CHEAPEST_LANDED: "ارزان‌ترین تا درِ خانه",
  FRESHEST: "تازه‌ترین هنگام رسیدن",
  FASTEST: "زودترین ارسال",
  BEST_OVERALL: "انتخاب باغبون",
};

export type SortKey = "relevance" | "landed" | "freshness" | "newest" | "rating";
export const SORT_FA: Record<SortKey, string> = { relevance: "مرتبط‌ترین", landed: "ارزان‌ترین تا درِ خانه", freshness: "تازه‌ترین", newest: "جدیدترین", rating: "بهترین امتیاز" };
