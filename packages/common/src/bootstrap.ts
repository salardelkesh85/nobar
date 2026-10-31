import "reflect-metadata";
import { type DynamicModule, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { z } from "zod";
import { JwtVerifier } from "./auth";
import { createEventBus, type EventBus } from "./bus";
import { type BaseConfig, loadConfig, trustProxyOption } from "./config";
import { contextFromHeaders, currentContext, requestContext } from "./context";
import { CoreModule, type ServiceDeps } from "./core";
import { createDatabase } from "./db";
import { ProblemFilter } from "./errors";
import { createLogger, NestPinoLogger } from "./logger";
import { Metrics } from "./metrics";
import { commonMigrations, type Migration, migrate } from "./migrate";
import { OutboxRelay } from "./outbox";
import { createRateLimiter } from "./ratelimit";

export interface ServiceDefinition<C extends BaseConfig = BaseConfig> {
  name: string;
  configSchema: z.ZodType<C>;
  migrations: Migration[];
  module(deps: ServiceDeps<C>): DynamicModule;
  /** start consumers / background jobs; may return a cleanup function */
  onStart?(ctx: { app: NestFastifyApplication; deps: ServiceDeps<C> }): Promise<void | (() => Promise<void> | void)>;
  /** register Fastify hooks/plugins before the server starts listening (CORS, …) */
  configure?(ctx: { app: NestFastifyApplication; deps: ServiceDeps<C> }): Promise<void> | void;
  /** extra JwtVerifier (identity verifies with its own keys instead of fetching its JWKS) */
  verifier?(deps: Omit<ServiceDeps<C>, "verifier">): Promise<JwtVerifier>;
}

export interface RunningService<C extends BaseConfig = BaseConfig> {
  name: string;
  url: string;
  app: NestFastifyApplication;
  deps: ServiceDeps<C>;
  stop(): Promise<void>;
}

@Module({})
class ServiceRootModule {}

export async function startService<C extends BaseConfig>(
  def: ServiceDefinition<C>,
  opts: { overrides?: Record<string, string | undefined>; bus?: EventBus } = {},
): Promise<RunningService<C>> {
  const config = loadConfig(def.configSchema, { SERVICE_NAME: def.name, ...opts.overrides }) as C;
  const log = createLogger(def.name, config.LOG_LEVEL, config.LOG_FORMAT);
  const db = await createDatabase({ name: def.name, url: config.DATABASE_URL, dataDir: config.DATA_DIR, log });
  await migrate(db, [...commonMigrations, ...def.migrations], log);
  const bus = await createEventBus({ natsUrl: config.NATS_URL, name: def.name, log, shared: opts.bus });
  const metrics = new Metrics(def.name);
  const outbox = new OutboxRelay(db, bus, log);
  const rateLimiter = await createRateLimiter(config.REDIS_URL, log);
  const partial = { config, db, bus, log, metrics, outbox, rateLimiter };
  const verifier = def.verifier
    ? await def.verifier(partial)
    : new JwtVerifier({ jwksUrl: `${config.IDENTITY_URL}/.well-known/jwks.json`, issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
  const deps: ServiceDeps<C> = { ...partial, verifier };

  const root: DynamicModule = { module: ServiceRootModule, imports: [CoreModule.forRoot(deps), def.module(deps)] };
  const app = await NestFactory.create<NestFastifyApplication>(root, new FastifyAdapter({ trustProxy: trustProxyOption(config.TRUST_PROXY), bodyLimit: 1_048_576 }), {
    logger: new NestPinoLogger(log),
    abortOnError: false,
  });

  const fastify = app.getHttpAdapter().getInstance();
  // every request runs inside a context carrying request id + W3C trace id (logs, downstream calls, events)
  fastify.addHook("onRequest", (req, _reply, done) => {
    requestContext.run(contextFromHeaders(req.headers), done);
  });
  fastify.addHook("onSend", (_req, reply, payload, done) => {
    const ctx = currentContext();
    if (ctx) void reply.header("x-request-id", ctx.requestId);
    done(null, payload);
  });
  fastify.addHook("onResponse", (req, reply, done) => {
    const route = req.routeOptions.url ?? "unmatched";
    metrics.httpDuration.observe({ method: req.method, route, status: String(reply.statusCode) }, reply.elapsedTime / 1000);
    if (route !== "/metrics" && route !== "/healthz" && route !== "/readyz") {
      log.debug({ method: req.method, url: req.url, status: reply.statusCode, ms: Math.round(reply.elapsedTime) }, "request");
    }
    done();
  });
  app.useGlobalFilters(new ProblemFilter(log));
  await def.configure?.({ app, deps });

  await app.listen(config.PORT, config.HOST);
  outbox.start();
  const cleanup = await def.onStart?.({ app, deps });
  log.info({ port: config.PORT, db: db.kind, bus: bus.kind }, `${def.name} listening`);

  return {
    name: def.name,
    url: `http://localhost:${config.PORT}`,
    app,
    deps,
    async stop() {
      outbox.stop();
      if (cleanup) await cleanup();
      await app.close();
      if (!opts.bus) await bus.close();
      await db.close();
    },
  };
}

/** Entry point for running one service as its own process (containers / Kubernetes). */
export function runService<C extends BaseConfig>(def: ServiceDefinition<C>): void {
  startService(def)
    .then((svc) => {
      const shutdown = () => {
        svc.deps.log.info("shutting down");
        svc.stop().then(
          () => process.exit(0),
          () => process.exit(1),
        );
      };
      process.once("SIGTERM", shutdown);
      process.once("SIGINT", shutdown);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
