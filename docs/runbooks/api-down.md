# API down

**Alert:** NobarApiDown — no API pod answers the Prometheus scrape for 2 minutes.

## Look first
```bash
kubectl -n nobar-prod get pods -l app.kubernetes.io/name=nobar-api
```
```bash
kubectl -n nobar-prod describe pod <pod>
```

| Sign | Likely cause | Action |
|---|---|---|
| `CrashLoopBackOff`, log says `Invalid configuration` or `… is required in production` | A missing or wrong secret / variable | Fix the `nobar-api` Secret (see `docs/deployment.md`); the API refuses to start with unsafe settings on purpose |
| Log says `TRUST_PROXY: a hop count is not supported` | Numeric `TRUST_PROXY` | Use `true` behind the ingress, or proxy CIDRs |
| Start-up probe fails, log shows migrations | A long migration | Wait; the startup probe allows two minutes. Replicas wait for each other's migrations |
| `ImagePullBackOff` | Registry not reachable from the cluster | Mirror the image to a reachable registry (servers in Iran) |
| Pods running, alert still firing | Scrape problem, not an outage | Check the ServiceMonitor and that `/healthz` answers |
