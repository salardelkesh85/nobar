import { iso, isoOrNull, type Sql } from "@nobar/common";
import { type AddressDto, type DisputeDto, type OrderDto, type OrderItemDto, type OrderStatus, type OrderTimelineDto, type PaymentMethod, uuidv7 } from "@nobar/contracts";

interface OrderRow {
  id: string;
  code: string;
  checkout_id: string;
  user_id: string;
  shop_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  shipping_method: string | null;
  address: AddressDto;
  items_total_rial: number;
  delivery_fee_rial: number;
  total_rial: number;
  commission_rial: number | null;
  refunded_rial: number;
  accept_deadline: Date | null;
  eta_to: Date | null;
  tracking_code: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  complaint_ends_at: Date | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Builds full order views from the ordering tables. `where` is a fixed SQL condition on `o`
 * written by this module (values always go through `params`).
 */
export async function loadOrders(sql: Sql, where: string, params: unknown[], shopName: (shopId: string) => string): Promise<OrderDto[]> {
  const rows = await sql.query<OrderRow>(`select o.* from ordering.orders o where ${where} order by o.created_at desc, o.id`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  // sequential on purpose: one transaction connection runs one statement at a time
  const items = await sql.query<{ order_id: string; listing_id: string; package_id: string; name_snapshot: string; package_label_snapshot: string; qty: number; unit_price_rial: number; line_total_rial: number }>(
      "select * from ordering.order_items where order_id = any($1::uuid[]) order by id",
      [ids],
    );
  const events = await sql.query<{ order_id: string; status: OrderStatus; actor: OrderTimelineDto["actor"]; note: string | null; at: Date }>(
      "select order_id, status, actor, note, at from ordering.order_events where order_id = any($1::uuid[]) order by at, id",
      [ids],
    );
  const disputes = await sql.query<{
      id: string;
      order_id: string;
      reason: DisputeDto["reason"];
      description: string;
      requested: DisputeDto["requested"];
      requested_rial: number;
      status: DisputeDto["status"];
      seller_response: string | null;
      seller_offer_rial: number | null;
      refund_rial: number | null;
      resolution_note: string | null;
      opened_at: Date;
      resolved_at: Date | null;
    }>("select * from ordering.disputes where order_id = any($1::uuid[])", [ids]);
  const group = <T extends { order_id: string }>(list: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of list) m.set(x.order_id, [...(m.get(x.order_id) ?? []), x]);
    return m;
  };
  const itemsBy = group(items);
  const eventsBy = group(events);
  const disputeBy = new Map(disputes.map((d) => [d.order_id, d]));
  return rows.map((r): OrderDto => {
    const d = disputeBy.get(r.id);
    return {
      id: r.id,
      code: r.code,
      checkoutId: r.checkout_id,
      buyerId: r.user_id,
      shopId: r.shop_id,
      shopName: shopName(r.shop_id),
      status: r.status,
      paymentMethod: r.payment_method,
      shippingMethod: r.shipping_method,
      address: r.address,
      items: (itemsBy.get(r.id) ?? []).map(
        (i): OrderItemDto => ({
          listingId: i.listing_id,
          packageId: i.package_id,
          title: i.name_snapshot,
          packageLabel: i.package_label_snapshot,
          qty: i.qty,
          unitPriceRial: Number(i.unit_price_rial),
          lineTotalRial: Number(i.line_total_rial),
        }),
      ),
      itemsTotalRial: Number(r.items_total_rial),
      deliveryFeeRial: Number(r.delivery_fee_rial),
      totalRial: Number(r.total_rial),
      commissionRial: r.commission_rial === null ? null : Number(r.commission_rial),
      refundedRial: Number(r.refunded_rial),
      acceptDeadline: isoOrNull(r.accept_deadline),
      etaTo: isoOrNull(r.eta_to),
      trackingCode: r.tracking_code,
      shippedAt: isoOrNull(r.shipped_at),
      deliveredAt: isoOrNull(r.delivered_at),
      complaintEndsAt: isoOrNull(r.complaint_ends_at),
      cancelReason: r.cancel_reason,
      timeline: (eventsBy.get(r.id) ?? []).map((e) => ({ status: e.status, actor: e.actor, note: e.note, at: iso(e.at) })),
      dispute: d
        ? {
            id: d.id,
            reason: d.reason,
            description: d.description,
            requested: d.requested,
            requestedRial: Number(d.requested_rial),
            status: d.status,
            sellerResponse: d.seller_response,
            sellerOfferRial: d.seller_offer_rial === null ? null : Number(d.seller_offer_rial),
            refundRial: d.refund_rial === null ? null : Number(d.refund_rial),
            resolutionNote: d.resolution_note,
            openedAt: iso(d.opened_at),
            resolvedAt: isoOrNull(d.resolved_at),
          }
        : null,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    };
  });
}

/** Appends a timeline row; every status change writes one in the same transaction. */
export async function recordEvent(sql: Sql, orderId: string, status: OrderStatus, actor: OrderTimelineDto["actor"], note: string | null): Promise<void> {
  await sql.query("insert into ordering.order_events (id, order_id, status, actor, note) values ($1, $2, $3, $4, $5)", [uuidv7(), orderId, status, actor, note]);
}
