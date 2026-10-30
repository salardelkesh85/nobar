import { eventSubject, type EventEnvelope, type EventType } from "@nobar/contracts";
import type { Logger } from "./logger";
import { sleep } from "./util";

export type EventHandler = (event: EventEnvelope) => Promise<void>;

export interface Subscription {
  /** durable consumer name, unique per consuming service + purpose, e.g. `search.products` */
  consumer: string;
  types: EventType[];
  handler: EventHandler;
}

/**
 * Transport-agnostic event bus (ADR-0004). Delivery is at-least-once; consumers must be idempotent
 * (see inbox.ts). Ordering is guaranteed per aggregate only.
 */
export interface EventBus {
  readonly kind: "memory" | "nats";
  publish(event: EventEnvelope): Promise<void>;
  subscribe(sub: Subscription): Promise<void>;
  close(): Promise<void>;
}

const MAX_ATTEMPTS = 5;

/**
 * In-process bus for the single-process dev host and tests. Delivers asynchronously with retries and
 * keeps a dead-letter list, so failure behaviour matches the real broker closely enough to test sagas.
 */
export class InMemoryEventBus implements EventBus {
  readonly kind = "memory" as const;
  private readonly subs: Subscription[] = [];
  private readonly chains = new Map<string, Promise<void>>();
  readonly deadLetters: { consumer: string; event: EventEnvelope; error: string }[] = [];
  readonly history: EventEnvelope[] = [];

  constructor(private readonly log?: Logger) {}

  async publish(event: EventEnvelope): Promise<void> {
    this.history.push(event);
    if (this.history.length > 2000) this.history.shift();
    for (const sub of this.subs) {
      if (!sub.types.includes(event.type)) continue;
      // per-consumer + per-aggregate chain keeps ordering per subject, like a keyed partition
      const key = `${sub.consumer}|${event.subject}`;
      const prev = this.chains.get(key) ?? Promise.resolve();
      const next = prev.then(() => this.deliver(sub, event));
      this.chains.set(key, next);
      void next.finally(() => {
        if (this.chains.get(key) === next) this.chains.delete(key);
      });
    }
  }

  private async deliver(sub: Subscription, event: EventEnvelope): Promise<void> {
    await sleep(0);
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await sub.handler(event);
        return;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        if (attempt === MAX_ATTEMPTS) {
          this.deadLetters.push({ consumer: sub.consumer, event, error });
          this.log?.error({ consumer: sub.consumer, type: event.type, eventId: event.id, error }, "event dead-lettered");
          return;
        }
        this.log?.warn({ consumer: sub.consumer, type: event.type, attempt, error }, "event handler failed, retrying");
        await sleep(100 * 2 ** attempt);
      }
    }
  }

  async subscribe(sub: Subscription): Promise<void> {
    this.subs.push(sub);
  }

  /** Resolves once every in-flight delivery has finished (tests / seeding). */
  async drain(): Promise<void> {
    while (this.chains.size) await Promise.all([...this.chains.values()]);
  }

  async close(): Promise<void> {
    await this.drain();
  }
}

/** NATS JetStream transport: one stream, one durable pull consumer per subscription. */
export class NatsEventBus implements EventBus {
  readonly kind = "nats" as const;
  static readonly STREAM = "NOBAR_EVENTS";
  private stops: (() => void)[] = [];

  private constructor(
    private readonly nc: import("nats").NatsConnection,
    private readonly js: import("nats").JetStreamClient,
    private readonly jsm: import("nats").JetStreamManager,
    private readonly log: Logger,
  ) {}

  static async connect(url: string, name: string, log: Logger): Promise<NatsEventBus> {
    const nats = await import("nats");
    const nc = await nats.connect({ servers: url.split(","), name, reconnect: true, maxReconnectAttempts: -1 });
    const jsm = await nc.jetstreamManager();
    try {
      await jsm.streams.info(NatsEventBus.STREAM);
    } catch {
      await jsm.streams.add({
        name: NatsEventBus.STREAM,
        subjects: ["nobar.>"],
        storage: nats.StorageType.File,
        retention: nats.RetentionPolicy.Limits,
        max_age: nats.nanos(7 * 24 * 3600 * 1000),
        duplicate_window: nats.nanos(2 * 60 * 1000),
      });
    }
    log.info({ url }, "connected to NATS JetStream");
    return new NatsEventBus(nc, nc.jetstream(), jsm, log);
  }

  async publish(event: EventEnvelope): Promise<void> {
    // msgID = event id → broker-side dedup inside the duplicate window
    await this.js.publish(eventSubject(event.type), JSON.stringify(event), { msgID: event.id });
  }

  async subscribe(sub: Subscription): Promise<void> {
    const nats = await import("nats");
    const durable = sub.consumer.replace(/[^A-Za-z0-9_-]/g, "_");
    const filter_subjects = sub.types.map((t) => eventSubject(t));
    try {
      await this.jsm.consumers.info(NatsEventBus.STREAM, durable);
      await this.jsm.consumers.update(NatsEventBus.STREAM, durable, { filter_subjects });
    } catch {
      await this.jsm.consumers.add(NatsEventBus.STREAM, {
        durable_name: durable,
        ack_policy: nats.AckPolicy.Explicit,
        deliver_policy: nats.DeliverPolicy.All,
        filter_subjects,
        max_deliver: MAX_ATTEMPTS,
        ack_wait: nats.nanos(30_000),
      });
    }
    const consumer = await this.js.consumers.get(NatsEventBus.STREAM, durable);
    const messages = await consumer.consume({ max_messages: 50 });
    this.stops.push(() => void messages.stop());
    void (async () => {
      for await (const m of messages) {
        let event: EventEnvelope | undefined;
        try {
          event = JSON.parse(m.string()) as EventEnvelope;
          await sub.handler(event);
          m.ack();
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          if (m.info.redeliveryCount >= MAX_ATTEMPTS - 1) {
            this.log.error({ consumer: sub.consumer, eventId: event?.id, error }, "event dead-lettered");
            await this.js.publish(`nobar.dlq.${durable}`, m.data).catch(() => undefined);
            m.term();
          } else {
            m.nak(500 * 2 ** m.info.redeliveryCount);
          }
        }
      }
    })();
  }

  async close(): Promise<void> {
    for (const stop of this.stops) stop();
    await this.nc.drain();
  }
}

export async function createEventBus(opts: { natsUrl?: string; name: string; log: Logger; shared?: EventBus }): Promise<EventBus> {
  if (opts.shared) return opts.shared;
  if (opts.natsUrl) return NatsEventBus.connect(opts.natsUrl, opts.name, opts.log);
  opts.log.warn("NATS_URL not set: using an in-process event bus (only valid inside the single-process dev host)");
  return new InMemoryEventBus(opts.log);
}
