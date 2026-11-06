import { randomToken } from "@nobar/common";

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
