import type { Migration } from "@nobar/common";

export const cartMigrations: Migration[] = [
  {
    name: "cart/0001_init",
    sql: `
      create schema if not exists ordering;

      create table ordering.carts (
        user_id uuid primary key,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table ordering.cart_items (
        user_id uuid not null references ordering.carts(user_id) on delete cascade,
        listing_id text not null,
        package_id text not null,
        qty int not null check (qty > 0 and qty <= 100),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (user_id, listing_id, package_id)
      );
      create index cart_items_user on ordering.cart_items (user_id, updated_at);
    `,
  },
];
