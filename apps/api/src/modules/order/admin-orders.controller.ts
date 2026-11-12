import { Body, Controller, Get, Headers, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { type AuthUser, CurrentUser, type Database, idempotent, Roles, TOKENS, ZodPipe } from "@nobar/common";
import { DisputeResolveSchema } from "@nobar/contracts";
import { z } from "zod";
import { PaymentService } from "../payment/payment.service";
import { FulfilmentService } from "./fulfilment.service";

const Status = z.object({
  status: z.enum(["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "DISPUTED", "COMPLETED", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED"]).optional(),
});
const CommissionRule = z.object({
  scope: z.enum(["GLOBAL", "CATEGORY", "SHOP"]),
  scopeId: z.string().trim().min(1).max(80).nullable().default(null),
  rateBps: z.number().int().min(0).max(5_000),
  label: z.string().trim().min(2).max(80),
});

/** Staff: orders, disputes, money. ADMIN role only. */
@Roles("ADMIN")
@Controller("v1/admin")
export class AdminOrdersController {
  constructor(
    @Inject(FulfilmentService) private readonly orders: FulfilmentService,
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(TOKENS.DB) private readonly db: Database,
  ) {}

  @Get("orders")
  list(@Query(new ZodPipe(Status)) q: z.infer<typeof Status>) {
    return this.orders.adminOrders(q.status);
  }

  @Post("orders/:id/delivered")
  delivered(@Param("id") id: string) {
    return this.orders.confirmDelivered({ role: "ADMIN" }, id);
  }

  @Post("orders/:id/dispute/resolve")
  async resolve(@CurrentUser() user: AuthUser, @Param("id") id: string, @Headers("idempotency-key") key: string | undefined, @Body(new ZodPipe(DisputeResolveSchema)) body: z.infer<typeof DisputeResolveSchema>) {
    return (await idempotent(this.db, `dispute:resolve:${user.id}`, key, { id, ...body }, () => this.orders.resolveDispute(id, body.refundRial, body.note))).body;
  }

  @Get("finance")
  finance() {
    return this.payments.totals();
  }

  @Get("payouts")
  payoutOverview() {
    return this.payments.payoutOverview();
  }

  @Post("payouts")
  async payouts(@CurrentUser() user: AuthUser, @Headers("idempotency-key") key: string | undefined) {
    return (await idempotent(this.db, `payouts:${user.id}`, key, {}, () => this.payments.runPayouts(user.id))).body;
  }

  @Get("commission-rules")
  rules() {
    return this.payments.commissionRules();
  }

  @Put("commission-rules")
  async setRule(@Body(new ZodPipe(CommissionRule)) body: z.infer<typeof CommissionRule>) {
    await this.payments.setCommissionRule(body.scope, body.scopeId, body.rateBps, body.label);
    return this.payments.commissionRules();
  }
}
