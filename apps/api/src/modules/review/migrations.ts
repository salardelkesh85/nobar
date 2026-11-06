import type { Migration } from "@nobar/common";

export const reviewMigrations: Migration[] = [
  {
    name: "review/0001_init",
    sql: `
      create schema if not exists review;

      -- only buyers whose order arrived can review; staff approve before it is shown (store copy: «پس از بررسی نمایش داده می‌شود»)
      create table review.reviews (
        id text primary key,
        listing_id text not null,
        shop_id text not null,
        order_id uuid,
        user_id uuid,
        buyer_name text not null,
        buyer_city text not null,
        rating int not null check (rating between 1 and 5),
        freshness_rating int not null check (freshness_rating between 1 and 5),
        text text not null,
        status text not null check (status in ('PENDING', 'PUBLISHED', 'REJECTED')),
        flags text[] not null default '{}',
        seller_reply text,
        created_at timestamptz not null default now(),
        published_at timestamptz
      );
      create unique index reviews_order_listing on review.reviews (order_id, listing_id) where order_id is not null;
      create index reviews_listing on review.reviews (listing_id, status, created_at desc);
      create index reviews_shop on review.reviews (shop_id, created_at desc);

      create table review.questions (
        id uuid primary key,
        listing_id text not null,
        shop_id text not null,
        user_id uuid not null,
        question text not null,
        answer text,
        status text not null check (status in ('OPEN', 'ANSWERED', 'HIDDEN')),
        flags text[] not null default '{}',
        created_at timestamptz not null default now(),
        answered_at timestamptz
      );
      create index questions_listing on review.questions (listing_id, status, created_at desc);
      create index questions_shop on review.questions (shop_id, status, created_at desc);
    `,
  },
];
