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
];
