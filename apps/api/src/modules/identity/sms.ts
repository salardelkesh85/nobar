import type { Logger } from "@nobar/common";
import type { ApiConfig } from "../../config";

/** SMS delivery behind an interface so providers can be swapped by configuration. */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
  /** order and account notices */
  send(phone: string, text: string): Promise<void>;
}

const masked = (phone: string) => `${phone.slice(0, 6)}***${phone.slice(-2)}`;

/** Development provider: writes the code to the log instead of sending an SMS. */
export class ConsoleSmsProvider implements SmsProvider {
  constructor(private readonly log: Logger) {}
  async sendOtp(phone: string, code: string): Promise<void> {
    this.log.info(`[sms:console] کد ورود نوبر برای ${masked(phone)}: ${code}`);
  }
  async send(phone: string, text: string): Promise<void> {
    this.log.info(`[sms:console] ${masked(phone)}: ${text}`);
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

  async send(phone: string, text: string): Promise<void> {
    const url = new URL(`https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/sms/send.json`);
    url.searchParams.set("receptor", phone.replace(/^\+98/, "0"));
    url.searchParams.set("message", text);
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Kavenegar responded ${res.status}`);
  }
}

/**
 * Melipayamak REST webservice. Sign-in codes go through an approved pattern on the shared service line
 * when `otpBodyId` is set (they then also reach numbers that block advertising SMS); everything else is a
 * plain message from the panel's own line.
 */
export class MelipayamakSmsProvider implements SmsProvider {
  private readonly base: string;
  constructor(private readonly opts: { username: string; password: string; from: string; otpBodyId?: number; baseUrl?: string }) {
    this.base = (opts.baseUrl ?? "https://rest.payamak-panel.com").replace(/\/$/, "");
  }

  private async post(method: "SendSMS" | "BaseServiceNumber", fields: Record<string, string>): Promise<void> {
    const res = await fetch(`${this.base}/api/SendSMS/${method}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: this.opts.username, password: this.opts.password, ...fields }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Melipayamak responded ${res.status}`);
    const reply = (await res.json()) as { RetStatus?: number; StrRetStatus?: string; Value?: string };
    // RetStatus 1 = accepted; anything else is a panel error (credit, credentials, pattern not approved, …)
    if (reply.RetStatus !== 1) throw new Error(`Melipayamak refused the message: ${reply.StrRetStatus ?? reply.Value ?? "unknown"}`);
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const to = phone.replace(/^\+98/, "0");
    if (this.opts.otpBodyId) return this.post("BaseServiceNumber", { to, bodyId: String(this.opts.otpBodyId), text: code });
    return this.post("SendSMS", { to, from: this.opts.from, text: `کد ورود نوبر: ${code}`, isFlash: "false" });
  }

  async send(phone: string, text: string): Promise<void> {
    return this.post("SendSMS", { to: phone.replace(/^\+98/, "0"), from: this.opts.from, text, isFlash: "false" });
  }
}

export function createSmsProvider(config: ApiConfig, log: Logger): SmsProvider {
  if (config.SMS_PROVIDER === "melipayamak") {
    if (!config.MELIPAYAMAK_USERNAME || !config.MELIPAYAMAK_PASSWORD || !config.MELIPAYAMAK_FROM) throw new Error("MELIPAYAMAK_USERNAME, MELIPAYAMAK_PASSWORD and MELIPAYAMAK_FROM are required when SMS_PROVIDER=melipayamak");
    return new MelipayamakSmsProvider({
      username: config.MELIPAYAMAK_USERNAME,
      password: config.MELIPAYAMAK_PASSWORD,
      from: config.MELIPAYAMAK_FROM,
      baseUrl: config.MELIPAYAMAK_BASE_URL,
      ...(config.MELIPAYAMAK_OTP_BODY_ID ? { otpBodyId: config.MELIPAYAMAK_OTP_BODY_ID } : {}),
    });
  }
  if (config.SMS_PROVIDER === "kavenegar") {
    if (!config.KAVENEGAR_API_KEY) throw new Error("KAVENEGAR_API_KEY is required when SMS_PROVIDER=kavenegar");
    return new KavenegarSmsProvider(config.KAVENEGAR_API_KEY, config.KAVENEGAR_TEMPLATE);
  }
  return new ConsoleSmsProvider(log);
}

/** DI token for the SmsProvider. */
export const SMS_PROVIDER = Symbol.for("nobar.identity.sms");
