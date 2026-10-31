# 0008. Modular monolith first (supersedes 0002)

- Status: Accepted
- Date: 2026-10-31
- Supersedes: [0002](0002-microservices-with-clean-boundaries.md); amends [0004](0004-event-bus-nats-jetstream.md), [0005](0005-postgresql-database-per-service.md), [0007](0007-api-gateway-kong-plus-bff.md)

## Context
ADR 0002 chose microservices from day one to demonstrate cloud-native deployment. Since then:
- the owner chose a **nationwide** marketplace (sellers in any city ship to buyers across Iran, limited by freshness on arrival) and supplied the nobar-claude-kit spec, which describes a modular monolith;
- the full frontend (store, seller panel, admin panel) was built on that spec's domain model (`packages/demo`);
- the only dev machine is a Windows 10 laptop with 8 GB RAM and **no Docker**; a dozen services plus brokers would not run on it;
- on 2026-10-31 the owner chose the modular monolith for the backend.

## Options considered
1. **Microservices (ADR 0002)**: independent deployment and scaling; several times the work, and too heavy for the laptop.
2. **Modular monolith**: one deployable with strict module boundaries; cheap to run and test; can be split later.
3. **Hybrid**: monolith core plus separate search and AI services; can be reached later from option 2.

## Decision
Option 2.
- One NestJS app, `apps/api`, built on the shared runtime in `packages/common` (config, logs, health, metrics, outbox, idempotency, auth).
- **Modules by bounded context** (`docs/domain.md`): identity, catalog, cart and order, payment (escrow), delivery, review, notification, admin.
- **One PostgreSQL database with a schema per module** (`identity.*`, `catalog.*`, …). A module reads and writes only its own schema. Other modules reach it only through its exported service interface or its events, never through its tables.
- **Events stay**: modules publish versioned events through the transactional outbox. In one process the bus is in-memory; NATS can be switched on by configuration (`NATS_URL`) when a module is split out.
- **Embedded PostgreSQL (PGlite)** in development and tests when `DATABASE_URL` is absent; real PostgreSQL in production. The SQL migrations are the same for both.
- AI workers stay a separate Python/FastAPI service (ADR 0003), called through the LLMProvider and tool interfaces.
- No API gateway for now: `apps/api` is the single public entrypoint. Kong (ADR 0007) comes back only if a module is split out.

## Consequences
- \+ Runs on the 8 GB laptop with no Docker; one process, one port.
- \+ Transactions inside one module stay local; no distributed saga for checkout, payment and stock.
- \+ The boundaries (schemas, events, contracts) keep a later split cheap: a module moves out together with its schema and its events.
- − No independent scaling or deployment per module; one bad deploy affects everything.
- − Boundaries are kept by discipline. Follow-up: a check that fails when a module's SQL touches another module's schema.
- `services/identity` (skeleton) moves into `apps/api/src/modules/identity`.
