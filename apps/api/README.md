# @nobar/api — Nobar backend

One NestJS app with a module per bounded context ([ADR 0008](../../docs/adr/0008-modular-monolith-first.md)).
Built on the shared runtime in [`packages/common`](../../packages/common) (config, JSON logs, health, metrics,
outbox, idempotency, auth guard). API reference: [`openapi.yaml`](openapi.yaml).

| Module | Schema | Status |
|---|---|---|
| identity: OTP sign-in, sessions, profile, addresses | `identity` | done |
| catalog: categories, produce types, shops, listings; search, comparison, delivery quotes; seller onboarding (encrypted KYC), listings, moderation | `catalog` | done |
| audit: staff and system actions | `audit` | done |
| review: reviews after delivery (staff-approved), product questions answered by the shop | `review` | done |
| notification: in-app notices and SMS for order events (from the event bus) | `notification` | done |
| cart: authenticated cart, seller grouping, live stock/delivery validation | `ordering` | done |
| order: checkout, expiring reservations, per-shop orders, lifecycle, disputes | `ordering` | done |
| payment: test gateway, double-entry ledger (escrow, wallets, seller balances), commission, payouts | `payment` | done |

A module touches only its own schema; other modules use its exported service or its events.

## Run locally (no Docker needed)

```bash
cp apps/api/.env.example apps/api/.env   # optional: admin phone, pretty logs
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
| `API_PUBLIC_URL` | `http://localhost:4000` | used in gateway callbacks |
| `PAYMENT_PROVIDER` | `fake` | test gateway; refused in production |
| `ORDER_TIMER_SEC` | `30` | `0` turns the order timers off |
| `KYC_KEY` | dev key | 32 bytes, base64; required in production |
| `SEED_DEMO` | on outside production | import the demo catalog into an empty database |
| `LOG_LEVEL` / `LOG_FORMAT` | `info` / `json` | `pretty` for local reading |

## Design notes

- **Sign-in** (brief Prompt 2): 6-digit code, 2-minute expiry, 5 attempts, 60 s resend cooldown,
  at most 5 codes per phone and 20 per IP per hour. Codes and refresh tokens are stored only as hashes.
- **Sessions**: 15-minute ES256 access tokens; refresh tokens rotate on every use, and reusing a rotated
  token ends the whole session family.
- **Cart**: `GET /v1/cart?dest=tehran`, `POST /v1/cart/items?dest=tehran` (requires `Idempotency-Key`),
  `PATCH /v1/cart/items`, `DELETE /v1/cart/items/:listingId/:packageId` and `DELETE /v1/cart`. The
  response is grouped by seller and revalidates package existence, stock, freshness and delivery against
  the catalog snapshot on every read. Cart state is private to the authenticated user.
- **Checkout reservations**: `POST /v1/checkouts` (requires `Idempotency-Key`) validates an owned address,
  locks listing stock inside one transaction, accounts for active reservations, snapshots each item and
  seller order, and clears the cart only after the checkout commits. `GET /v1/checkouts/:id` returns the
  user-scoped checkout. Reservations expire after ten minutes and are released when the checkout is read
  or a new checkout starts.
- **Migrations** are plain SQL embedded in TypeScript (`modules/*/migrations.ts`) instead of TypeORM or
  Prisma: the same SQL runs on PGlite and PostgreSQL, survives bundling into one file, and keeps the queries visible.
- **Catalog rules** come from [`packages/domain`](../../packages/domain), the same code the static store runs
  on its demo data, so freshness, delivery options and landed prices agree between the site and the API
  (checked by `test/catalog.test.ts`). The service keeps a snapshot of the `catalog` schema for 30 s and
  refreshes it after writes; search can move to OpenSearch later behind the same endpoints.
- **Demo catalog**: with `SEED_DEMO` on (default outside production) an empty database gets the
  `packages/demo` catalog on start.
- **Checkout and money** (kit docs/02): one payment per checkout, split into one order per shop. Stock is
  reserved for 10 minutes and sold when the gateway payment is verified; the money sits in escrow. The seller
  accepts within the shop's SLA (otherwise the order expires and is refunded), ships with a tracking code, the
  buyer confirms delivery, and after the produce's complaint window the escrow is released to the seller minus
  commission (most specific rule: shop, category, global). Refunds go to the buyer's wallet. Every movement is a
  balanced ledger transaction; `test/lifecycle.test.ts` checks that the books balance.
- **Sellers** (kit journey): sign in → apply with shop details and KYC (national ID and Sheba checked, stored
  AES-256-GCM encrypted with `KYC_KEY`, only the last four digits in clear) → staff approve (the user gets the
  SELLER role) → listings go to staff review before buyers see them. Stock and price changes apply at once; a price
  jump over 30% or an organic claim opens a review case. Listings past their freshness pause automatically.
  Suspended shops disappear from the store. Staff and system actions are written to the audit log.
- **Reviews**: only a buyer whose order arrived can review it, once per order line; staff approve before it is
  shown and the shop's rating updates. Contact details in reviews and questions are flagged for staff.
- **Notifications** consume order events from the bus through the inbox (each event once), write an in-app
  notice and send an SMS for what needs action or moves money. SMS failures never undo the notice.
- **Payment gateway**: `PAYMENT_PROVIDER=fake` serves a test gateway page from the API; a real PSP plugs in
  behind `PaymentProvider`. Cash on delivery is refused until its rules are decided (docs/domain.md Q7).
- **Timers**: every `ORDER_TIMER_SEC` the API expires unpaid checkouts and unaccepted orders and settles
  orders whose complaint window ended.
- **Events**: `user.registered` and `user.updated` are written to the outbox in the same transaction as the change.

## Container

```bash
docker build -f apps/api/Dockerfile -t nobar-api .   # from the repository root
```

Multi-stage, runs as the non-root `node` user, health check on `/healthz`. Helm chart: planned with the
deployment step.
