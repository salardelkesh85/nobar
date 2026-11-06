import type { Migration } from "@nobar/common";

export const notificationMigrations: Migration[] = [
  {
    name: "notification/0001_init",
    sql: `
      create schema if not exists notification;
      create table notification.notifications (
        id uuid primary key,
        user_id uuid not null,
        title text not null,
        body text not null,
        link text,
        read_at timestamptz,
        created_at timestamptz not null default now()
      );
      create index notifications_user on notification.notifications (user_id, created_at desc);
    `,
  },
];
