import { Body, Controller, Get, Headers, Inject, Param, Post, Query, Res } from "@nestjs/common";
import { type AuthUser, CurrentUser, type Database, idempotent, Public, TOKENS, ZodPipe } from "@nobar/common";
import { CheckoutCreateSchema, DisputeOpenSchema } from "@nobar/contracts";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { ApiConfig } from "../../config";
import { FulfilmentService } from "./fulfilment.service";
import { OrderService } from "./order.service";

const CallbackQuery = z.object({ Authority: z.string().min(1).max(200), Status: z.string().max(20).default("NOK") });

/** Buyer side: checkout, payment, own orders. */
@Controller("v1")
export class OrderController {
  constructor(
    @Inject(OrderService) private readonly checkouts: OrderService,
    @Inject(FulfilmentService) private readonly orders: FulfilmentService,
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post("checkouts")
  async create(@CurrentUser() user: AuthUser, @Headers("idempotency-key") key: string | undefined, @Body(new ZodPipe(CheckoutCreateSchema)) body: z.infer<typeof CheckoutCreateSchema>) {
    const result = await idempotent(this.db, `checkout:create:${user.id}`, key, body, () => this.checkouts.create(user.id, body.addressId, body.paymentMethod, body.shipping));
    return result.body;
  }

  @Get("checkouts/:id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.checkouts.get(user.id, id);
  }

  /** Starts a gateway payment; the app sends the buyer to `redirectUrl`. */
  @Post("checkouts/:id/pay")
  async pay(@CurrentUser() user: AuthUser, @Param("id") id: string, @Headers("idempotency-key") key: string | undefined) {
    return (await idempotent(this.db, `checkout:pay:${user.id}`, key, { id }, () => this.checkouts.pay(user.id, id))).body;
  }

  /** The gateway sends the buyer back here (ZarinPal-style `Authority` and `Status`); then on to the store. */
  @Public()
  @Get("payments/callback")
  async callback(@Query(new ZodPipe(CallbackQuery)) q: z.infer<typeof CallbackQuery>, @Res() reply: FastifyReply) {
    const r = await this.checkouts.confirmPayment(q.Authority, q.Status);
    const web = this.config.WEB_URL.replace(/\/$/, "");
    const target = r ? `${web}/order/?checkout=${encodeURIComponent(r.checkoutId)}&payment=${r.paid ? "ok" : "failed"}` : `${web}/cart/?payment=unknown`;
    void reply.status(303).header("location", target).send();
  }

  @Get("orders")
  list(@CurrentUser() user: AuthUser) {
    return this.orders.buyerOrders(user.id);
  }

  @Get("orders/:id")
  one(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.buyerOrder(user.id, id);
  }

  @Post("orders/:id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.cancel(user.id, id);
  }

  @Post("orders/:id/delivered")
  delivered(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.confirmDelivered({ role: "BUYER", userId: user.id }, id);
  }

  @Post("orders/:id/dispute")
  dispute(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(DisputeOpenSchema)) body: z.infer<typeof DisputeOpenSchema>) {
    return this.orders.openDispute(user.id, id, body);
  }
}
