import type { Migration } from "@nobar/common";

export const assistantMigrations: Migration[] = [
  {
    name: "ai/0001_init",
    sql: `
      create schema if not exists ai;

      create table ai.conversations (
        id uuid primary key,
        user_id uuid not null,
        dest_city_id text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index conversations_user on ai.conversations (user_id, updated_at desc);

      -- the transcript the buyer saw (user text and the assistant's final answer of each turn)
      create table ai.messages (
        id uuid primary key,
        conversation_id uuid not null references ai.conversations(id) on delete cascade,
        user_id uuid not null,
        role text not null check (role in ('user', 'assistant')),
        content text not null,
        created_at timestamptz not null default now()
      );
      create index messages_conversation on ai.messages (conversation_id, created_at, id);
      create index messages_user_day on ai.messages (user_id, created_at) where role = 'user';

      -- a basket the assistant suggested; nothing reaches the cart until the buyer confirms it
      create table ai.proposals (
        id uuid primary key,
        conversation_id uuid not null references ai.conversations(id) on delete cascade,
        user_id uuid not null,
        dest_city_id text not null,
        summary text not null,
        items jsonb not null,
        items_rial bigint not null check (items_rial >= 0),
        shipping_rial bigint not null check (shipping_rial >= 0),
        status text not null default 'PROPOSED' check (status in ('PROPOSED', 'CONFIRMED')),
        created_at timestamptz not null default now(),
        confirmed_at timestamptz
      );

      -- every model call, tool call and guardrail decision (CLAUDE.md: log every tool call)
      create table ai.ai_audit_log (
        id uuid primary key,
        conversation_id uuid not null,
        user_id uuid not null,
        kind text not null check (kind in ('LLM', 'TOOL', 'GUARD')),
        name text not null,
        input jsonb not null,
        output jsonb not null,
        ok boolean not null,
        duration_ms int not null,
        created_at timestamptz not null default now()
      );
      create index ai_audit_conversation on ai.ai_audit_log (conversation_id, created_at, id);
      create index ai_audit_user on ai.ai_audit_log (user_id, created_at desc);
    `,
  },
];
