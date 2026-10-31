import type { Migration } from "@nobar/common";

// Field names follow packages/domain/src/types.ts. Shop story/shipping and listing packages are small
// value objects that are always read with their parent, so they are stored as jsonb.
export const catalogMigrations: Migration[] = [
  {
    name: "catalog/0001_init",
    sql: `
      create schema if not exists catalog;

      create table catalog.categories (
        id text primary key,
        slug text not null unique,
        name text not null,
        emoji text not null,
        art text not null,
        position int not null
      );

      create table catalog.produce_types (
        id text primary key,
        slug text not null unique,
        name text not null,
        category_id text not null references catalog.categories(id),
        aliases text[] not null default '{}',
        unit_kind text not null check (unit_kind in ('WEIGHT', 'BUNCH', 'COUNT')),
        shelf_life_days int not null check (shelf_life_days > 0),
        storage text not null check (storage in ('AMBIENT', 'COOL', 'COLD')),
        min_shelf_days_on_arrival int not null check (min_shelf_days_on_arrival >= 0),
        complaint_window_hours int not null,
        months int[] not null,
        peak_months int[] not null,
        storage_tips text not null default '',
        emoji text not null,
        hue int not null,
        needs_review boolean not null default false,
        -- display order (also the order rules see ties in)
        position int not null
      );

      create table catalog.shops (
        id text primary key,
        slug text not null unique,
        name text not null,
        type text not null check (type in ('GROWER', 'SHOP', 'COOPERATIVE')),
        city_id text not null,
        owner_name text not null,
        -- identity.users id of the seller; null for imported demo shops
        owner_user_id uuid,
        handling_days int not null check (handling_days >= 0),
        acceptance_sla_hours int not null,
        rating_avg double precision not null default 0,
        rating_count int not null default 0,
        freshness_rating_avg double precision not null default 0,
        cancellations_90d int not null default 0,
        joined_year int not null,
        status text not null check (status in ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED')),
        story jsonb not null,
        shipping jsonb not null,
        emoji text not null,
        hue int not null,
        art text not null,
        position int not null,
        created_at timestamptz not null default now()
      );
      create index shops_city on catalog.shops (city_id);

      create table catalog.listings (
        id text primary key,
        slug text not null unique,
        shop_id text not null references catalog.shops(id),
        produce_type_id text not null references catalog.produce_types(id),
        title text not null,
        variety text,
        description text not null,
        grade text not null check (grade in ('PREMIUM', 'GRADE_1', 'GRADE_2', 'PROCESSING')),
        origin_city_id text not null,
        is_organic boolean not null default false,
        harvested_at timestamptz not null,
        -- grams for WEIGHT produce, units otherwise
        stock_base int not null check (stock_base >= 0),
        packages jsonb not null,
        is_preorder boolean not null default false,
        preorder_dispatch_from timestamptz,
        published_at timestamptz not null,
        nobar_until timestamptz,
        tags text[] not null default '{}',
        status text not null check (status in ('PUBLISHED', 'PAUSED', 'PENDING_REVIEW')),
        position int not null,
        updated_at timestamptz not null default now()
      );
      create index listings_shop on catalog.listings (shop_id);
      create index listings_type on catalog.listings (produce_type_id);
    `,
  },
];
