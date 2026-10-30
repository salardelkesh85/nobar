/** Nest DI tokens for the shared runtime (always injected explicitly with @Inject). */
export const TOKENS = {
  CONFIG: Symbol.for("nobar.config"),
  DB: Symbol.for("nobar.db"),
  BUS: Symbol.for("nobar.bus"),
  LOG: Symbol.for("nobar.log"),
  METRICS: Symbol.for("nobar.metrics"),
  VERIFIER: Symbol.for("nobar.verifier"),
  OUTBOX: Symbol.for("nobar.outbox"),
  RATE_LIMITER: Symbol.for("nobar.rateLimiter"),
  DEPS: Symbol.for("nobar.deps"),
} as const;
