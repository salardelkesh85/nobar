import type { Logger } from "@nobar/common";
import type { IdentityConfig } from "./config";

/** SMS delivery behind an interface so providers can be swapped by configuration. */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

/** Development provider: writes the code to the log instead of sending an SMS. */
export class ConsoleSmsProvider implements SmsProvider {
  constructor(private readonly log: Logger) {}
  async sendOtp(phone: string, code: string): Promise<void> {
    this.log.info(`[sms:console] کد ورود نوبر برای ${phone.slice(0, 6)}***${phone.slice(-2)}: ${code}`);
  }
}

/** Kavenegar verify/lookup API (template-based OTP). */
export class KavenegarSmsProvider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly template: string,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const receptor = phone.replace(/^\+98/, "0");
    const url = new URL(`https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/verify/lookup.json`);
    url.searchParams.set("receptor", receptor);
    url.searchParams.set("token", code);
    url.searchParams.set("template", this.template);
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Kavenegar responded ${res.status}`);
  }
}

export function createSmsProvider(config: IdentityConfig, log: Logger): SmsProvider {
  if (config.SMS_PROVIDER === "kavenegar") {
    if (!config.KAVENEGAR_API_KEY) throw new Error("KAVENEGAR_API_KEY is required when SMS_PROVIDER=kavenegar");
    return new KavenegarSmsProvider(config.KAVENEGAR_API_KEY, config.KAVENEGAR_TEMPLATE);
  }
  return new ConsoleSmsProvider(log);
}
