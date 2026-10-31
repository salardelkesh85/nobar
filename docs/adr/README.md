# Architecture Decision Records

Each ADR records one significant decision: the context, the options we weighed, what we chose, and the consequences. ADRs are immutable once **Accepted**; to change a decision, write a new ADR that supersedes the old one.

| # | Title | Status |
|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | Proposed |
| [0002](0002-microservices-with-clean-boundaries.md) | Microservices with clean boundaries (vs. modular monolith) | Superseded by 0008 |
| [0003](0003-nestjs-for-domain-services-fastapi-for-ai.md) | NestJS for domain services, Python/FastAPI for AI workers | Proposed |
| [0004](0004-event-bus-nats-jetstream.md) | Event bus: NATS JetStream (vs. Kafka) | Proposed — **needs confirmation** |
| [0005](0005-postgresql-database-per-service.md) | PostgreSQL with a database per service | Proposed |
| [0006](0006-pgvector-for-vector-search.md) | pgvector first for vector search, Qdrant later | Proposed |
| [0007](0007-api-gateway-kong-plus-bff.md) | API Gateway: Kong (DB-less) + NestJS BFF | Proposed — deferred by 0008 |
| [0008](0008-modular-monolith-first.md) | Modular monolith first (supersedes 0002) | Accepted |

Statuses: Proposed → Accepted → (Deprecated | Superseded by NNNN).

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
What forces are at play (requirements, constraints, team, budget)?

## Options considered
1. Option A — pros / cons
2. Option B — pros / cons

## Decision
What we chose and why.

## Consequences
Positive, negative, and follow-up work.
```
