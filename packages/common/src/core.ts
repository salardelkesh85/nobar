import { Controller, type DynamicModule, Get, Global, Inject, Module, Res } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { EventEnvelope, EventType } from "@nobar/contracts";
import type { FastifyReply } from "fastify";
import { AuthGuard, type JwtVerifier, Public } from "./auth";
import type { EventBus } from "./bus";
import type { BaseConfig } from "./config";
import { requestContext } from "./context";
import type { Database, Sql } from "./db";
import { consumeOnce } from "./inbox";
import type { Logger } from "./logger";
import type { Metrics } from "./metrics";
import type { OutboxRelay } from "./outbox";
import type { RateLimiter } from "./ratelimit";
import { TOKENS } from "./tokens";

export interface ServiceDeps<C extends BaseConfig = BaseConfig> {
  config: C;
  db: Database;
  bus: EventBus;
  log: Logger;
  metrics: Metrics;
  verifier: JwtVerifier;
  outbox: OutboxRelay;
  rateLimiter: RateLimiter;
}

@Controller()
export class HealthController {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.METRICS) private readonly metrics: Metrics,
    @Inject(TOKENS.CONFIG) private readonly config: BaseConfig,
  ) {}

  /** liveness: the process is up */
  @Public()
  @Get("healthz")
  healthz() {
    return { status: "ok", service: this.config.SERVICE_NAME };
  }

  /** readiness: dependencies reachable; Kubernetes stops routing traffic while this fails */
  @Public()
  @Get("readyz")
  async readyz(@Res({ passthrough: true }) reply: FastifyReply) {
    const db = await this.db.ping();
    if (!db) void reply.status(503);
    return { status: db ? "ready" : "not_ready", checks: { db } };
  }

  @Public()
  @Get("metrics")
  async scrape(@Res() reply: FastifyReply) {
    void reply.header("content-type", this.metrics.registry.contentType).send(await this.metrics.registry.metrics());
  }
}

/** Global providers every service module can inject: config, db, bus, logger, metrics, verifier, outbox. */
@Global()
@Module({})
export class CoreModule {
  static forRoot(deps: ServiceDeps): DynamicModule {
    return {
      module: CoreModule,
      global: true,
      controllers: [HealthController],
      providers: [
        { provide: TOKENS.DEPS, useValue: deps },
        { provide: TOKENS.CONFIG, useValue: deps.config },
        { provide: TOKENS.DB, useValue: deps.db },
        { provide: TOKENS.BUS, useValue: deps.bus },
        { provide: TOKENS.LOG, useValue: deps.log },
        { provide: TOKENS.METRICS, useValue: deps.metrics },
        { provide: TOKENS.VERIFIER, useValue: deps.verifier },
        { provide: TOKENS.OUTBOX, useValue: deps.outbox },
        { provide: TOKENS.RATE_LIMITER, useValue: deps.rateLimiter },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
      exports: Object.values(TOKENS),
    };
  }
}

/**
 * Subscribes an idempotent consumer: each event is applied at most once (inbox) inside a transaction,
 * and runs inside a request context that continues the producer's trace.
 */
export async function consume<T extends EventType>(
  deps: Pick<ServiceDeps, "bus" | "db" | "log">,
  consumer: string,
  types: T[],
  apply: (event: EventEnvelope<T>, sql: Sql) => Promise<void>,
): Promise<void> {
  await deps.bus.subscribe({
    consumer,
    types,
    handler: (event) => {
      const traceId = event.traceparent?.split("-")[1] ?? event.id.replace(/-/g, "");
      return requestContext.run({ requestId: `evt-${event.id.slice(-8)}`, traceId, spanId: event.id.slice(-16).replace(/-/g, "0") }, async () => {
        const applied = await consumeOnce(deps.db, consumer, event, (sql) => apply(event as EventEnvelope<T>, sql));
        deps.log.debug({ consumer, type: event.type, eventId: event.id, applied }, "event consumed");
      });
    },
  });
}
