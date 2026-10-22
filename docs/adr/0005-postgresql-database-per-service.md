# 0005. PostgreSQL with a database per service

- Status: Proposed
- Date: 2026-10-22

## Context
Most domains need ACID transactions (orders, payments, stock reservations, ledger), the delivery domain needs geospatial queries (zones, distance), and the AI layer needs vector similarity. Services must stay independently deployable, which rules out sharing tables.

## Options considered
1. **Shared database, shared schema** — easiest joins, but couples every service to every table; breaks independent deployment.
2. **Database per service on PostgreSQL** — one logical database and one DB role per service; physical placement is a deployment choice.
3. **Polyglot persistence everywhere** (e.g. MongoDB for catalog) — more moving parts without a clear need.

## Decision
Option 2.
- **Ownership:** each service owns one database (`nobar_identity`, `nobar_catalog`, …) and connects with its own role that has no grants on other databases. No cross-database queries, ever; data is shared through APIs and events (read models).
- **Extensions:** PostGIS (delivery, address geo), pgvector (ai-workers, ADR-0006). The dev image bundles PostgreSQL + PostGIS + pgvector.
- **Placement:**
  - *Dev:* one PostgreSQL container hosting all service databases (fits 8 GB RAM).
  - *Kubernetes:* CloudNativePG operator; start with one cluster with separate databases, move `order` and `payment` to dedicated clusters when load or blast-radius isolation requires it. Managed PostgreSQL is equally acceptable.
- **Migrations:** each service owns and runs its own migrations (job/init step before rollout), never another service's.
- Redis, OpenSearch, MinIO and ClickHouse are used only where their strengths apply (cart/cache/rate limits, search read model, files, analytics).

## Consequences
- + Strong consistency inside a service; clear ownership; independent schema evolution.
- + One database technology to operate, back up (PITR) and monitor.
- − No joins across services: composed views come from the BFF or read models.
- − Consistency across services is eventual and must be designed (Saga, Outbox, Inbox).
