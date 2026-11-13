# Changelog

All notable changes to Nobar. The project follows [Semantic Versioning](https://semver.org/): the public HTTP API
(`apps/api/openapi.yaml`) is the contract the version number describes.

## Unreleased

### Apps
- Android app for buyers (`apps/mobile`): the store in app mode packaged with Capacitor — app bar with back arrow on
  inner pages, buy bar on product pages, hardware back button, edge-to-edge, splash, launcher icon from the brand's
  leaf mark; built and tested on an Android emulator in CI.
- Store: new look (header, home, product card, search with filter and sort sheets), the deck's two-leaf logo, and a
  full "fresh nobars" strip on the home page.

## 1.0.0 — 2026-11-13

The first release that can run a real market: buyers, sellers and staff on one API with real payment and SMS
providers, deployable on one server or on Kubernetes.

### Marketplace
- Phone sign-in with one-time codes; sessions in HttpOnly cookies with rotating refresh tokens.
- Catalog with the freshness rules: a listing is offered to a city only if it arrives fresh; landed price per kilo
  (goods plus delivery) for the buyer's city; comparison by a fixed, documented formula.
- Persian search with a word index: text and filtered searches stay under 300 ms (p95) on 100,000 listings;
  results load a page at a time.
- Server cart, checkout that reserves stock under row locks (no overselling), idempotent retries.
- Payments into escrow through ZarinPal, verified server to server and booked once; a payment that arrives after its
  checkout closed goes to the buyer's wallet. Double-entry ledger, commission by shop / category / overall,
  payouts.
- Shop orders: accept, reject, ship, delivery, complaint window, disputes with partial refunds, automatic timeouts.
- Reviews after delivery (staff-approved), product questions, in-app notices and SMS through Melipayamak.

### Apps
- Store: product and shop pages for every listing and shop (rendered by the server, with metadata), recommendations
  with their reasons, the Baghboon assistant.
- Seller panel: onboarding with encrypted KYC, listings, stock and prices, orders, payouts, reviews, the copilot
  (price guide, listing text and review reply drafts — advice only).
- Admin panel: KYC and moderation queues, shops, disputes, orders, payouts, commission, produce data, audit log,
  shop risk signals.

### Assistant
- Shopping assistant behind a provider-neutral interface (rule-based, or any OpenAI-compatible model server).
  Seven read-only tools; every amount in an answer must come from a tool result; seller text is passed as data;
  baskets are only proposed and reach the cart when the buyer confirms; every call is in `ai_audit_log`.
- 40 Persian evaluation cases run in CI.

### Operations
- One-server deployment with Docker Compose: Caddy with automatic HTTPS, the store server, static panels, the API,
  PostgreSQL 17 and nightly backups (`infra/compose`). Kubernetes: Helm chart, CloudNativePG, Argo CD.
- Production refuses to start with the test gateway, console SMS, echoed sign-in codes, insecure cookies or missing
  secrets; `node dist/keygen.js` generates the secrets.
- Categories, produce types and default commission rates are seeded on every start when missing.
- Metrics (requests, orders, payments, outbox, assistant), SLO burn-rate alerts, a Grafana dashboard and runbooks.
- Security: rate limits, security headers, patched dependencies, no package managers in runtime images, SBOM and
  secret scanning in CI. Findings and open items: `docs/security-review.md`.
- CI: typecheck, 160+ API tests, evals, chart render, image scan, and a production-mode test of the whole stack
  driven like real users.

### Known limitations
- Not yet run against the real ZarinPal and Melipayamak services or a real model server (adapters are tested
  against stand-ins).
- Browsing the whole market with no query or filter takes about 0.5 s at 100,000 listings.
- One staff role (ADMIN) without a second factor; payouts are recorded in the ledger and paid by bank transfer outside
  the system.
- No delivery-slot or courier module yet; sellers ship with the methods they configure.
