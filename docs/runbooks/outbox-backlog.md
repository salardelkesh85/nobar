# Outbox backlog

**Alert:** NobarOutboxBacklog — more than 100 events waiting in the outbox for 10 minutes.

Orders publish their events through the outbox (same transaction as the order). Consumers — notifications (SMS and
in-app), recommendations, business metrics — read them from the bus. A backlog delays those; orders themselves are fine.

## Look first
```sql
select type, count(*), min(created_at), max(attempts), max(last_error) from outbox where published_at is null group by type;
```

| Sign | Action |
|---|---|
| `last_error` mentions NATS | The broker is down or unreachable (only when `NATS_URL` is set); restore it, the relay retries |
| A consumer keeps failing (logs `event consumed` missing, errors in a consumer) | Fix the consumer; events are applied once thanks to the inbox, so replaying is safe |
| Backlog falls by itself | A burst (many orders at once); no action |

A failed SMS does not hold up events: the in-app notice is stored and the SMS error is only logged.
