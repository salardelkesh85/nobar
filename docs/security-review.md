# Security review — API (first pass)

> Scope: `apps/api` and `packages/common` as of this commit, by reading the code and its tests.
> Not done: a penetration test against a deployed instance, dependency audit (`pnpm audit` / SBOM), load and chaos
> tests, review of the three frontends, review of the cluster setup. This is not the final P19 review.

## Checked and covered by tests

| Area | What holds | Evidence |
|---|---|---|
| Sign-in | 6-digit code, 2-minute expiry, 5 attempts, resend cooldown, per-phone and per-IP limits; codes stored as HMAC | `test/identity.test.ts` |
| Sessions | ES256 access tokens (15 min) and rotating refresh tokens in HttpOnly cookies; reuse of a rotated token ends the family; cookie writes check `Origin` | `test/identity.test.ts` |
| Roles | `ADMIN` only for phones in `ADMIN_PHONES`; `SELLER` only after staff approval; every `/v1/admin/*` route refuses other roles | 403 assertions in `seller`, `lifecycle`, `review`, `assistant` tests |
| Object-level access | A buyer sees only their orders, addresses, cart, conversations and proposals; a seller only their shop's listings, orders and reviews | "keeps sellers out of each other's listings", "hides other shops' orders…", assistant privacy tests |
| Money | Double-entry ledger, every transaction balanced; payment booked once on duplicate callbacks; gateway result verified server-side; outage never marks a payment unpaid | `test/lifecycle.test.ts`, `test/providers.test.ts`, `test/e2e.test.ts` |
| Stock | Reservation under row lock; one of two concurrent checkouts wins | `test/order.test.ts` |
| Idempotency | Checkout, payment start, cart add, payouts, dispute rulings need `Idempotency-Key`; replay returns the stored answer | `test/order.test.ts`, `test/cart.test.ts` |
| KYC | National ID and Sheba encrypted at rest; only the last four digits leave the API | `test/seller.test.ts` |
| Input | Zod validation on every body and query; 1 MB body limit; SQL always parameterised | controllers, `packages/common/src/validation.ts` |
| Assistant | No write tools; amounts checked against tool results; seller text bounded and marked as data; PII redacted from the audit log; daily message limit | `test/assistant.test.ts`, `services/ai/evals` |
| Production guard | Refuses to start with the test gateway, console SMS, echoed codes, insecure cookies, or without database, OTP and KYC secrets | `assertProductionConfig` |

## Fixed in this pass

| Finding | Severity | Fix |
|---|---|---|
| No `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS on API responses | Low | Added to every response (HSTS in production) in `packages/common/src/bootstrap.ts` |
| The test-gateway page answered for any payment authority, also when a real gateway is configured (it could not confirm a payment, but showed the amount to anyone holding the authority) | Low | The page now only knows test-gateway payments |
| A buyer's phone number typed into the assistant reached `ai_audit_log` through a tool argument | Medium | All logged tool input and output is redacted (found by an eval case) |
| Two API replicas starting together could both run a migration | Medium | Advisory lock around each migration |

## Open

| Finding | Severity | Suggested next step |
|---|---|---|
| No general per-IP rate limit (only sign-in codes and the assistant's daily cap). Search, cart and copilot endpoints can be hammered | Medium | Rate limit at the ingress, plus a per-user limit on `/v1/seller/copilot/*` (each call may reach the model) |
| Rate limiter and catalog snapshot are per process without Redis; with several replicas sign-in limits are per replica | Medium | Set `REDIS_URL` in production |
| Staff accounts are a phone list with a single `ADMIN` role; no second factor, no separation between support and finance | Medium | Finer roles and a second factor before real payouts |
| Payouts are recorded by one staff click; the bank transfer happens outside the system | Medium | Two-person approval, bank file export |
| `JWT_PRIVATE_JWK` rotation is not supported (one key) | Low | Key set with `kid` rollover |
| Seller-supplied images are not handled yet (no upload path exists); when it does, it needs type and size checks and scanning | — | Design with the upload feature |
| ZarinPal and Melipayamak adapters were never run against the real services | — | Sandbox run before launch |
| Dependencies not audited; no SBOM; no secret scanning in CI | Medium | Add `pnpm audit`, an SBOM step and secret scanning to CI |
