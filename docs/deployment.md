# Deployment

Two ways to run Nobar in production:

| | One server | Kubernetes |
|---|---|---|
| Where | `infra/compose` ([guide](../infra/compose/README.md)) | `infra/helm`, `infra/k8s`, `infra/argocd` (this page) |
| What runs | edge (Caddy, HTTPS, seller/admin panels), store, API, PostgreSQL 17, nightly backups | API (HPA, PDB, NetworkPolicy), CloudNativePG with WAL archiving, Argo CD |
| Tested | every CI run: the stack starts in production mode and `infra/compose/ci/smoke.mjs` buys through it | chart rendered and linted in CI; not yet run on a real cluster |
| Good for | the first months of the market | more traffic, several servers, zero-downtime releases |

Releases: pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which publishes `ghcr.io/<owner>/nobar-api`,
`-web` and `-edge` at that version (scanned, with SBOMs) and creates the GitHub release from `CHANGELOG.md`.
A compose server can then pull instead of building:
`IMAGE_PREFIX=ghcr.io/<owner>/nobar NOBAR_VERSION=X.Y.Z docker compose pull && docker compose up -d`.

The rest of this page is the Kubernetes path, which follows the brief (§7). It deploys the API; the store and panels
run from the same images as the compose stack (`apps/web/Dockerfile`, `infra/compose/Dockerfile.edge`).

> Status: the manifests are written and the chart is linted in CI, but nothing here has run on a real
> cluster yet. Expect small corrections on the first install.

## What is in the repository

| Path | What it is |
|---|---|
| `apps/api/Dockerfile` | Multi-stage image, non-root user |
| `.github/workflows/ci.yml` | Typecheck, tests, chart lint; builds the image, scans it with Trivy, publishes `ghcr.io/<owner>/nobar-api:<sha>` and `:latest` from `main` |
| `infra/helm/nobar-api` | Deployment (probes, limits, read-only filesystem), Service, Ingress with TLS, HPA, PodDisruptionBudget, NetworkPolicy, optional ServiceMonitor |
| `infra/k8s/postgres-cluster.yaml` | CloudNativePG cluster (2 instances) with WAL archiving and a nightly backup |
| `infra/argocd/nobar-api-staging.yaml` | Staging follows `main` automatically |
| `infra/argocd/nobar-api-prod.yaml` | Production syncs only when someone presses Sync |

## What the cluster needs first

1. An ingress controller (NGINX) and cert-manager with a `letsencrypt` ClusterIssuer.
2. The CloudNativePG operator.
3. Argo CD.
4. An S3-compatible bucket for database backups.
5. DNS for the API host, and the three frontends' addresses for `CORS_ORIGINS`.

Because the servers are in Iran, check from inside the cluster that `ghcr.io` (image pulls),
`payment.zarinpal.com` and `rest.payamak-panel.com` are reachable; mirror the image to a local registry if not.

## Steps for one environment (example: production, namespace `nobar-prod`)

1. **Domains.** Replace the `nobar.example` hosts in `infra/helm/nobar-api/values.yaml` and `values-prod.yaml`.
2. **Database.** Fill in the bucket in `infra/k8s/postgres-cluster.yaml`, create the `nobar-db-backup` Secret, then
   `kubectl -n nobar-prod apply -f infra/k8s/postgres-cluster.yaml`. The operator creates the Secret `nobar-db-app`.
3. **Secrets.** Create the Secret `nobar-api` in the namespace (with Sealed Secrets or External Secrets; never commit values):

   `node dist/keygen.js` (in the API image) prints `OTP_SECRET`, `KYC_KEY`, `JWT_PRIVATE_JWK` and `INTERNAL_TOKEN`.

   | Key | Value |
   |---|---|
   | `OTP_SECRET` | random, 32+ characters |
   | `JWT_PRIVATE_JWK` | ES256 private key as JSON (keep it stable: changing it signs everyone out) |
   | `KYC_KEY` | 32 random bytes, base64 (losing it makes stored national IDs and Sheba numbers unreadable) |
   | `INTERNAL_TOKEN` | random, 16+ characters (required in production) |
   | `ADMIN_PHONES` | staff phones, comma separated |
   | `ZARINPAL_MERCHANT_ID` | from the ZarinPal panel |
   | `MELIPAYAMAK_USERNAME`, `MELIPAYAMAK_PASSWORD`, `MELIPAYAMAK_FROM` | panel user, webservice password, sender line |
   | `MELIPAYAMAK_OTP_BODY_ID` | optional: approved pattern whose only variable is the sign-in code |

4. **Deploy.** `kubectl apply -f infra/argocd/nobar-api-prod.yaml`, then Sync in Argo CD. Migrations run when the
   pods start (replicas wait for each other).
5. **Check.** `/readyz` answers `ready`; sign in with a real phone (SMS arrives); pay a small order through ZarinPal
   and see it in the admin panel's finance page; restore last night's backup into a scratch cluster once.
6. **Frontends.** Build `apps/web`, `apps/seller` and `apps/admin` with `NEXT_PUBLIC_API_URL` set to the API address.

Production refuses to start with the test gateway, the console SMS provider, echoed sign-in codes, insecure
cookies, or without `DATABASE_URL`, `OTP_SECRET` and `KYC_KEY` (`assertProductionConfig`).

## Releases

- Staging runs `:latest` and restarts on every merge to `main`.
- Production: set `image.tag` to the commit SHA that passed staging in `values-prod.yaml`, merge, press Sync.
  Rolling update with `maxUnavailable: 0`; roll back by reverting that commit.

## Payments and SMS

- **ZarinPal.** Try the flow first with `ZARINPAL_SANDBOX=true` in staging. The callback address is
  `API_PUBLIC_URL/v1/payments/callback` and must be reachable from the buyer's browser. If ZarinPal cannot be
  reached while verifying, the payment stays open (never marked unpaid) and the buyer can reload the return page.
- **Other gateways.** A gateway is one class implementing `PaymentProvider` in
  `apps/api/src/modules/payment/provider.ts` plus its name in `PAYMENT_PROVIDER`. One gateway is active at a time.
- **Melipayamak.** Without `MELIPAYAMAK_OTP_BODY_ID`, sign-in codes are plain messages and may not reach numbers
  that block advertising SMS; registering a pattern in the panel avoids that.

## Monitoring

`values-prod.yaml` turns on a ServiceMonitor (`/metrics`), a PrometheusRule and a Grafana dashboard ConfigMap; they need
the Prometheus Operator and Grafana's dashboard sidecar (for example kube-prometheus-stack). Set
`prometheusRule.labels` to the label your Prometheus selects rules by. Alerts link to `docs/runbooks/`.

| SLO | Objective | Alerts |
|---|---|---|
| Checkout availability (`/v1/checkouts`, `/pay`, gateway callback not 5xx) | 99.5% | page at 14.4x burn (1h and 5m), ticket at 6x (6h and 30m) |
| Search latency (`/v1/search` within 300 ms) | 95% | same burn-rate pair |

Also: API down, outbox backlog, payment failures, assistant unavailable. Business metrics: `nobar_orders_placed_total`,
`nobar_orders_placed_rial_total`, `nobar_payments_total`, `nobar_payments_late_total`, `nobar_order_events_total`,
`nobar_outbox_pending`, `nobar_assistant_*`.

## Not done yet

Canary rollouts (Argo Rollouts), KEDA, tracing export to Jaeger, and Helm charts for the store and edge images
(they run in the compose stack today). The rules and dashboard have not run against a real Prometheus yet.
