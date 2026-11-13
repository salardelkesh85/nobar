# Runbooks

One page per alert in `infra/helm/nobar-api/templates/prometheusrule.yaml`. Each says what the alert means,
what to look at first, and what to do. The dashboard is "Nobar API" in Grafana (`files/dashboard.json`).

| Alert | Severity | Page |
|---|---|---|
| NobarCheckoutErrorBudgetFastBurn / SlowBurn | page / ticket | [checkout-availability.md](checkout-availability.md) |
| NobarSearchLatencyFastBurn / SlowBurn | page / ticket | [search-latency.md](search-latency.md) |
| NobarApiDown | page | [api-down.md](api-down.md) |
| NobarPaymentFailuresHigh | page | [payment-failures.md](payment-failures.md) |
| NobarOutboxBacklog | ticket | [outbox-backlog.md](outbox-backlog.md) |
| NobarAssistantUnavailable | ticket | [assistant-unavailable.md](assistant-unavailable.md) |

Useful everywhere:

```bash
kubectl -n nobar-prod get pods -l app.kubernetes.io/name=nobar-api
```

```bash
kubectl -n nobar-prod logs -l app.kubernetes.io/name=nobar-api --since=15m | grep '"level":"error"'
```

Logs are JSON; every line has `trace_id`, and API errors answer with `x-request-id`, which appears in the logs.
