# @nobar/api — Nobar backend

One NestJS app with a module per bounded context ([ADR 0008](../../docs/adr/0008-modular-monolith-first.md)).
Built on the shared runtime in [`packages/common`](../../packages/common) (config, JSON logs, health, metrics,
outbox, idempotency, auth guard). API reference: [`openapi.yaml`](openapi.yaml).

| Module | Schema | Status |
|---|---|---|
| identity: OTP sign-in, sessions, profile, addresses | `identity` | done |
| catalog: produce types, shops, listings, stock | `catalog` | next |
| order: cart, checkout, per-shop orders | `ordering` | planned |
| payment: escrow, ledger, payouts | `payment` | planned |

A module touches only its own schema; other modules use its exported service or its events.

## Run locally (no Docker needed)

```bash
pnpm dev:api          # http://localhost:4000 — embedded PostgreSQL (PGlite) under apps/api/.data
pnpm --filter @nobar/api test
```

Sign-in in development: `POST /v1/auth/otp` returns `devCode`, and the code is also printed in the log.
To start from an empty database, stop the server and delete `apps/api/.data`.

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | |
| `DATABASE_URL` | — | `postgres://…`; when unset, PGlite under `DATA_DIR` (`memory` for tests). Required in production |
| `DATA_DIR` | `.data` | |
| `CORS_ORIGINS` | the three local apps | comma separated |
| `TRUST_PROXY` | `loopback` | which proxies may set `X-Forwarded-For` (used by rate limits) |
| `OTP_SECRET` | dev value | HMAC key for sign-in codes; required in production |
| `OTP_ECHO` | on outside production | returns the code in the response; refused in production |
| `ADMIN_PHONES` | — | phones that get the ADMIN role |
| `JWT_PRIVATE_JWK` | generated in dev | ES256 private key (JSON); required in production |
| `ACCESS_TTL_SEC` / `REFRESH_TTL_DAYS` | `900` / `30` | |
| `SMS_PROVIDER` | `console` | `kavenegar` in production (`KAVENEGAR_API_KEY`, `KAVENEGAR_TEMPLATE`) |
| `LOG_LEVEL` / `LOG_FORMAT` | `info` / `json` | `pretty` for local reading |

## Design notes

- **Sign-in** (brief Prompt 2): 6-digit code, 2-minute expiry, 5 attempts, 60 s resend cooldown,
  at most 5 codes per phone and 20 per IP per hour. Codes and refresh tokens are stored only as hashes.
- **Sessions**: 15-minute ES256 access tokens; refresh tokens rotate on every use, and reusing a rotated
  token ends the whole session family.
- **Migrations** are plain SQL embedded in TypeScript (`modules/*/migrations.ts`) instead of TypeORM or
  Prisma: the same SQL runs on PGlite and PostgreSQL, survives bundling into one file, and keeps the queries visible.
- **Events**: `user.registered` and `user.updated` are written to the outbox in the same transaction as the change.

## Container

```bash
docker build -f apps/api/Dockerfile -t nobar-api .   # from the repository root
```

Multi-stage, runs as the non-root `node` user, health check on `/healthz`. Helm chart: planned with the
deployment step.
