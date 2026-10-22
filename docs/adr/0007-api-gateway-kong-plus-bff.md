# 0007. API Gateway: Kong (DB-less) + NestJS BFF

- Status: Proposed
- Date: 2026-10-22

## Context
Clients (web PWA, seller panel, admin panel, later mobile and a Telegram bot) need a single public entrypoint that handles routing, JWT verification, rate limiting, CORS, request-id propagation and metrics. Some screens (home page, product detail with seller and reviews, checkout summary) need data from several services in one round trip. Gateway configuration should be code, reviewed in PRs, and deployable via GitOps.

## Options considered
1. **Kong OSS, DB-less (declarative `kong.yml`)** — bundled plugins for `jwt` (RS256, key selected by `kid`), `rate-limiting` (Redis), `cors`, `correlation-id`, `prometheus`, `opentelemetry`, request size limits; Kong Ingress Controller for Kubernetes. ~150–250 MB RAM.
2. **Traefik** — excellent ingress (and the k3s default), very light; JWT verification needs ForwardAuth to a service or a third-party plugin.
3. **Envoy / Kubernetes Gateway API implementations** — powerful and standard, but more configuration to learn for a small team.
4. **NestJS as the gateway** — full control, but we would be rebuilding rate limiting, routing and auth plumbing that gateways already provide.

## Decision
- **Kong OSS in DB-less mode** as the edge API gateway, configured as code (`infra/gateway/kong.yml`, validated in CI with `deck`).
  - JWT: identity signs tokens with asymmetric keys; Kong holds the public keys (one credential per `kid`, so key rotation = add a key, then remove the old one).
  - Plugins: `jwt`, `rate-limiting` (per consumer/IP, Redis), `cors`, `correlation-id` (`X-Request-Id`), `request-size-limiting`, `prometheus`, `opentelemetry`.
- **BFF (NestJS)** behind Kong for aggregate read endpoints only; it owns no data and no business rules.
- Public auth endpoints (OTP request/verify, token refresh) are routed without the `jwt` plugin but with strict rate limits.
- Services still validate the JWT and enforce authorization themselves (zero trust inside the cluster).
- In local dev, the gateway is an optional compose profile; services can be called directly while developing.

## Consequences
- + Gateway concerns are declarative, reviewable, and identical across dev/staging/prod.
- + Mature plugins instead of custom code; good material for the seminar (edge vs. BFF responsibilities).
- − One more component on the request path (latency ~1 ms, one more thing to monitor).
- − Kong OSS has no built-in JWKS fetching; key rotation is a config change (acceptable, and automatable in CI).
