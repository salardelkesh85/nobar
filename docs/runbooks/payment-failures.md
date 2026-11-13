# Payment failures

**Alert:** NobarPaymentFailuresHigh — more than 10 failed gateway payments and over 30% of all payments in 30 minutes.

A failed payment is one the gateway did not confirm (buyer cancelled, card declined, or the gateway said "not paid").
Buyers cancelling is normal; a sudden jump usually means the gateway or the bank network has a problem.

## Look first
1. Dashboard → "Gateway payments per hour": failures rising while successes fall?
2. Logs for `ZarinPal` messages; `GATEWAY_UNAVAILABLE` (503) means we could not reach it, which is not counted as a failure.
3. ZarinPal's status page and merchant panel (merchant suspended, wrong callback URL?).

## Actions
- Merchant or callback problem: fix `ZARINPAL_MERCHANT_ID` / `API_PUBLIC_URL` in the Secret and restart.
- Gateway outage: nothing to undo. Stock reservations expire after 10 minutes and are released automatically.
- Money: a payment the bank took but we marked failed is reversed by the bank; a confirmed payment for a closed
  checkout goes to the buyer's wallet.
