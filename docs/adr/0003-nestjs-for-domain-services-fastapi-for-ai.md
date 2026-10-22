# 0003. NestJS for domain services, Python/FastAPI for AI workers

- Status: Proposed
- Date: 2026-10-22

## Context
We need one consistent stack for ~14 domain services so that the shared runtime skeleton, contracts and conventions are reused everywhere, and a stack with a strong ML ecosystem for embeddings, recommendations, forecasting and moderation models. The frontend is Next.js/TypeScript, so TypeScript on the backend lets us share types (API clients, event schemas, validation).

## Options considered
1. **NestJS (TypeScript)** — modules, DI, guards/interceptors map well onto per-service structure; first-class OpenAPI, validation, testing; shares types with the frontend. Node is not ideal for CPU-heavy work.
2. **Go** — small images, low memory, fast; but no type sharing with the frontend, and more boilerplate for a small team.
3. **Python (FastAPI) for everything** — great for AI; weaker for type sharing with the frontend, and two async ecosystems would be needed anyway.
4. **Java/Spring** — mature but heavy on memory, which matters on an 8 GB machine.

## Decision
- **NestJS + TypeScript (strict)** for all domain services, the BFF and `ai-gateway`. Use the Fastify adapter for lower overhead.
- **Python + FastAPI** for `ai-workers` (embeddings pipeline, review insights, recommendations, forecasting, moderation), managed with `uv`, `ruff`, `mypy`, `pytest`.
- `ai-gateway` stays in NestJS because it is mostly orchestration, auth, budgets and tool calls against our internal APIs, which benefits from shared contracts.
- ORM choice (Prisma vs TypeORM vs Drizzle) is decided with the identity service in Phase 1 (separate ADR).

## Consequences
- + One language across web, BFF and services; contracts generated once for both sides.
- + Python is used only where its ecosystem clearly wins.
- − Two toolchains in CI (Node + Python) and two base images.
- − Node services must keep CPU-heavy work out of the request path (move to workers).
