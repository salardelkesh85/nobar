# Frontend handoff — compact Orchard

The approved Orchard design is the baseline (commit `9b902a3`), with a smaller visual scale. Keep the yellow/green home hero and berry discovery section. Do not restore the rejected Fresh/lime redesign.

## Presentation

- Shorter home hero and promotional images; smaller headlines and produce thumbnails.
- Capped product galleries, smaller shop/origin covers and restrained category introductions.
- Consistent scale across account, checkout, help, seller and admin surfaces.
- Preserve readable form text, keyboard focus, mobile navigation and touch targets.

## Verification scope

The release is checked in Chromium using the assembled static exports under `/nobar/`, `/nobar/seller/` and `/nobar/admin/`. Check every generated `index.html` route at 360, 768 and 1440px for HTTP errors, root overflow, browser exceptions and requested asset failures. This is rendering coverage; it does not prove every possible business state.

Functional checks cover quick add, favourites, cart/address persistence, simulated payment and order creation, cart clearing, demo login/logout, filters/reset/Escape, gallery dismissal, keyboard search, destination changes, dark mode and reduced motion. Existing tests, TypeScript checks, RTL lint and all three static builds are required before publication.

## Backend work to begin next

The UI still reads `@nobar/demo` and browser storage. Its successful demo checks do not establish live payment, production authentication, inventory consistency or server persistence.

1. Connect identity and profile/address screens to the existing NestJS identity module. Replace the demo code and local user state with server sessions; handle expired sessions and loading/error states.
2. Connect search, suggestions, listings, produce, shops and comparison to the existing catalog API. Keep destination-aware freshness and Rial/Toman conversion consistent.
3. Implement persistent cart, checkout/order creation, stock reservation, idempotency and payment verification before enabling real purchases.
4. Connect seller/admin actions to authorized server endpoints with ownership/role checks and audit records.
5. Integrate real media, reviews and notifications. Baghboon remains a labelled scripted demo until its separate service and evaluations are implemented.

GitHub Pages hosts the static demo. A running API needs its own deployment, configured API URL, approved origin/CORS and session strategy; a Pages deploy alone does not publish the backend.

## Review outcome — 2026-11-01

- All 145 exported routes reviewed at 360, 768 and 1440px; no browser exceptions or requested asset failures.
- Initial narrow-screen review found overflowing season labels on cucumber, herbs and tomato pages. The season badge now wraps; all 30 produce-type routes were rechecked at all three sizes with no overflow or runtime/asset errors.
- Demo shopping, simulated payment/order persistence, cart clearing, login/logout and the interaction checks above passed.
- 64 existing tests, full TypeScript checks, RTL lint and all three static builds passed. The storefront was rebuilt after the season-label fix.
- These results cover the demo frontend. Backend integration and production business flows remain the next phase.

## Identity integration update

The buyer frontend now supports API-backed identity, profile and address CRUD when `NEXT_PUBLIC_API_URL` is configured. The published Pages demo leaves it unset. See [identity integration](identity-client.md) for session lifetime, setup and verification; catalog, cart, order and payment integration remain outstanding.

Search results and suggestions now also use the catalog API in API mode. The API search contract includes the produce type and complete shop/listing data required by the existing product cards. Product/shop/origin detail pages remain demo-backed. See [v1 readiness](v1-readiness.md) for the release gate.
