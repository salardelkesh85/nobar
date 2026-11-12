import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { type AuthUser, CurrentUser, Roles, ZodPipe } from "@nobar/common";
import { ListingCreateSchema, ListingUpdateSchema, PriceUpdateSchema, ProduceTypeUpdateSchema, ReasonSchema, ShopApplySchema, ShopUpdateSchema, StockUpdateSchema } from "@nobar/contracts";
import type { z } from "zod";
import type { Actor } from "../audit/audit.service";
import { SellerCatalogService } from "./seller-catalog.service";

/** Seller panel: the signed-in user's own shop and listings (object-level checks in the service). */
@Controller("v1/seller")
export class SellerCatalogController {
  constructor(@Inject(SellerCatalogService) private readonly seller: SellerCatalogService) {}

  @Get("shop")
  shop(@CurrentUser() user: AuthUser) {
    return this.seller.myShop(user.id);
  }

  /** Apply for a shop (or re-apply after a rejection); staff review it before it opens. */
  @Post("shop")
  apply(@CurrentUser() user: AuthUser, @Body(new ZodPipe(ShopApplySchema)) body: z.infer<typeof ShopApplySchema>) {
    return this.seller.apply(user.id, body);
  }

  @Patch("shop")
  update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(ShopUpdateSchema)) body: z.infer<typeof ShopUpdateSchema>) {
    return this.seller.updateShop(user.id, body);
  }

  @Get("listings")
  listings(@CurrentUser() user: AuthUser) {
    return this.seller.myListings(user.id);
  }

  @Post("listings")
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(ListingCreateSchema)) body: z.infer<typeof ListingCreateSchema>) {
    return this.seller.createListing(user.id, body);
  }

  @Patch("listings/:id")
  edit(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ListingUpdateSchema)) body: z.infer<typeof ListingUpdateSchema>) {
    return this.seller.updateListing(user.id, id, body);
  }

  @Patch("listings/:id/stock")
  stock(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(StockUpdateSchema)) body: z.infer<typeof StockUpdateSchema>) {
    return this.seller.setStock(user.id, id, body.stockBase);
  }

  @Patch("listings/:id/prices")
  prices(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(PriceUpdateSchema)) body: z.infer<typeof PriceUpdateSchema>) {
    return this.seller.setPrices(user.id, id, body.prices);
  }

  @Post("listings/:id/pause")
  pause(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.seller.pause(user.id, id);
  }

  @Post("listings/:id/resume")
  resume(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.seller.resume(user.id, id);
  }
}

const staff = (user: AuthUser): Actor => ({ userId: user.id, label: "پشتیبانی" });

/** Staff review: KYC queue, shop approval, listing moderation. ADMIN role only. */
@Roles("ADMIN")
@Controller("v1/admin")
export class AdminCatalogController {
  constructor(@Inject(SellerCatalogService) private readonly seller: SellerCatalogService) {}

  @Get("kyc")
  kyc() {
    return this.seller.kycQueue();
  }

  @Get("shops")
  shops() {
    return this.seller.shopsForStaff();
  }

  @Patch("produce-types/:id")
  produceType(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ProduceTypeUpdateSchema)) body: z.infer<typeof ProduceTypeUpdateSchema>) {
    return this.seller.updateProduceType(staff(user), id, body);
  }

  @Post("shops/:id/approve")
  async approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.seller.approveShop(staff(user), id);
    return { ok: true };
  }

  @Post("shops/:id/reject")
  async reject(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReasonSchema)) body: z.infer<typeof ReasonSchema>) {
    await this.seller.rejectShop(staff(user), id, body.reason);
    return { ok: true };
  }

  @Post("shops/:id/suspend")
  async suspend(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReasonSchema)) body: z.infer<typeof ReasonSchema>) {
    await this.seller.suspendShop(staff(user), id, body.reason);
    return { ok: true };
  }

  @Get("moderation")
  moderation() {
    return this.seller.moderationQueue();
  }

  @Post("listings/:id/approve")
  async approveListing(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.seller.approveListing(staff(user), id);
    return { ok: true };
  }

  @Post("listings/:id/reject")
  async rejectListing(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReasonSchema)) body: z.infer<typeof ReasonSchema>) {
    await this.seller.rejectListing(staff(user), id, body.reason);
    return { ok: true };
  }

  @Post("moderation/:id/close")
  async closeCase(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.seller.closeCase(staff(user), id);
    return { ok: true };
  }
}
