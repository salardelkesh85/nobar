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
  SMS_PROVIDER: z.enum(["console", "kavenegar"]).default("console"),
  KAVENEGAR_API_KEY: z.string().optional(),
  KAVENEGAR_TEMPLATE: z.string().default("nobar-otp"),

  // catalog
  /** import the demo catalog (packages/demo) into an empty database; on by default outside production */
  SEED_DEMO: flag,
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

export const otpEchoEnabled = (c: ApiConfig) => (c.OTP_ECHO ? c.OTP_ECHO === "true" : c.NODE_ENV !== "production");

export const seedDemoEnabled = (c: ApiConfig) => (c.SEED_DEMO ? c.SEED_DEMO === "true" : c.NODE_ENV !== "production");

export function assertProductionConfig(c: ApiConfig): void {
  if (c.NODE_ENV !== "production") return;
  if (c.OTP_SECRET === "dev-otp-secret-change-me") throw new Error("OTP_SECRET must be set in production");
  if (otpEchoEnabled(c)) throw new Error("OTP_ECHO must be off in production");
  if (!c.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  if (c.SMS_PROVIDER === "console") throw new Error("SMS_PROVIDER=console would log sign-in codes; choose a real provider in production");
}
