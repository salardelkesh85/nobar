import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { type AuthUser, CurrentUser, idempotent, type Database, TOKENS, ZodPipe } from "@nobar/common";
import { CartAddListingSchema, CartSetSchema } from "@nobar/contracts";
import { CITIES, DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import { z } from "zod";
import { CartService } from "./cart.service";

const DESTINATIONS = CITIES.filter((city) => city.destination).map((city) => city.id) as [string, ...string[]];
const Dest = z.enum(DESTINATIONS, { error: "شهر مقصد پشتیبانی نمی‌شود" }).default(DEFAULT_CITY_ID);
const CartQuery = z.object({ dest: Dest });
const Id = z.string().trim().min(1).max(100);

@Controller("v1/cart")
export class CartController {
  constructor(@Inject(CartService) private readonly cart: CartService, @Inject(TOKENS.DB) private readonly db: Database) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query(new ZodPipe(CartQuery)) query: z.infer<typeof CartQuery>) {
    return this.cart.get(user.id, query.dest);
  }

  @Post("items")
  async add(
    @CurrentUser() user: AuthUser,
    @Headers("idempotency-key") key: string | undefined,
    @Body(new ZodPipe(CartAddListingSchema)) body: z.infer<typeof CartAddListingSchema>,
    @Query(new ZodPipe(CartQuery)) query: z.infer<typeof CartQuery>,
  ) {
    const request = { ...body, dest: query.dest };
    const result = await idempotent(this.db, `cart:add:${user.id}`, key, request, () => this.cart.add(user.id, body.listingId, body.packageId, body.qty, query.dest));
    return result.body;
  }

  @Patch("items")
  set(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CartSetSchema)) body: z.infer<typeof CartSetSchema>, @Query(new ZodPipe(CartQuery)) query: z.infer<typeof CartQuery>) {
    return this.cart.set(user.id, body.listingId, body.packageId, body.qty, query.dest);
  }

  @Delete("items/:listingId/:packageId")
  remove(@CurrentUser() user: AuthUser, @Param("listingId") listingId: string, @Param("packageId") packageId: string, @Query(new ZodPipe(CartQuery)) query: z.infer<typeof CartQuery>) {
    return this.cart.remove(user.id, Id.parse(listingId), Id.parse(packageId), query.dest);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser, @Query(new ZodPipe(CartQuery)) query: z.infer<typeof CartQuery>) {
    return this.cart.clear(user.id, query.dest);
  }
}
