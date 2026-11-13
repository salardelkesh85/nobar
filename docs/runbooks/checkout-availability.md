# Checkout availability

**Alert:** NobarCheckoutErrorBudgetFastBurn (page), NobarCheckoutErrorBudgetSlowBurn (ticket).
**SLO:** 99.5% of requests to `POST /v1/checkouts`, `POST /v1/checkouts/{id}/pay` and `GET /v1/payments/callback`
do not fail with 5xx. Fast burn: the month's error budget would be gone in about two days.

## Look first
1. Dashboard → "Server errors (5xx share)" and "p95 latency by route": is it only checkout, or everything?
2. Logs of the last 15 minutes with `"level":"error"` and the route `/v1/checkouts`.
3. Database: `kubectl -n nobar-prod get cluster nobar-db` (CloudNativePG) — primary healthy, not failing over?

## Common causes
| Sign | Likely cause | Action |
|---|---|---|
| All routes fail, `db` false in `/readyz` | PostgreSQL down or failing over | Wait for the operator's failover (a minute); if stuck, see the CloudNativePG status and events |
| Only `/pay` fails with 503 `GATEWAY_UNAVAILABLE` | Payment gateway unreachable | Check the gateway's status page; nothing is lost — buyers can retry, reservations hold for 10 minutes |
| `/v1/checkouts` returns 409 `STOCK` for many buyers | Not an error (4xx is not counted) | — |
| Errors after a release | Regression | Roll back: revert the `image.tag` commit in `values-prod.yaml` and sync |

## After
Money is consistent by design (one transaction per checkout, payments booked once). If a payment arrived for a checkout
that had already expired, it is in the buyer's wallet (`nobar_payments_late_total`); no manual refund is needed.
