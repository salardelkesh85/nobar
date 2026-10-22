# 0004. Event bus: NATS JetStream (vs. Kafka)

- Status: Proposed — **needs confirmation by the project owner**
- Date: 2026-10-22

## Context
Services communicate asynchronously through versioned events published via the Outbox pattern. Requirements:
- durable, replayable streams (search reindex and the embedding pipeline replay `product.*`);
- at-least-once delivery with acknowledgements, retries and dead-lettering;
- ordering per aggregate;
- autoscaling consumers on backlog (KEDA) and feeding ClickHouse for analytics;
- **must run comfortably on an 8 GB Windows laptop** next to PostgreSQL, Redis, OpenSearch and a few services.

## Options considered
| | Kafka (KRaft) | Redpanda | **NATS JetStream** | RabbitMQ |
|---|---|---|---|---|
| Durable replayable log | Yes | Yes | Yes (streams) | Streams plugin; queues are not a log |
| Per-key ordering | Partitions | Partitions | Per subject | Per queue |
| Built-in publish dedup | Idempotent producer | Idempotent producer | `Nats-Msg-Id` dedup window | No |
| Dev memory footprint | ~1 GB+ (JVM) | ~0.5–1 GB | **~20–50 MB** | ~150 MB |
| KEDA scaler | Yes | Yes (Kafka) | Yes | Yes |
| ClickHouse ingestion | Kafka engine | Kafka engine | NATS engine | RabbitMQ engine |
| Ops complexity | High | Medium | Low (single binary) | Medium |
| Industry recognition (seminar) | Highest | Medium | Medium | High |

## Decision (proposed)
**NATS JetStream** as the event bus, hidden behind a small `EventBus` publisher/consumer interface in `packages/common`, so the transport is swappable.

- One stream per bounded context (`ORDER` ← `nobar.order.>`), file storage, replicas = 3 in production.
- Durable pull consumers per subscribing service; explicit ack, `max_deliver` then dead-letter subject `nobar.dlq.<service>`.
- Outbox relay sets `Nats-Msg-Id = event.id` for broker-side dedup; consumers still keep an inbox table.

**Upgrade path:** if throughput or ecosystem needs (Kafka Connect, Debezium CDC) outgrow NATS, add a Kafka/Redpanda adapter behind the same interface; event envelopes and contracts do not change.

## Consequences
- + Fits the 8 GB dev machine with room to spare; single binary, trivial to run in compose and Kubernetes (official Helm chart).
- + Built-in dedup window simplifies the outbox relay.
- − Less widely known than Kafka; the seminar should explain the trade-off (this ADR is the material).
- − Fewer off-the-shelf connectors; analytics ingestion uses the ClickHouse NATS engine or a small consumer.
- If the owner prefers **Kafka** for the seminar's sake, the alternative is Redpanda in dev (lighter, Kafka API) and Kafka/Redpanda in production, with the same interface.
