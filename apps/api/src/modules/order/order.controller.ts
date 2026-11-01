import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { type AuthUser, CurrentUser, type Database, idempotent, TOKENS, ZodPipe } from "@nobar/common";
import { CheckoutCreateSchema } from "@nobar/contracts";
import type { z } from "zod";
import { OrderService } from "./order.service";

@Controller("v1/checkouts")
export class OrderController {
  constructor(@Inject(OrderService) private readonly orders: OrderService, @Inject(TOKENS.DB) private readonly db: Database) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Headers("idempotency-key") key: string | undefined, @Body(new ZodPipe(CheckoutCreateSchema)) body: z.infer<typeof CheckoutCreateSchema>) {
    const result = await idempotent(this.db, `checkout:create:${user.id}`, key, body, () => this.orders.create(user.id, body.addressId, body.paymentMethod));
    return result.body;
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.get(user.id, id);
  }
}
