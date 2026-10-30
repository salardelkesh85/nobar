import type { Migration } from "@nobar/common";

export const migrations: Migration[] = [
  {
    name: "identity/0001_init",
    sql: `
      create table users (
        id uuid primary key,
        phone text not null unique,
        name text,
        roles text[] not null default '{BUYER}',
        city_id text,
        seller_id uuid,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      -- one live challenge per phone; raw codes are never stored (HMAC only)
      create table otp_challenges (
        phone text primary key,
        code_hash text not null,
        expires_at timestamptz not null,
        attempts int not null default 0,
        sent_at timestamptz not null default now(),
        window_start timestamptz not null default now(),
        send_count int not null default 1
      );

      -- rotating refresh tokens: one family per login; reuse of a rotated token revokes the family
      create table refresh_tokens (
        id uuid primary key,
        user_id uuid not null references users(id),
        family_id uuid not null,
        token_hash text not null,
        expires_at timestamptz not null,
        revoked_at timestamptz,
        replaced_by uuid,
        created_at timestamptz not null default now()
      );
      create index refresh_tokens_family on refresh_tokens (family_id);

      create table addresses (
        id uuid primary key,
        user_id uuid not null references users(id),
        city_id text not null,
        text text not null,
        label text,
        created_at timestamptz not null default now()
      );
      create index addresses_user on addresses (user_id);
    `,
  },
];
