# Nobar v1 readiness

Version 1.0.0 is the first release that can run a real market. This page separates what the software does and how
it is proven, from what an operator still has to do before the first real order.

## Software (1.0.0)

| Area | Status | Evidence |
| --- | --- | --- |
| Sign-in, sessions, profile, addresses | Done | Phone OTP; HttpOnly cookies with rotation and reuse detection; Origin checks on cookie writes (`identity.test.ts`) |
| Catalog, search, comparison | Done | Freshness and delivery rules shared with the demo (`catalog.test.ts`); word index, p95 < 300 ms for text and filtered searches on 100k listings (`docs/performance.md`); paged results |
| Product and shop pages | Done | Rendered by the store server for any listing or shop, including ones created after the build; real 404 for unknown ones (stack test) |
| Cart and checkout | Done | Stock reserved under row locks, idempotent retries, no overselling under parallel checkouts (`order.test.ts`) |
| Payment and escrow | Done | ZarinPal verified server to server and booked once; cancelled, failed, expired and late payments handled; ledger always balanced (`lifecycle.test.ts`, `providers.test.ts`, stack test) |
| Orders, disputes, payouts | Done | Accept / reject / ship / deliver, complaint window, partial refunds, timeouts, settlement, payouts (`lifecycle.test.ts`) |
| Seller panel | Done | Onboarding with encrypted KYC, listings, stock and prices, orders, payouts, reviews, copilot (`seller.test.ts`, browser checks) |
| Admin panel | Done | KYC, moderation, disputes, orders, payouts, commission, produce data, audit, risk signals (browser checks) |
| Reviews, questions, notifications | Done | Verified reviews with staff approval; Q&A; in-app notices and Melipayamak SMS (`review.test.ts`, stack test) |
| Assistant, recommendations | Done | Read-only tools, grounding check, confirmed proposals, audit log; 40 Persian evals (`assistant*.test.ts`, `services/ai/evals`) |
| Production start-up | Done | Refuses unsafe configuration; seeds categories, produce types and commission rates (`startup.test.ts`) |
| Deployment | Done | Compose stack built and tested in production mode on every CI run (`infra/compose/ci/smoke.mjs`); Helm chart rendered in CI |
| Monitoring | Done | Metrics, SLO alerts, dashboard, runbooks (`docs/runbooks`) |
| Security | Done for 1.0 | `docs/security-review.md`: fixed items, open items |

## Before the first real order (operator)

These need the owner's accounts and cannot be done in the repository:

1. A server (or cluster) and a domain; follow [infra/compose/README.md](../infra/compose/README.md).
2. ZarinPal merchant ID: pay one small real order and check it on the admin finance page. Refunds go to the buyer's
   in-app wallet; returning money to a card is done in the ZarinPal panel.
3. Melipayamak panel: sign in once with a real phone (the code must arrive); optionally register an OTP pattern.
4. Confirm the produce-type freshness numbers in the admin panel (they start as "needs review").
5. Confirm or change the commission rates (10% overall, citrus 9%, dried fruit and dates 12%).
6. Copy backups off the server and try one restore.

## Not in 1.0

Courier and delivery slots, a second staff role and second factor, demand forecast for sellers, semantic search with
embeddings, a hosted-model adapter, load tests against a deployed environment. See [roadmap.md](roadmap.md).
