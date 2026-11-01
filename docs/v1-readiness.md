# Nobar v1 readiness

This file distinguishes the published static demo from a release that can accept real orders.

## Current status

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Buyer UI | Demo-ready | Responsive storefront, account and checkout screens are published on Pages and covered by route/interaction checks. |
| Identity/profile/addresses | API-connected | OTP, token refresh, profile and address CRUD work against NestJS/PGlite when `NEXT_PUBLIC_API_URL` is configured. Sessions are memory-only across a full reload. |
| Catalog search/suggestions | API-connected | Search results, destination, filters, sorting and keyboard suggestions use the public catalog API in API mode. API errors never silently fall back to demo results. |
| Product/shop/origin detail | Demo data | Detail pages still read `@nobar/demo`; API endpoints exist for listing/shop, but the UI adapters and loading/error states are not connected yet. |
| Cart/checkout/order | Demo only | Browser storage and simulated payment. There is no server cart, reservation, idempotent checkout, order persistence or payment verification module yet. |
| Seller/admin actions | Demo only | Panels do not write to authenticated backend endpoints. |
| Backend hosting | Not configured | GitHub Pages only hosts static frontends. A database-backed API, secrets, SMS provider and approved CORS origin need a separate environment. |

## Gate for the first real beta

The first real beta is ready only when all of these are green:

1. Durable HttpOnly session flow survives reloads and has CSRF/CORS coverage.
2. Listing, shop, produce and origin pages use API data and handle loading, empty and failure states.
3. Server cart and checkout reserve stock transactionally; an idempotency key returns the same checkout on retry and parallel requests cannot oversell.
4. Fake payment is verified server-side; failures and expiry release reservations; orders persist and sellers can accept or reject them.
5. One end-to-end test covers OTP → search → two-seller cart → checkout → fake payment → seller decisions, plus duplicate callback and concurrent-stock tests.
6. API and PostgreSQL are deployed with secrets, migrations, backups, health checks, logs and monitoring. Frontend builds use the deployed API URL.

Until these gates pass, call the public site a demo, not a production marketplace. A calendar release date depends on the hosting/SMS/payment choices; engineering progress is reported against these gates rather than an unsupported date.

## Next implementation order

1. API-backed listing/shop/produce/origin reads.
2. Durable web session.
3. Cart, stock reservation and idempotent checkout module.
4. Fake payment and order lifecycle, then seller acceptance.
5. Deployment and production-readiness checks.
