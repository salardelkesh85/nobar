# Storefront identity API integration

`IdentityClient` in `@nobar/contracts` covers OTP, durable session restoration, profile, address CRUD and logout. The storefront uses it when `NEXT_PUBLIC_API_URL` is set at build/start time. With that variable unset, GitHub Pages retains the existing demo mode. API failures never fall back to demo authentication or local address mutations.

## Run locally

Start the API with `pnpm dev:api` (default port 4000). Start the buyer app with `NEXT_PUBLIC_API_URL=http://localhost:4000 pnpm dev:web`. The API's `CORS_ORIGINS` must allow the storefront origin. Development `OTP_ECHO=true` exposes a labelled test code; production configuration forbids OTP echo and the console SMS provider.

`NEXT_PUBLIC_API_URL` is a public build-time setting, not a secret. It must point to the API origin (without `/v1`). Rebuild static exports after changing it. No hosted backend URL or production SMS credentials were configured in this change.

The API stores access and rotating refresh tokens in `HttpOnly` cookies. Production requires `SESSION_COOKIE_SECURE=true` (the default in production). Use `SESSION_COOKIE_SAME_SITE=lax` when web and API are same-site; use `none` only for an HTTPS API called from a genuinely cross-site frontend such as GitHub Pages. `CORS_ORIGINS` must contain every exact browser origin. Credentialed state-changing requests from any other Origin are rejected with `ORIGIN_FORBIDDEN`.

## Connected flows

- Request/resend OTP with server resend timing; verify with the API. New users set their name on the server; returning users load profile and saved addresses.
- Update profile; create, edit and delete addresses; use the returned address ID at checkout.
- Disable duplicate form submissions, show failures, retain failed address edits and only show success after the server confirms a mutation.
- A reload or new tab restores the user and addresses by rotating the refresh cookie. Concurrent refreshes from multiple tabs have a short collision window and do not revoke the valid session family.
- Logout immediately removes API identity/address state, clears both cookies and revokes the server session. A failed server revocation is reported.
- API identities and addresses do not hydrate from demo localStorage. Protected address management and checkout address entry require sign-in.
- Redirect destinations are restricted to local paths.

## Session scope

One client belongs to one provider/session. Access and refresh tokens are never exposed to JavaScript or browser storage. Requests use `credentials: include`; concurrent 401 responses share one refresh; retries are bounded; 403 does not refresh. An in-flight refresh cannot restore a logged-out session. The browser fetch receiver is covered by a regression test.

Origin validation plus `SameSite` cookies protect cookie-authenticated mutations. Server-to-server requests do not carry a browser Origin, while browser mutations must match `CORS_ORIGINS`. Cart, orders, payment and seller/admin operations remain demo-based. Durable identity does not make simulated checkout a real purchase.

## Validation

Run `pnpm test`, `pnpm typecheck` and `pnpm lint:rtl`, then build the static Pages export. Browser checks against an isolated local NestJS/PGlite API cover invalid/valid OTP, ignoring demo identity/address data, profile update, address create/edit/delete, server read-back, failed mutation and successful retry, token storage isolation and logout privacy. Repeat the existing demo shopping/login checks with `NEXT_PUBLIC_API_URL` unset before publishing Pages.

The test suite covers cookie flags and token non-disclosure, reload restoration, access refresh, multi-tab rotation collisions, logout clearing/revocation, forbidden Origin rejection and the existing identity/profile/address flows. Browser API tests use development OTP echo and an isolated PGlite database, not a production SMS provider or hosted backend.
