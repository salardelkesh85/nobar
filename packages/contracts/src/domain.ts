// Shared domain vocabulary and DTOs returned by the public API (consumed by apps/web and the AI layer).

export type Role = "BUYER" | "SELLER" | "COURIER" | "ADMIN";

export type Unit = "KG" | "PIECE" | "BUNDLE" | "BOX";
export const UNITS: readonly Unit[] = ["KG", "PIECE", "BUNDLE", "BOX"];
export const UNIT_FA: Record<Unit, string> = { KG: "کیلوگرم", PIECE: "عدد", BUNDLE: "دسته", BOX: "جعبه" };
export const UNIT_FA_SHORT: Record<Unit, string> = { KG: "کیلو", PIECE: "عدد", BUNDLE: "دسته", BOX: "جعبه" };

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
export type SellerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
/** Shop order lifecycle (docs/02 of the kit): one order per shop inside a checkout. */
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "SHIPPED"
  | "DELIVERED"
  | "DISPUTED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";
export type CheckoutStatus = "PENDING_PAYMENT" | "PAID" | "FAILED";
export type PaymentMethod = "GATEWAY" | "COD";
export type PaymentStatus = "INITIATED" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "COD_PENDING";

export const ORDER_STATUS_FA: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  AWAITING_ACCEPTANCE: "در انتظار تأیید غرفه",
  ACCEPTED: "تأیید شد، در حال آماده‌سازی",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  DISPUTED: "در حال بررسی شکایت",
  COMPLETED: "تکمیل شد",
  REJECTED: "رد شد",
  EXPIRED: "منقضی شد",
  CANCELLED: "لغو شد",
  REFUNDED: "بازپرداخت شد",
};

export const SELLER_STATUS_FA: Record<SellerStatus, string> = {
  PENDING: "در انتظار تأیید",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  SUSPENDED: "معلق",
};

export interface CategoryDto {
  id: string;
  parentId: string | null;
  name: string;
  emoji: string;
}

export interface ProductDto {
  id: string;
  sellerId: string;
  sellerName: string;
  cityId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  unit: Unit;
  priceRial: number;
  stock: number;
  /** stock minus active reservations */
  available: number;
  minOrder: number;
  harvestDate: string;
  freshnessHours: number;
  isOrganic: boolean;
  seasonTags: string[];
  status: ProductStatus;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SellerStatsDto {
  ordersTotal: number;
  accepted: number;
  delivered: number;
  cancelledBySeller: number;
  /** delivered / (accepted + cancelled by seller); null while there is too little data */
  reliability: number | null;
}

export interface SellerDto {
  id: string;
  userId: string;
  shopName: string;
  cityId: string;
  description: string;
  status: SellerStatus;
  deliveryFeeRial: number;
  rejectReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  stats: SellerStatsDto;
}

export interface SearchHit extends ProductDto {
  score: number;
  matchedTerms: string[];
}

export interface SearchResponse {
  total: number;
  items: SearchHit[];
  facets: { categories: { id: string; name: string; count: number }[]; organic: number };
  query: { q: string; normalized: string; corrections: Record<string, string> };
  tookMs: number;
}

export type CartIssue = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "BELOW_MIN_ORDER" | "OTHER_CITY";

export interface CartLineDto {
  productId: string;
  name: string;
  emoji: string;
  unit: Unit;
  qty: number;
  unitPriceRial: number;
  lineTotalRial: number;
  available: number;
  minOrder: number;
  issues: CartIssue[];
}

export interface CartGroupDto {
  sellerId: string;
  sellerName: string;
  cityId: string;
  deliveryFeeRial: number;
  items: CartLineDto[];
  subtotalRial: number;
}

export interface CartDto {
  groups: CartGroupDto[];
  itemCount: number;
  itemsTotalRial: number;
  deliveryTotalRial: number;
  totalRial: number;
  hasIssues: boolean;
}

/** Same shape as the store's Address (apps/web/lib/store.tsx). */
export interface AddressDto {
  id: string;
  title: string;
  cityId: string;
  name: string;
  phone: string;
  line: string;
  postalCode: string;
}

export interface OrderItemDto {
  listingId: string;
  packageId: string;
  title: string;
  packageLabel: string;
  qty: number;
  unitPriceRial: number;
  lineTotalRial: number;
}

export interface OrderTimelineDto {
  status: OrderStatus;
  actor: "BUYER" | "SELLER" | "ADMIN" | "SYSTEM";
  note: string | null;
  at: string;
}

export type DisputeReason = "SPOILED" | "DAMAGED" | "UNDERWEIGHT" | "WRONG_ITEM" | "NOT_DELIVERED" | "OTHER";
export const DISPUTE_REASON_FA: Record<DisputeReason, string> = {
  SPOILED: "خراب یا گندیده",
  DAMAGED: "آسیب‌دیده در ارسال",
  UNDERWEIGHT: "کم‌وزن",
  WRONG_ITEM: "اشتباه ارسال شده",
  NOT_DELIVERED: "نرسیده",
  OTHER: "سایر",
};

export interface DisputeDto {
  id: string;
  reason: DisputeReason;
  description: string;
  requested: "FULL_REFUND" | "PARTIAL_REFUND";
  requestedRial: number;
  status: "AWAITING_SELLER" | "AWAITING_STAFF" | "RESOLVED" | "REJECTED";
  sellerResponse: string | null;
  sellerOfferRial: number | null;
  refundRial: number | null;
  resolutionNote: string | null;
  openedAt: string;
  resolvedAt: string | null;
}

/** One shop's part of a checkout. */
export interface OrderDto {
  id: string;
  code: string;
  checkoutId: string;
  buyerId: string;
  shopId: string;
  shopName: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingMethod: string | null;
  address: AddressDto;
  items: OrderItemDto[];
  itemsTotalRial: number;
  deliveryFeeRial: number;
  totalRial: number;
  /** Nobar's commission on items (shown to the seller) */
  commissionRial: number | null;
  refundedRial: number;
  acceptDeadline: string | null;
  etaTo: string | null;
  trackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  complaintEndsAt: string | null;
  cancelReason: string | null;
  timeline: OrderTimelineDto[];
  dispute: DisputeDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutDto {
  id: string;
  status: CheckoutStatus;
  paymentMethod: PaymentMethod;
  totalRial: number;
  orders: OrderDto[];
  redirectUrl: string | null;
  /** stock stays reserved until then; unpaid checkouts are cancelled afterwards */
  expiresAt: string;
  createdAt: string;
}

export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  roles: Role[];
  cityId: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}

/** Public browser session response. Token material is delivered only in HttpOnly cookies. */
export interface AuthSessionDto {
  expiresIn: number;
  user: UserDto;
}
