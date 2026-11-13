# Search latency

**Alert:** NobarSearchLatencyFastBurn (page), NobarSearchLatencySlowBurn (ticket).
**SLO:** 95% of `GET /v1/search` requests answer within 300 ms.

## Look first
1. Dashboard → "p95 latency by route": is only `/v1/search` slow, or everything (CPU, event loop lag)?
2. "Pods: CPU" and "Event loop lag": search runs in the API process; a busy pod slows every route.
3. Catalog size: search is measured at 100k listings in `docs/performance.md`. Unfiltered browsing of a very large
   catalog is the known slow case.

## Actions
| Sign | Action |
|---|---|
| CPU high on all pods, HPA at max | Raise `autoscaling.maxReplicas` in `values-prod.yaml` |
| Only some pods slow | Delete the slow pod; the catalog snapshot is rebuilt on start |
| Slow right after many listing edits | The snapshot and word index are rebuilt after writes; expected to settle within a minute |
| Steadily slow as the catalog grows | Make the store page results (`limit`/`offset` on `/v1/search`) and plan the OpenSearch move (architecture §5) |
