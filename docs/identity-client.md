# Storefront identity API integration

`IdentityClient` in `@nobar/contracts` covers OTP, verification, profile, address CRUD and logout. The storefront now uses it when `NEXT_PUBLIC_API_URL` is set at build/start time. With that variable unset, GitHub Pages retains the existing demo mode. API failures never fall back to demo authentication or local address mutations.

## Run locally

Start the API with `pnpm dev:api` (default port 4000). Start the buyer app with `NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm dev:web`. The API's `CORS_ORIGINS` must allow the storefront origin. Development `OTP_ECHO=true` exposes a labelled test code; production configuration forbids OTP echo and the console SMS provider.

`NEXT_PUBLIC_API_URL` is a public build-time setting, not a secret. It must point to the API origin (without `/v1`). Rebuild static exports after changing it. No hosted backend URL or production SMS credentials were configured in this change.

## Connected flows

- Request/resend OTP with server resend timing; verify with the API. New users set their name on the server; returning users load profile and saved addresses.
- Update profile; create, edit and delete addresses; use the returned address ID at checkout.
- Disable duplicate form submissions, show failures, retain failed address edits and only show success after the server confirms a mutation.
- Logout immediately removes API identity/address state and revokes the server session. A failed server revocation is reported.
- API identities and addresses do not hydrate from demo localStorage. Protected address management and checkout address entry require sign-in.
- Redirect destinations are restricted to local paths.

## Session scope and remaining work

One client belongs to one provider/session. Access and refresh tokens remain in memory, never browser storage. Concurrent 401 responses share one refresh; retries are bounded; 403 does not refresh. An in-flight refresh cannot restore a logged-out session. The browser fetch receiver is covered by a regression test.

A full reload/new tab currently requires sign-in again. Durable login requires a separately designed HttpOnly-cookie/session flow and corresponding API/CORS/CSRF handling before production rollout. Cart, catalog, orders, payment and seller/admin operations remain demo-based. Connecting identity does not make simulated checkout a real purchase.

## Validation

Run `pnpm test`, `pnpm typecheck` and `pnpm lint:rtl`, then build the static Pages export. Browser checks against an isolated local NestJS/PGlite API cover invalid/valid OTP, ignoring demo identity/address data, profile update, address create/edit/delete, server read-back, failed mutation and successful retry, token storage isolation and logout privacy. Repeat the existing demo shopping/login checks with `NEXT_PUBLIC_API_URL` unset before publishing Pages.

Verification outcome: 68 tests passed (contracts 4, Persian utilities 10, demo rules 21, API 33), full TypeScript and RTL checks passed, and the Pages-mode storefront export succeeded. Live API browser checks and the exported demo's cart/address/payment/login/logout flow passed. Browser API tests used development OTP echo and an isolated PGlite database, not a production SMS provider or hosted backend.
