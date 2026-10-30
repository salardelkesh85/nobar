// Shared domain vocabulary and DTOs returned by the public API (consumed by apps/web and the AI layer).

export type Role = "BUYER" | "SELLER" | "COURIER" | "ADMIN";

export type Unit = "KG" | "PIECE" | "BUNDLE" | "BOX";
export const UNITS: readonly Unit[] = ["KG", "PIECE", "BUNDLE", "BOX"];
export const UNIT_FA: Record<Unit, string> = { KG: "کیلوگرم", PIECE: "عدد", BUNDLE: "دسته", BOX: "جعبه" };
export const UNIT_FA_SHORT: Record<Unit, string> = { KG: "کیلو", PIECE: "عدد", BUNDLE: "دسته", BOX: "جعبه" };

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
export type SellerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PLACED"
  | "SELLER_ACCEPTED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type CheckoutStatus = "PENDING_PAYMENT" | "PAID" | "FAILED";
export type PaymentMethod = "GATEWAY" | "COD";
export type PaymentStatus = "INITIATED" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "COD_PENDING";

export const ORDER_STATUS_FA: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PLACED: "ثبت‌شده، در انتظار تأیید فروشنده",
  SELLER_ACCEPTED: "تأیید فروشنده",
  PREPARING: "در حال آماده‌سازی",
  OUT_FOR_DELIVERY: "ارسال شد",
  DELIVERED: "تحویل شد",
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

export interface AddressDto {
  id?: string;
  cityId: string;
  text: string;
  label?: string | null;
}

export interface OrderItemDto {
  productId: string;
  name: string;
  emoji: string;
  unit: Unit;
  qty: number;
  unitPriceRial: number;
  lineTotalRial: number;
}

export interface OrderTimelineDto {
  status: OrderStatus;
  at: string;
  note: string | null;
}

export interface OrderDto {
  id: string;
  checkoutId: string;
  buyerId: string;
  sellerId: string;
  sellerName: string;
  cityId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  itemsTotalRial: number;
  deliveryFeeRial: number;
  totalRial: number;
  address: AddressDto;
  items: OrderItemDto[];
  timeline: OrderTimelineDto[];
  sellerAcceptDeadline: string | null;
  cancelReason: string | null;
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
  createdAt: string;
}

export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  roles: Role[];
  cityId: string | null;
  sellerId: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}
