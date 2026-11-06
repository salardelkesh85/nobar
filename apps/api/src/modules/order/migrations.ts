import type { Migration } from "@nobar/common";

export const orderMigrations: Migration[] = [
  {
    name: "order/0001_checkout_reservations",
    sql: `
      create table ordering.checkouts (
        id uuid primary key,
        user_id uuid not null,
        payment_method text not null check (payment_method in ('GATEWAY', 'COD')),
        status text not null check (status in ('PENDING_PAYMENT', 'PAID', 'FAILED')),
        address jsonb not null,
        total_rial bigint not null check (total_rial >= 0),
        expires_at timestamptz not null,
        response jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index checkouts_user on ordering.checkouts (user_id, created_at desc);

      create table ordering.orders (
        id uuid primary key,
        checkout_id uuid not null references ordering.checkouts(id) on delete cascade,
        user_id uuid not null,
        shop_id text not null,
        status text not null check (status in ('PENDING_PAYMENT', 'PLACED', 'SELLER_ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
        payment_method text not null check (payment_method in ('GATEWAY', 'COD')),
        address jsonb not null,
        items_total_rial bigint not null,
        delivery_fee_rial bigint not null,
        total_rial bigint not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index orders_user on ordering.orders (user_id, created_at desc);
      create index orders_checkout on ordering.orders (checkout_id);

      create table ordering.order_items (
        id uuid primary key,
        order_id uuid not null references ordering.orders(id) on delete cascade,
        listing_id text not null,
        package_id text not null,
        name_snapshot text not null,
        package_label_snapshot text not null,
        qty int not null check (qty > 0),
        unit_price_rial bigint not null,
        line_total_rial bigint not null
      );

      create table ordering.stock_reservations (
        id uuid primary key,
        checkout_id uuid not null references ordering.checkouts(id) on delete cascade,
        listing_id text not null,
        package_id text not null,
        quantity_base int not null check (quantity_base > 0),
        qty_packages int not null check (qty_packages > 0),
        expires_at timestamptz not null,
        released_at timestamptz,
        created_at timestamptz not null default now()
      );
      create index stock_reservations_active on ordering.stock_reservations (listing_id, expires_at) where released_at is null;
      create index stock_reservations_checkout on ordering.stock_reservations (checkout_id);
    `,
  },
  {
    // kit shop-order lifecycle, timeline, delivery and complaint fields
    name: "order/0002_lifecycle",
    sql: `
      alter table ordering.orders drop constraint orders_status_check;
      update ordering.orders set status = 'AWAITING_ACCEPTANCE' where status = 'PLACED';
      update ordering.orders set status = 'ACCEPTED' where status in ('SELLER_ACCEPTED', 'PREPARING');
      update ordering.orders set status = 'SHIPPED' where status = 'OUT_FOR_DELIVERY';
      alter table ordering.orders add constraint orders_status_check check (status in (
        'PENDING_PAYMENT', 'AWAITING_ACCEPTANCE', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'DISPUTED',
        'COMPLETED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED'));
      alter table ordering.orders
        add column code text,
        add column shipping_method text,
        add column eta_to timestamptz,
        add column commission_bps int,
        add column commission_rial bigint,
        add column complaint_window_hours int,
        add column accept_deadline timestamptz,
        add column tracking_code text,
        add column shipped_at timestamptz,
        add column delivered_at timestamptz,
        add column complaint_ends_at timestamptz,
        add column refunded_rial bigint not null default 0,
        add column cancel_reason text,
        add column version int not null default 0;
      update ordering.orders set code = 'NB' || substr(replace(id::text, '-', ''), 21, 8) where code is null;
      alter table ordering.orders alter column code set not null;
      create unique index orders_code on ordering.orders (code);
      create index orders_shop on ordering.orders (shop_id, created_at desc);
      create index orders_due on ordering.orders (status, accept_deadline, complaint_ends_at);

      create table ordering.order_events (
        id uuid primary key,
        order_id uuid not null references ordering.orders(id) on delete cascade,
        status text not null,
        actor text not null check (actor in ('BUYER', 'SELLER', 'ADMIN', 'SYSTEM')),
        note text,
        at timestamptz not null default now()
      );
      create index order_events_order on ordering.order_events (order_id, at);

      -- kit flow: buyer opens → seller answers (optional offer) → staff decides
      create table ordering.disputes (
        id uuid primary key,
        order_id uuid not null unique references ordering.orders(id) on delete cascade,
        reason text not null check (reason in ('SPOILED', 'DAMAGED', 'UNDERWEIGHT', 'WRONG_ITEM', 'NOT_DELIVERED', 'OTHER')),
        description text not null,
        requested text not null check (requested in ('FULL_REFUND', 'PARTIAL_REFUND')),
        requested_rial bigint not null check (requested_rial > 0),
        status text not null check (status in ('AWAITING_SELLER', 'AWAITING_STAFF', 'RESOLVED', 'REJECTED')),
        seller_response text,
        seller_offer_rial bigint,
        refund_rial bigint,
        resolution_note text,
        opened_at timestamptz not null default now(),
        resolved_at timestamptz
      );

      alter table ordering.checkouts add column payment_id uuid;
    `,
  },
];
