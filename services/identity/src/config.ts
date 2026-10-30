import { baseConfigSchema } from "@nobar/common";
import { z } from "zod";

export const identityConfigSchema = baseConfigSchema.extend({
  PORT: z.coerce.number().int().positive().default(4101),
  OTP_SECRET: z.string().min(16).default("dev-otp-secret-change-me"),
  /** return the OTP in the API response (development/demo only) */
  OTP_ECHO: z.enum(["true", "false"]).optional(),
  ADMIN_PHONES: z.string().default("+989120000000"),
  /** ES256 private JWK as JSON; generated and persisted under DATA_DIR in development */
  JWT_PRIVATE_JWK: z.string().optional(),
  ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SMS_PROVIDER: z.enum(["console", "kavenegar"]).default("console"),
  KAVENEGAR_API_KEY: z.string().optional(),
  KAVENEGAR_TEMPLATE: z.string().default("nobar-otp"),
});

export type IdentityConfig = z.infer<typeof identityConfigSchema>;

export const otpEchoEnabled = (c: IdentityConfig) => (c.OTP_ECHO ? c.OTP_ECHO === "true" : c.NODE_ENV !== "production");
