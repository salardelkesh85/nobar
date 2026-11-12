import { randomToken, UpstreamError } from "@nobar/common";
import type { ApiConfig } from "../../config";

/** A payment gateway behind an interface, so ZarinPal or another PSP can replace the test gateway by configuration. */
export interface PaymentProvider {
  readonly name: string;
  /** registers a payment and returns where to send the buyer */
  start(input: { amountRial: number; description: string; callbackUrl: string }): Promise<{ authority: string; redirectUrl: string }>;
  /** asks the gateway whether the payment really went through (never trust the browser's redirect alone) */
  verify(input: { authority: string; amountRial: number; callbackStatus: string }): Promise<{ ok: boolean; refId?: string }>;
}

export const PAYMENT_PROVIDER = Symbol.for("nobar.payment.provider");

/**
 * Test gateway for development and the seminar demo: the API itself serves a small page where the
 * buyer chooses "pay" or "cancel". It never moves real money and is refused in production.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";
  constructor(private readonly publicUrl: string) {}

  async start(): Promise<{ authority: string; redirectUrl: string }> {
    const authority = `FAKE-${randomToken(18)}`;
    return { authority, redirectUrl: `${this.publicUrl}/v1/payments/fake/${encodeURIComponent(authority)}` };
  }

  async verify(input: { authority: string; callbackStatus: string }): Promise<{ ok: boolean; refId?: string }> {
    return input.callbackStatus === "OK" ? { ok: true, refId: `REF-${input.authority.slice(5, 15)}` } : { ok: false };
  }
}

/** The gateway could not be reached or answered something unexpected: the payment is neither confirmed nor failed. */
export class GatewayUnavailableError extends UpstreamError {
  constructor(cause: string) {
    super("payment-gateway", 503, "GATEWAY_UNAVAILABLE", "درگاه پرداخت پاسخ نداد؛ چند لحظه‌ی دیگر دوباره تلاش کنید. اگر مبلغی کسر شده باشد و تأیید نشود، بانک آن را برمی‌گرداند.", { cause });
  }
}

interface ZarinpalReply {
  data?: { code?: number; authority?: string; ref_id?: number | string } | unknown[];
  errors?: { code?: number; message?: string } | unknown[];
}

/** Verify codes that mean "this payment did not happen" (amount mismatch, unpaid, unknown or foreign authority). */
const ZARINPAL_NOT_PAID = new Set([-50, -51, -52, -53, -54, -55]);

/**
 * ZarinPal payment gateway (REST v4). The buyer pays on ZarinPal and comes back to our callback with
 * `Authority` and `Status`; the money counts only after `verify` confirms it server-side with the amount
 * we expect. Amounts are sent in Rial (`currency: "IRR"`).
 */
export class ZarinpalPaymentProvider implements PaymentProvider {
  readonly name = "zarinpal";
  private readonly base: string;

  constructor(
    private readonly merchantId: string,
    opts: { sandbox?: boolean; baseUrl?: string } = {},
  ) {
    this.base = (opts.baseUrl ?? (opts.sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com")).replace(/\/$/, "");
  }

  /** One POST; the gateway also answers business errors with 4xx and a JSON body, so the body is read either way. */
  private async post(path: string, body: Record<string, unknown>): Promise<{ code: number | undefined; data: { authority?: string; ref_id?: number | string } }> {
    let reply: ZarinpalReply;
    try {
      const res = await fetch(`${this.base}/pg/v4/payment/${path}.json`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ merchant_id: this.merchantId, ...body }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      reply = (await res.json()) as ZarinpalReply;
    } catch (e) {
      throw new GatewayUnavailableError(`ZarinPal ${path} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const data = reply.data && !Array.isArray(reply.data) ? reply.data : {};
    const errors = reply.errors && !Array.isArray(reply.errors) ? reply.errors : {};
    return { code: data.code ?? errors.code, data };
  }

  async start(input: { amountRial: number; description: string; callbackUrl: string }): Promise<{ authority: string; redirectUrl: string }> {
    const r = await this.post("request", { amount: input.amountRial, currency: "IRR", description: input.description, callback_url: input.callbackUrl });
    if (r.code !== 100 || !r.data.authority) throw new GatewayUnavailableError(`ZarinPal refused the payment request (code ${r.code ?? "?"})`);
    return { authority: r.data.authority, redirectUrl: `${this.base}/pg/StartPay/${encodeURIComponent(r.data.authority)}` };
  }

  async verify(input: { authority: string; amountRial: number; callbackStatus: string }): Promise<{ ok: boolean; refId?: string }> {
    // the buyer cancelled or the bank refused: nothing to verify
    if (input.callbackStatus !== "OK") return { ok: false };
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await this.post("verify", { amount: input.amountRial, authority: input.authority });
        // 101: already verified (a repeated callback)
        if (r.code === 100 || r.code === 101) return { ok: true, ...(r.data.ref_id === undefined ? {} : { refId: String(r.data.ref_id) }) };
        if (r.code !== undefined && ZARINPAL_NOT_PAID.has(r.code)) return { ok: false };
        // anything else (merchant or request problem) must not be mistaken for an unpaid order
        throw new GatewayUnavailableError(`ZarinPal verify answered code ${r.code ?? "?"}`);
      } catch (e) {
        last = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    throw last;
  }
}

/** Picks the gateway by configuration. A new gateway is one more class here and one more name in `PAYMENT_PROVIDER`. */
export function createPaymentProvider(config: ApiConfig): PaymentProvider {
  if (config.PAYMENT_PROVIDER === "zarinpal") {
    if (!config.ZARINPAL_MERCHANT_ID) throw new Error("ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal");
    return new ZarinpalPaymentProvider(config.ZARINPAL_MERCHANT_ID, { sandbox: config.ZARINPAL_SANDBOX === "true", ...(config.ZARINPAL_BASE_URL ? { baseUrl: config.ZARINPAL_BASE_URL } : {}) });
  }
  return new FakePaymentProvider(config.API_PUBLIC_URL);
}
