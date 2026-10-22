# 0002. Microservices with clean boundaries (vs. modular monolith)

- Status: Proposed
- Date: 2026-10-22

## Context
For a small team, a modular monolith is usually the cheaper starting point. However, a core goal of this project is to demonstrate a **cloud-native architecture** (Docker, Kubernetes, independent scaling, observability, resilience) in a software-engineering seminar, and the workload has genuinely different scaling profiles: search and AI are read-heavy and bursty, payment and order need strong consistency and careful deployment, notification is asynchronous fan-out.

## Options considered
1. **Modular monolith** — one deployable, in-process calls, one database with schemas per module. Cheapest to build and run; but does not demonstrate independent deployment/scaling, and boundaries erode easily without discipline.
2. **Microservices from day one** — independent deploy/scale/failure isolation per domain; but more operational overhead (network failures, distributed transactions, observability), and heavier on an 8 GB dev machine.
3. **Hybrid** — microservices for the boundaries that matter most, with smaller domains merged.

## Decision
Option 2, with discipline that keeps costs down:
- Services are split by bounded context (see `docs/domain.md`), each with its own database.
- All services share one runtime skeleton from `packages/common` (config, logging, health, metrics, tracing, outbox, idempotency), so a new service is cheap.
- Distributed-transaction complexity is handled with explicit patterns (Saga, Outbox, Idempotency), documented in `docs/architecture.md`.
- Locally, developers run only the services they are working on.

If the operational cost becomes a problem, smaller services (e.g. `cart` + `order`, or `review` + `seller`) can be merged without changing contracts, because they communicate only via APIs and events.

## Consequences
- + Demonstrates independent scaling (HPA/KEDA), canary deployments for order/payment, failure isolation, and graceful degradation.
- + Clear ownership per domain; teams could later own services.
- − Network failures, eventual consistency and distributed tracing are now first-class concerns.
- − More containers to run; mitigated by compose profiles and k3d for local Kubernetes.
