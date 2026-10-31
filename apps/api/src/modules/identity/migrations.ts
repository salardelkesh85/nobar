import type { Migration } from "@nobar/common";

export const identityMigrations: Migration[] = [
  {
    name: "identity/0001_init",
    sql: `
      create schema if not exists identity;

      create table identity.users (
        id uuid primary key,
        phone text not null unique,
        name text,
        roles text[] not null default '{BUYER}',
        city_id text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      -- one live challenge per phone; raw codes are never stored (HMAC only)
      create table identity.otp_challenges (
        phone text primary key,
        code_hash text not null,
        expires_at timestamptz not null,
        attempts int not null default 0,
        sent_at timestamptz not null default now()
      );

      -- rotating refresh tokens: one family per sign-in; reuse of a rotated token revokes the family
      create table identity.refresh_tokens (
        id uuid primary key,
        user_id uuid not null references identity.users(id),
        family_id uuid not null,
        token_hash text not null unique,
        expires_at timestamptz not null,
        revoked_at timestamptz,
        replaced_by uuid,
        created_at timestamptz not null default now()
      );
      create index refresh_tokens_family on identity.refresh_tokens (family_id);

      -- same fields as the store's address form (apps/web/components/address-form.tsx)
      create table identity.addresses (
        id uuid primary key,
        user_id uuid not null references identity.users(id),
        title text not null,
        city_id text not null,
        receiver_name text not null,
        receiver_phone text not null,
        line text not null,
        postal_code text not null default '',
        created_at timestamptz not null default now()
      );
      create index addresses_user on identity.addresses (user_id);
    `,
  },
];
