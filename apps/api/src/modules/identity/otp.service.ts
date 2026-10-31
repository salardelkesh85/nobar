import { randomInt } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { AppError, type Database, hmac, type RateLimiter, safeEqual, tooMany, TOKENS } from "@nobar/common";
import { type ApiConfig, otpEchoEnabled } from "../../config";
import { SMS_PROVIDER, type SmsProvider } from "./sms";

// docs/domain.md §2 and brief Prompt 2: 6 digits, 2-minute expiry, max 5 attempts, resend cooldown.
export const OTP_TTL_SEC = 120;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SEC = 60;
// abuse limits (per phone and per IP, fixed one-hour windows)
const SENDS_PER_PHONE_PER_HOUR = 5;
const SENDS_PER_IP_PER_HOUR = 20;

export interface OtpSent {
  expiresInSec: number;
  resendInSec: number;
  /** only outside production (OTP_ECHO): lets the demo sign in without an SMS */
  devCode?: string;
}

type Check = { ok: true } | { ok: false; code: string; message: string; status: 400 | 429 };

@Injectable()
export class OtpService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
    @Inject(TOKENS.RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  private hash(phone: string, code: string): string {
    return hmac(this.config.OTP_SECRET, `${phone}:${code}`);
  }

  async request(phone: string, ip: string): Promise<OtpSent> {
    const [last] = await this.db.query<{ sent_at: Date }>("select sent_at from identity.otp_challenges where phone = $1", [phone]);
    if (last) {
      const wait = Math.ceil(OTP_RESEND_SEC - (Date.now() - new Date(last.sent_at).getTime()) / 1000);
      if (wait > 0) throw tooMany(`برای دریافت دوباره‌ی کد ${wait} ثانیه صبر کنید`, wait);
    }
    for (const [key, limit] of [
      [`otp:phone:${phone}`, SENDS_PER_PHONE_PER_HOUR],
      [`otp:ip:${ip}`, SENDS_PER_IP_PER_HOUR],
    ] as const) {
      const r = await this.limiter.hit(key, limit, 3600);
      if (!r.allowed) throw tooMany("درخواست کد بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید", r.retryAfterSec);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.db.query(
      `insert into identity.otp_challenges (phone, code_hash, expires_at, attempts, sent_at)
       values ($1, $2, now() + make_interval(secs => $3), 0, now())
       on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now()`,
      [phone, this.hash(phone, code), OTP_TTL_SEC],
    );
    await this.sms.sendOtp(phone, code);
    return { expiresInSec: OTP_TTL_SEC, resendInSec: OTP_RESEND_SEC, ...(otpEchoEnabled(this.config) ? { devCode: code } : {}) };
  }

  /** Consumes the challenge on success. A wrong code still counts as an attempt (committed before the error). */
  async verify(phone: string, code: string): Promise<void> {
    const check = await this.db.tx<Check>(async (sql) => {
      const [c] = await sql.query<{ code_hash: string; attempts: number; expired: boolean }>(
        "select code_hash, attempts, expires_at <= now() as expired from identity.otp_challenges where phone = $1 for update",
        [phone],
      );
      if (!c || c.expired) return { ok: false, status: 400, code: "OTP_EXPIRED", message: "کد منقضی شده است؛ کد تازه بگیرید" };
      if (c.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, status: 429, code: "OTP_LOCKED", message: "تلاش‌ها تمام شد؛ کد تازه بگیرید" };
      if (!safeEqual(c.code_hash, this.hash(phone, code))) {
        await sql.query("update identity.otp_challenges set attempts = attempts + 1 where phone = $1", [phone]);
        const left = OTP_MAX_ATTEMPTS - c.attempts - 1;
        return left > 0
          ? { ok: false, status: 400, code: "OTP_INVALID", message: `کد درست نیست؛ ${left} بار دیگر می‌توانید امتحان کنید` }
          : { ok: false, status: 429, code: "OTP_LOCKED", message: "تلاش‌ها تمام شد؛ کد تازه بگیرید" };
      }
      await sql.query("delete from identity.otp_challenges where phone = $1", [phone]);
      return { ok: true };
    });
    if (!check.ok) throw new AppError(check.status, check.code, check.message);
  }
}
