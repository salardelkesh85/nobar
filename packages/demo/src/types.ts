// Shapes follow docs/02-domain-model.md of the Nobar kit. Money is integer Rial (number, safe integer)
// until the generated API client exists; the API will send it as a decimal string (ADR-004).

export type FreshnessBadge = "FRESH_PICKED" | "FRESH" | "GOOD" | "PREORDER" | "NOT_FRESH";
export type Storage = "AMBIENT" | "COOL" | "COLD";
export type UnitKind = "WEIGHT" | "BUNCH" | "COUNT";
export type Grade = "PREMIUM" | "GRADE_1" | "GRADE_2" | "PROCESSING";
export type ShopType = "GROWER" | "SHOP" | "COOPERATIVE";
export type ShippingMethodCode = "SELLER_LOCAL" | "POST" | "TIPAX" | "FREIGHT";

export type { City, Province } from "@nobar/contracts/cities";

export interface Category {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** illustration kind (packages/ui) */
  art: string;
}

export interface ProduceType {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  aliases: string[];
  unitKind: UnitKind;
  shelfLifeDays: number;
  storage: Storage;
  minShelfDaysOnArrival: number;
  complaintWindowHours: number;
  /** Jalali months 1–12 */
  months: number[];
  peakMonths: number[];
  storageTips: string;
  emoji: string;
  hue: number;
  needsReview: boolean;
}

export interface ShippingRate {
  method: ShippingMethodCode;
  baseRial: number;
  perKgRial: number;
  freeOverRial?: number;
  maxWeightGrams: number;
}

export interface FarmStory {
  title: string;
  body: string[];
  practices: string[];
  sinceYear: number;
}

export interface Shop {
  id: string;
  slug: string;
  name: string;
  type: ShopType;
  cityId: string;
  ownerName: string;
  handlingDays: number;
  acceptanceSlaHours: number;
  ratingAvg: number;
  ratingCount: number;
  freshnessRatingAvg: number;
  cancellations90d: number;
  joinedYear: number;
  status: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  story: FarmStory;
  shipping: ShippingRate[];
  emoji: string;
  hue: number;
  /** illustration kind of the shop's signature produce */
  art: string;
}

export interface ListingPackage {
  id: string;
  label: string;
  netGrams?: number;
  units?: number;
  priceRial: number;
}

export interface Listing {
  id: string;
  slug: string;
  shopId: string;
  produceTypeId: string;
  title: string;
  variety?: string;
  description: string;
  grade: Grade;
  originCityId: string;
  isOrganic: boolean;
  harvestedAt: string;
  /** remaining base quantity: grams for WEIGHT, units otherwise */
  stockBase: number;
  packages: ListingPackage[];
  isPreorder?: boolean;
  preorderDispatchFrom?: string;
  publishedAt: string;
  /** «نوبر» badge until this date (docs/02 §15) */
  nobarUntil?: string;
  tags: string[];
  status: "PUBLISHED" | "PAUSED" | "PENDING_REVIEW";
}

export interface Review {
  id: string;
  listingId: string;
  shopId: string;
  buyerName: string;
  buyerCity: string;
  rating: number;
  freshnessRating: number;
  text: string;
  createdAt: string;
  sellerReply?: string;
}
