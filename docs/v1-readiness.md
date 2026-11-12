# Nobar v1 readiness

This file distinguishes the published static demo from a release that can accept real orders.

## Current status

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Buyer UI | Demo-ready | Responsive storefront, account and checkout screens are published on Pages and covered by route/interaction checks. |
| Identity/profile/addresses | API-connected | OTP, HttpOnly-cookie session restoration/rotation, logout, profile and address CRUD work against NestJS/PGlite when `NEXT_PUBLIC_API_URL` is configured. Cookie mutations validate the browser Origin. |
| Catalog search/suggestions | API-connected | Search results, destination, filters, sorting and keyboard suggestions use the public catalog API in API mode. API errors never silently fall back to demo results. |
| Product/shop/produce/origin detail | API-connected | Detail data, destination-aware delivery and related catalog results come from the API in API mode. Loading, retry and failure states are explicit; failures do not fall back to demo catalog data. Reviews remain demo-only and are hidden in API mode. |
| Cart | API-connected | Authenticated server cart supports add/set/remove/clear, groups by seller, revalidates catalog price/stock/freshness/delivery on every read, and requires idempotency keys for additive writes. |
| Checkout/order | API-connected | `POST /v1/checkouts` snapshots the address and prices, reserves stock transactionally per seller, creates pending orders, clears the cart only after commit, and safely replays idempotent requests. Expired reservations are released. |
| Payment and escrow | API-connected | `POST /v1/checkouts/{id}/pay` opens a payment on the test gateway; the callback is verified server-side and booked once into escrow (double-entry ledger). Failure, expiry and late payments release stock or credit the buyer's wallet. A real gateway (ZarinPal) adapter is still pending. |
| Order lifecycle | API-connected | Seller accept/reject/ship, buyer delivery confirmation, complaint window, disputes with partial refunds, automatic timeouts, settlement and payouts. |
| Seller panel | API-connected | Onboarding with encrypted KYC, listings, stock/prices, orders, balance, reviews and questions use authenticated endpoints. |
| Reviews, questions, notifications | API-connected | Verified reviews after delivery with staff approval, product Q&A, in-app and SMS notices from order events. |
| Admin API | API ready, UI demo only | KYC queue, shop list/approve/reject/suspend, listing moderation, produce-type numbers, orders, disputes, finance, payouts, commission rules, review moderation and audit log exist under `/v1/admin/*`. The admin frontend still shows demo data. |
| Backend hosting | Not configured | GitHub Pages only hosts static frontends. A database-backed API, secrets, SMS provider and approved CORS origin need a separate environment. |

## Gate for the first real beta

The first real beta is ready only when all of these are green:

1. ~~Durable HttpOnly session flow survives reloads and has CSRF/CORS coverage.~~ Completed.
2. ~~Listing, shop, produce and origin pages use API data and handle loading, empty and failure states.~~ Completed.
3. ~~Server cart and checkout reserve stock transactionally; an idempotency key returns the same checkout on retry and parallel requests cannot oversell.~~ Completed for authenticated checkout and per-seller orders.
4. ~~Fake payment is verified server-side; failures and expiry release reservations; orders persist and sellers can accept or reject them.~~ Completed.
5. ~~One end-to-end test covers OTP → search → two-seller cart → checkout → fake payment → seller decisions, plus duplicate callback and concurrent-stock tests.~~ Completed (`apps/api/test/e2e.test.ts`, `order.test.ts`, `lifecycle.test.ts`); CI runs them on every push and pull request.
6. API and PostgreSQL are deployed with secrets, migrations, backups, health checks, logs and monitoring. Frontend builds use the deployed API URL.

Until these gates pass, call the public site a demo, not a production marketplace. A calendar release date depends on the hosting/SMS/payment choices; engineering progress is reported against these gates rather than an unsupported date.

## Next implementation order

1. Connect the admin frontend to `/v1/admin/*`.
2. Deployment: hosted API + PostgreSQL, secrets, backups, monitoring (gate 6); real SMS and payment gateway adapters once the providers are chosen.
3. AI features (Phase 3): assistant, hybrid search, smart compare.
