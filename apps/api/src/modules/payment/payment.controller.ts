import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { type AuthUser, CurrentUser, Public } from "@nobar/common";
import { formatToman } from "@nobar/fa";
import type { FastifyReply } from "fastify";
import { PaymentService } from "./payment.service";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

@Controller("v1")
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  /** The buyer's wallet: refunds land here (kit scope: refunds to an in-app wallet). */
  @Get("me/wallet")
  wallet(@CurrentUser() user: AuthUser) {
    return this.payments.wallet(user.id);
  }

  /** Test gateway page (PAYMENT_PROVIDER=fake only): pay or cancel, then back to the shop through the callback. */
  @Public()
  @Get("payments/fake/:authority")
  async fakeGateway(@Param("authority") authority: string, @Res() reply: FastifyReply) {
    const p = await this.payments.byAuthority(authority);
    const body = !p
      ? `<p>این پرداخت پیدا نشد.</p>`
      : p.status !== "INITIATED"
        ? `<p>این پرداخت قبلاً انجام یا لغو شده است.</p>`
        : `<p class="amount">${esc(formatToman(p.amountRial))}</p>
           <p class="note">درگاه آزمایشی نوبر — پول واقعی جابه‌جا نمی‌شود.</p>
           <a class="pay" href="../callback?Authority=${encodeURIComponent(authority)}&amp;Status=OK">پرداخت</a>
           <a class="cancel" href="../callback?Authority=${encodeURIComponent(authority)}&amp;Status=NOK">انصراف</a>`;
    void reply
      .header("content-type", "text/html; charset=utf-8")
      .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'")
      .send(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>درگاه پرداخت آزمایشی نوبر</title>
<style>body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f4f5f4;color:#1b1f1c;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;border:1px solid #dfe3df;border-radius:12px;padding:24px;width:min(360px,calc(100% - 32px));text-align:center}
h1{font-size:18px;color:#14532d}.amount{font-size:26px;font-weight:800}.note{color:#5b635d;font-size:13px}
a{display:block;margin-top:12px;padding:12px;border-radius:8px;text-decoration:none;font-weight:700}
.pay{background:#2e7d32;color:#fff}.cancel{border:1px solid #c9cfc9;color:#1b1f1c}</style></head>
<body><main><h1>درگاه پرداخت آزمایشی</h1>${body}</main></body></html>`);
  }
}
