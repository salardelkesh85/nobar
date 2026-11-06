import type { Migration } from "@nobar/common";

export const paymentMigrations: Migration[] = [
  {
    name: "payment/0001_init",
    sql: `
      create schema if not exists payment;

      -- one gateway payment attempt for a checkout
      create table payment.payments (
        id uuid primary key,
        checkout_id uuid not null,
        user_id uuid not null,
        amount_rial bigint not null check (amount_rial > 0),
        provider text not null,
        authority text not null unique,
        status text not null check (status in ('INITIATED', 'SUCCEEDED', 'FAILED')),
        ref_id text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index payments_checkout on payment.payments (checkout_id);
      -- at most one successful payment per checkout
      create unique index payments_checkout_paid on payment.payments (checkout_id) where status = 'SUCCEEDED';

      -- double-entry ledger: every transaction's debits equal its credits (checked on insert and by tests)
      create table payment.ledger_entries (
        id uuid primary key,
        txn_id uuid not null,
        account text not null,
        direction char(1) not null check (direction in ('D', 'C')),
        amount_rial bigint not null check (amount_rial > 0),
        memo text not null,
        ref text,
        created_at timestamptz not null default now()
      );
      create index ledger_account on payment.ledger_entries (account, created_at);
      create index ledger_txn on payment.ledger_entries (txn_id);

      -- commission in basis points; the most specific rule wins (shop, then category, then global)
      create table payment.commission_rules (
        id uuid primary key,
        scope text not null check (scope in ('GLOBAL', 'CATEGORY', 'SHOP')),
        scope_id text,
        rate_bps int not null check (rate_bps between 0 and 10000),
        label text not null,
        created_at timestamptz not null default now()
      );
      create unique index commission_rules_scope on payment.commission_rules (scope, coalesce(scope_id, ''));

      create table payment.payouts (
        id uuid primary key,
        shop_id text not null,
        amount_rial bigint not null check (amount_rial > 0),
        status text not null check (status in ('SCHEDULED', 'PAID', 'FAILED')),
        created_by uuid,
        created_at timestamptz not null default now(),
        paid_at timestamptz
      );
      create index payouts_shop on payment.payouts (shop_id, created_at desc);
    `,
  },
];
