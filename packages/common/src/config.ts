import { z } from "zod";

const DEV_INTERNAL_TOKEN = "dev-internal-token-change-me";

/**
 * Configuration every service shares. Services extend it with their own keys.
 * Config comes only from environment variables (CLAUDE.md); the local dev host passes per-service
 * overrides programmatically because all services share one process there.
 */
export const baseConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().min(1),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive(),
  /**
   * Which proxies may set X-Forwarded-For (the client IP used by rate limits): "loopback" (default),
   * "true" (any — only behind an ingress that overwrites the header), "false", or IPs/CIDRs (comma separated).
   */
  TRUST_PROXY: z.string().default("loopback"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
  /** postgres://… — when absent the service uses embedded PGlite under DATA_DIR */
  DATABASE_URL: z.string().optional(),
  /** directory for embedded databases, or "memory" */
  DATA_DIR: z.string().default(".data"),
  /** nats://… — when absent an in-process bus is used (single-process dev host only) */
  NATS_URL: z.string().optional(),
  /** redis://… — when absent in-memory stores are used */
  REDIS_URL: z.string().optional(),
  IDENTITY_URL: z.string().default("http://localhost:4101"),
  INTERNAL_TOKEN: z.string().min(16).default(DEV_INTERNAL_TOKEN),
  JWT_ISSUER: z.string().default("nobar-identity"),
  JWT_AUDIENCE: z.string().default("nobar"),
  WEB_URL: z.string().default("http://localhost:3000"),
  /** requests per minute from one client IP to /v1/* (0 turns the limit off; health and metrics are never limited) */
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(0).default(600),
});

export type BaseConfig = z.infer<typeof baseConfigSchema>;

/** TRUST_PROXY → Fastify's `trustProxy` option. */
export function trustProxyOption(value: string): boolean | string {
  if (value === "true" || value === "false") return value === "true";
  // a hop count cannot check who the immediate peer is, so a client could forge X-Forwarded-For;
  // fastify 5.12 trusts nobody for a number, which would quietly break rate limits — refuse it instead
  if (/^\d+$/.test(value)) throw new Error("TRUST_PROXY: a hop count is not supported; list the proxy IPs or CIDRs (e.g. 10.0.0.0/8), or use \"true\" behind an ingress that overwrites the header");
  return value;
}

export function loadConfig<S extends z.ZodType<BaseConfig>>(schema: S, overrides: Record<string, string | undefined> = {}): z.infer<S> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const [k, v] of Object.entries(overrides)) if (v !== undefined) env[k] = v;
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  const cfg = parsed.data as BaseConfig;
  if (cfg.NODE_ENV === "production" && cfg.INTERNAL_TOKEN === DEV_INTERNAL_TOKEN) {
    throw new Error("INTERNAL_TOKEN must be set in production");
  }
  return parsed.data;
}
