import type { OrderStatus, PaymentMethod, ProductStatus, Role, SellerStatus, Unit } from "./domain";

/** Every domain event the platform publishes. Payloads are versioned via the envelope's dataschema. */
export const EventTypes = {
  UserRegistered: "user.registered",
  UserUpdated: "user.updated",
  SellerRegistered: "seller.registered",
  SellerUpdated: "seller.updated",
  SellerApproved: "seller.approved",
  SellerRejected: "seller.rejected",
  SellerSuspended: "seller.suspended",
  ProductCreated: "product.created",
  ProductUpdated: "product.updated",
  ProductArchived: "product.archived",
  StockChanged: "stock.changed",
  StockLow: "stock.low",
  OrderPlaced: "order.placed",
  OrderAccepted: "order.accepted",
  OrderStatusChanged: "order.status_changed",
  OrderCancelled: "order.cancelled",
  OrderDelivered: "order.delivered",
  PaymentSucceeded: "payment.succeeded",
  PaymentFailed: "payment.failed",
  PaymentRefunded: "payment.refunded",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface UserEventData {
  userId: string;
  roles: Role[];
  cityId: string | null;
}

export interface SellerEventData {
  sellerId: string;
  userId: string;
  shopName: string;
  cityId: string;
  status: SellerStatus;
  deliveryFeeRial: number;
  reason?: string;
}

export interface ProductSnapshot {
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
  available: number;
  minOrder: number;
  harvestDate: string;
  isOrganic: boolean;
  seasonTags: string[];
  status: ProductStatus;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockEventData {
  productId: string;
  sellerId: string;
  stock: number;
  available: number;
  status: ProductStatus;
}

export interface OrderEventData {
  orderId: string;
  checkoutId: string;
  buyerId: string;
  sellerId: string;
  cityId: string;
  status: OrderStatus;
  previousStatus: OrderStatus | null;
  paymentMethod: PaymentMethod;
  itemsTotalRial: number;
  deliveryFeeRial: number;
  totalRial: number;
  reason?: string;
  /** who caused a cancellation: buyer, seller, system (timeout / payment failure) */
  cancelledBy?: "BUYER" | "SELLER" | "SYSTEM";
}

export interface PaymentEventData {
  paymentId: string;
  checkoutId: string;
  buyerId: string;
  method: PaymentMethod;
  amountRial: number;
  reason?: string;
}

export interface RefundEventData {
  refundId: string;
  paymentId: string;
  orderId: string;
  amountRial: number;
  reason: string;
}

export interface EventMap {
  "user.registered": UserEventData;
  "user.updated": UserEventData;
  "seller.registered": SellerEventData;
  "seller.updated": SellerEventData;
  "seller.approved": SellerEventData;
  "seller.rejected": SellerEventData;
  "seller.suspended": SellerEventData;
  "product.created": ProductSnapshot;
  "product.updated": ProductSnapshot;
  "product.archived": ProductSnapshot;
  "stock.changed": StockEventData;
  "stock.low": StockEventData;
  "order.placed": OrderEventData;
  "order.accepted": OrderEventData;
  "order.status_changed": OrderEventData;
  "order.cancelled": OrderEventData;
  "order.delivered": OrderEventData;
  "payment.succeeded": PaymentEventData;
  "payment.failed": PaymentEventData;
  "payment.refunded": RefundEventData;
}
