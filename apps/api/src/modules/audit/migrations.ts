import type { Migration } from "@nobar/common";

export const auditMigrations: Migration[] = [
  {
    name: "audit/0001_init",
    sql: `
      create schema if not exists audit;
      create table audit.entries (
        id uuid primary key,
        actor_user_id uuid,
        actor_label text not null,
        action text not null,
        subject text not null,
        at timestamptz not null default now()
      );
      create index audit_entries_at on audit.entries (at desc);
    `,
  },
];
