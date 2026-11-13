# Nobar (نوبر) — from orchard to table

A nationwide marketplace for fruit and vegetables in Iran. Growers, orchard owners and stall owners in any city sell
directly to buyers across the country; a listing is offered to a city only if it arrives there fresh. Pilot region:
West Azerbaijan (Miandoab, Urmia).

> بازار سراسری میوه و سبزی: باغدار و غرفه‌دار مستقیم به خریدار می‌فروشند و هر محصول فقط به شهری عرضه می‌شود که تازه به آن برسد.

**Version 1.0.0** — see [CHANGELOG.md](CHANGELOG.md).

## What is in it

| Part | Path | What it does |
|---|---|---|
| API | `apps/api` | One NestJS app, a module per bounded context: identity (phone OTP), catalog and seller onboarding, cart, checkout and orders, payments (escrow, ledger, payouts), reviews, notifications (SMS and in-app), audit, recommendations, shopping assistant and seller copilot |
| Store | `apps/web` | Buyer site: search, comparison, cart, checkout, orders, the Baghboon assistant |
| Seller panel | `apps/seller` | Onboarding with KYC, listings, stock and prices, orders, payouts, reviews, copilot |
| Admin panel | `apps/admin` | KYC and moderation queues, disputes, orders, payouts, commission, produce data, audit log |
| Shared packages | `packages/*` | Marketplace rules (freshness, delivery, landed price, comparison, search), contracts, Persian formatting, UI kit, demo data |
| Assistant evals | `services/ai/evals` | Persian test cases for the assistant |
| Deployment | `infra/compose`, `infra/helm` | One server (Docker Compose) or Kubernetes (Helm, Argo CD) |

## Run it locally (no Docker needed)

Requires Node.js 22 and pnpm (`corepack enable`).

```bash
pnpm install
```

```bash
pnpm dev:api
```

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm dev:web
```

The API uses an embedded PostgreSQL (PGlite) and imports a demo catalog; sign-in codes are shown on screen in
development. The seller panel (`pnpm dev:seller`, port 3001) and admin panel (`pnpm dev:admin`, port 3002) take the
same `NEXT_PUBLIC_API_URL`; admin phones are set with `ADMIN_PHONES` (see `apps/api/.env.example`).

Without `NEXT_PUBLIC_API_URL` the three apps run on demo data in the browser, like the public demo on GitHub Pages.

## Checks

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm lint:rtl
```

CI runs these, the assistant evals, a Helm chart render, a secret scan, an image build with a vulnerability scan
and SBOM, and a production-mode test of the whole stack (`infra/compose/ci/smoke.mjs`).

## Deploy

One server: [infra/compose](infra/compose/README.md). Kubernetes: [docs/deployment.md](docs/deployment.md).
Going live needs a domain, a ZarinPal merchant ID and a Melipayamak panel; the API refuses to start in production
with the test gateway, console SMS or missing secrets.

## Documentation

| Topic | Document |
|---|---|
| Architecture and decisions | [docs/architecture.md](docs/architecture.md), [docs/adr](docs/adr/README.md) |
| Domain, state machines, glossary | [docs/domain.md](docs/domain.md) |
| Database (all tables as SQL) | [docs/database/schema.sql](docs/database/schema.sql) |
| API reference | [apps/api/openapi.yaml](apps/api/openapi.yaml), [apps/api/README.md](apps/api/README.md) |
| Assistant and AI rules | [docs/ai-architecture.md](docs/ai-architecture.md) |
| Security review | [docs/security-review.md](docs/security-review.md) |
| Performance | [docs/performance.md](docs/performance.md) |
| Operations: deployment, monitoring, runbooks | [docs/deployment.md](docs/deployment.md), [docs/runbooks](docs/runbooks/README.md) |
| Release state | [docs/v1-readiness.md](docs/v1-readiness.md), [docs/roadmap.md](docs/roadmap.md) |
