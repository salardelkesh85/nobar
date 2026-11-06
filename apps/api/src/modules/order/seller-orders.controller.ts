import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { type AuthUser, CurrentUser, ZodPipe } from "@nobar/common";
import { DisputeAnswerSchema, ReasonSchema, ShipSchema } from "@nobar/contracts";
import { z } from "zod";
import { PaymentService } from "../payment/payment.service";
import { FulfilmentService } from "./fulfilment.service";

const Status = z.object({
  status: z.enum(["AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "DISPUTED", "COMPLETED", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED"]).optional(),
});

/** Seller panel: only orders of shops this user owns (everything else is a 404). */
@Controller("v1/seller")
export class SellerOrdersController {
  constructor(
    @Inject(FulfilmentService) private readonly orders: FulfilmentService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @Get("orders")
  list(@CurrentUser() user: AuthUser, @Query(new ZodPipe(Status)) q: z.infer<typeof Status>) {
    return this.orders.sellerOrders(user.id, q.status);
  }

  @Post("orders/:id/accept")
  accept(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.accept(user.id, id);
  }

  @Post("orders/:id/reject")
  reject(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReasonSchema)) body: z.infer<typeof ReasonSchema>) {
    return this.orders.reject(user.id, id, body.reason);
  }

  @Post("orders/:id/ship")
  ship(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ShipSchema)) body: z.infer<typeof ShipSchema>) {
    return this.orders.ship(user.id, id, body.trackingCode);
  }

  @Post("orders/:id/dispute/answer")
  answer(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(DisputeAnswerSchema)) body: z.infer<typeof DisputeAnswerSchema>) {
    return this.orders.answerDispute(user.id, id, body.response, body.offerRial);
  }

  /** Settled balance and payouts of each owned shop. */
  @Get("balance")
  async balance(@CurrentUser() user: AuthUser) {
    const shops = await this.orders.sellerShops(user.id);
    return Promise.all(shops.map(async (shopId) => ({ shopId, ...(await this.payments.sellerBalance(shopId)) })));
  }
}
