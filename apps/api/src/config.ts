import { baseConfigSchema } from "@nobar/common";
import { z } from "zod";

const flag = z.enum(["true", "false"]).optional();

export const apiConfigSchema = baseConfigSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  /** browser apps allowed to call the API (comma separated) */
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:3002"),

  // identity
  OTP_SECRET: z.string().min(16).default("dev-otp-secret-change-me"),
  /** return the OTP in the API response (development/demo only) */
  OTP_ECHO: flag,
  /** phones that get the ADMIN role on sign-in (comma separated, any Iranian format) */
  ADMIN_PHONES: z.string().default(""),
  /** ES256 private JWK as JSON; generated and persisted under DATA_DIR in development */
  JWT_PRIVATE_JWK: z.string().optional(),
  ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** HttpOnly session cookies are Secure by default in production. */
  SESSION_COOKIE_SECURE: flag,
  SESSION_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  SMS_PROVIDER: z.enum(["console", "melipayamak", "kavenegar"]).default("console"),
  /** Melipayamak panel user name and API password (webservice), and the sender line */
  MELIPAYAMAK_USERNAME: z.string().optional(),
  MELIPAYAMAK_PASSWORD: z.string().optional(),
  MELIPAYAMAK_FROM: z.string().optional(),
  /** approved pattern for sign-in codes on the shared service line (its only variable is the code); plain SMS when unset */
  MELIPAYAMAK_OTP_BODY_ID: z.coerce.number().int().positive().optional(),
  MELIPAYAMAK_BASE_URL: z.string().url().default("https://rest.payamak-panel.com"),
  KAVENEGAR_API_KEY: z.string().optional(),
  KAVENEGAR_TEMPLATE: z.string().default("nobar-otp"),

  /** public address of this API (gateway callbacks and the test gateway page) */
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  /** "fake" is the built-in test gateway; real gateways sit behind the same interface (modules/payment/provider.ts) */
  PAYMENT_PROVIDER: z.enum(["fake", "zarinpal"]).default("fake"),
  ZARINPAL_MERCHANT_ID: z.string().optional(),
  /** use ZarinPal's sandbox (no real money) */
  ZARINPAL_SANDBOX: flag,
  /** override the gateway address (tests) */
  ZARINPAL_BASE_URL: z.string().url().optional(),

  /** how often order deadlines are checked (0 turns the timer off, e.g. in tests) */
  ORDER_TIMER_SEC: z.coerce.number().int().min(0).default(30),

  // assistant
  /** "fake" is a rule-based stand-in (tests, and when no model is configured); see modules/assistant/llm.ts */
  LLM_PROVIDER: z.enum(["fake", "openai-compatible"]).default("fake"),
  /** e.g. http://vllm:8000/v1 for a self-hosted model */
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** messages one buyer may send to the assistant per day */
  AI_DAILY_MESSAGES: z.coerce.number().int().positive().default(40),

  // recommendation
  /** feature flag: "false" turns recommendations off everywhere (the endpoints answer with an empty list) */
  RECOMMENDATIONS: flag,

  // catalog
  /** 32-byte key (base64) that encrypts sellers' national ID and Sheba; a fixed dev key outside production */
  KYC_KEY: z.string().optional(),
  /** import the demo catalog (packages/demo) into an empty database; on by default outside production */
  SEED_DEMO: flag,
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

export const otpEchoEnabled = (c: ApiConfig) => (c.OTP_ECHO ? c.OTP_ECHO === "true" : c.NODE_ENV !== "production");

export const seedDemoEnabled = (c: ApiConfig) => (c.SEED_DEMO ? c.SEED_DEMO === "true" : c.NODE_ENV !== "production");
export const secureSessionCookies = (c: ApiConfig) => (c.SESSION_COOKIE_SECURE ? c.SESSION_COOKIE_SECURE === "true" : c.NODE_ENV === "production");

export function assertProductionConfig(c: ApiConfig): void {
  if (c.NODE_ENV !== "production") return;
  if (c.OTP_SECRET === "dev-otp-secret-change-me") throw new Error("OTP_SECRET must be set in production");
  if (otpEchoEnabled(c)) throw new Error("OTP_ECHO must be off in production");
  if (!c.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  if (!secureSessionCookies(c)) throw new Error("SESSION_COOKIE_SECURE must be enabled in production");
  if (c.SESSION_COOKIE_SAME_SITE === "none" && !secureSessionCookies(c)) throw new Error("SameSite=None session cookies require Secure");
  if (!c.KYC_KEY || Buffer.from(c.KYC_KEY, "base64").length !== 32) throw new Error("KYC_KEY (32 bytes, base64) is required in production");
  if (c.PAYMENT_PROVIDER === "zarinpal" && c.ZARINPAL_SANDBOX === "true") throw new Error("ZARINPAL_SANDBOX must be off in production");
  if (c.PAYMENT_PROVIDER === "fake") throw new Error("PAYMENT_PROVIDER=fake is a test gateway; configure a real provider in production");
  if (c.SMS_PROVIDER === "console") throw new Error("SMS_PROVIDER=console would log sign-in codes; choose a real provider in production");
}
