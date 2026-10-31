# Nobar — Roadmap

> Status: **Draft for approval** · Last updated: 2026-10-22
> "P#" refers to the step-by-step prompts in [brief/nobar-architecture-brief.fa.md](brief/nobar-architecture-brief.fa.md) §12. A phase is done only when **all** its exit criteria are met and CI is green.

## Overview

| Phase | Theme | Prompts | Outcome |
|---|---|---|---|
| 0 | Foundations | P0, P1 | Docs approved; runnable monorepo, local infra, CI |
| 1 | MVP marketplace | P2, P3, P4, P5, P6, P8, P9 (admin part) | A buyer can find, buy and pay for produce from local sellers |
| 2 | Operations | P7, P9 (seller part), P10, P11 | Delivery, reviews, notifications; Kubernetes, GitOps, observability |
| 3 | AI differentiation | P12, P13, P14, P15 | Smart search, shopping assistant, smart compare — with guardrails and evals |
| 4 | Growth | P16, P17, P18 | Recommendations, seller copilot, trust & safety, analytics |
| 5 | Scale & hardening | P19 + platform work | Service mesh, multi-region, native app, public API, final hardening |

## Phase 0 — Foundations

**Scope:** architecture docs and ADRs (P0); monorepo skeleton with pnpm + Turborepo, `packages/common` runtime skeleton (config, logging, health, metrics, tracing, outbox, idempotency), `packages/contracts`, web placeholder, docker compose with profiles, lint/format/commit tooling, GitHub Actions (P1).

**Prerequisites on the dev machine:** pnpm (via Corepack), Docker with WSL2 and a memory cap in `.wslconfig`, project path without spaces or non-ASCII characters (e.g. `C:\dev\nobar`) to avoid tooling issues.

**Exit criteria**
- [ ] `docs/architecture.md`, `docs/domain.md`, ADRs 0001–0007, this roadmap approved by the owner.
- [ ] `pnpm install && pnpm up && pnpm dev` works on the 8 GB machine using the `core` profile.
- [ ] Every service skeleton answers `/healthz`, `/readyz`, `/metrics`; logs are JSON with `trace_id`; a trace is visible in Jaeger (`obs` profile).
- [ ] `packages/contracts` generates TS types from the event envelope and OpenAPI specs.
- [ ] CI runs lint, tests, image builds and a Trivy scan on every PR, and is green.

## Phase 1 — MVP marketplace

**Scope:** identity (OTP, JWT, RBAC) · seller onboarding and approval · catalog with stock reservations · search (Persian OpenSearch, non-AI) · cart · order with checkout saga · payment (fake provider + ZarinPal sandbox adapter, COD) · Kong gateway + BFF · buyer web (core pages) · admin panel (seller approval, categories, cities).

**Exit criteria**
- [ ] End-to-end happy path in a test: buyer logs in with OTP → selects city → searches → adds items from two sellers → checks out → pays (fake gateway) → each seller accepts.
- [ ] Failure paths covered by tests: payment failure/timeout releases stock; seller reject/timeout refunds that order; duplicate checkout with the same `Idempotency-Key` is safe; duplicate gateway callbacks are safe.
- [ ] Concurrent stock reservation test: no overselling under parallel checkouts.
- [ ] Search p95 < 300 ms on 100k products (k6 script committed, results in docs).
- [ ] Ledger balances (Σ debit = Σ credit) for every test scenario.
- [ ] Open business questions Q1–Q5, Q7, Q9–Q12 in `docs/domain.md` answered.

## Phase 2 — Operations

**Scope:** delivery (zones, slots, courier assignment, proof of delivery) · review (verified reviews, quality reports, moderation) · notification (SMS/push/Telegram/email adapters, Persian templates) · seller panel · Helm charts, Argo CD (GitOps), Argo Rollouts canary for order/payment, KEDA · observability stack, SLOs and runbooks.

**Exit criteria**
- [ ] Full order lifecycle to `DELIVERED`, followed by a verified review that updates seller/product ratings.
- [ ] Buyer and seller receive Persian SMS/Telegram notifications for key events (mock providers in tests).
- [ ] Merge to `main` deploys automatically to staging via Argo CD; production requires approval; canary rollout demonstrated for `order`.
- [ ] Local Kubernetes (`make k8s-local`, k3d) runs the core subset of services.
- [ ] Grafana dashboards (golden signals + business metrics) and burn-rate alerts for checkout availability (99.5%) and search latency.
- [ ] Runbooks for the top incidents in `docs/runbooks/`.

## Phase 3 — AI differentiation

**Scope:** `ai-gateway` (LLMProvider interface, budgets, semantic cache, guardrails, tool layer, audit) · `ai-workers` embedding pipeline · hybrid semantic search · shopping assistant (SSE, basket proposals, human-in-the-loop) · smart compare.

**Exit criteria**
- [ ] Provider switch (hosted ↔ self-hosted ↔ fake) by configuration only.
- [ ] ≥ 40 Persian eval scenarios (budget baskets, out-of-stock, off-topic, prompt injection in reviews) pass in CI with the fake provider.
- [ ] Hybrid search beats the BM25 baseline on nDCG@10 on the labeled Persian query set; results documented.
- [ ] Evals confirm the assistant never states a price/stock/rating that is not in a tool result, and compare verdicts never contradict computed data.
- [ ] With the LLM disabled, `/search` and filters keep working and the UI degrades gracefully.

## Phase 4 — Growth

**Scope:** recommendation engine (co-purchase, seasonal popularity, cold start, A/B flags) · seller copilot (listing generation, price suggestions, demand forecast, review replies) · trust & safety (duplicate images, fake reviews, seller risk score, complaint triage) · analytics in ClickHouse.

**Exit criteria**
- [ ] Recommendations live on home/product/cart surfaces behind a feature flag, with offline precision@k and coverage reported.
- [ ] Every trust & safety flag stores human-readable reasons; admin confirms actions.
- [ ] Seller copilot outputs are always advisory (seller confirms every change).

## Phase 5 — Scale and hardening

**Scope:** final hardening (P19: OWASP/API security review, load and chaos tests, SBOM, secret scanning, final docs, seminar slide outline) · Linkerd mTLS · multi-region readiness · React Native app · public API.

**Exit criteria**
- [ ] `docs/security-review.md` with all critical/high findings fixed.
- [ ] Chaos tests (pod kill, broker/DB outage, LLM outage) show graceful degradation and saga compensation.
- [ ] Capacity numbers and autoscaling behaviour documented.

## Seminar track (recommended if there is a presentation deadline)

The brief notes that Phases 0–3 with a few key services plus a Kubernetes demo are enough for a strong university presentation. Suggested order:

1. P0 → P1 (foundations)
2. P2 identity → P3 seller + catalog → P4 search → P5 cart + order (saga) → P6 payment (fake provider only)
3. P8 gateway + buyer web (home, search, product, cart, checkout)
4. P10 subset: Dockerfiles, Helm library chart, k3d, Argo CD, HPA — for identity, catalog, search, order, payment, ai-gateway
5. P11 subset: traces in Jaeger + golden-signal dashboard
6. P12 → P14 (assistant) → P13 (smart search) if time allows
7. P19 items 5–6: final docs and the 15-slide outline

Deferred in this track: delivery/review/notification (stubs only), seller panel (minimal), analytics, recommendations, copilot, trust & safety.

## Progress

| Step | Status | Notes |
|---|---|---|
| P0 docs & ADRs | Done | ADR 0008 (2026-10-31): modular monolith, nationwide marketplace |
| P1 monorepo skeleton | Done | pnpm + Turborepo; shared runtime in `packages/common`; no Docker needed (PGlite) |
| Frontend (store, seller, admin) | Done | Static demo on GitHub Pages; rules in `packages/demo` with unit tests |
| P2 identity | Done | `apps/api` identity module: OTP, rotating sessions, profile, addresses; 21 integration tests |
| P3 catalog and shops | In progress | Rules shared in `packages/domain`; catalog read API done (search, compare, delivery); seller writes next |
| Checkout and escrow | Waiting | Needs the owner's answer to Q1 (one payment per cart or per seller) |
