import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import { type AuthUser, CurrentUser, notFound, Public, ZodPipe } from "@nobar/common";
import {
  AddressCreateSchema,
  AddressUpdateSchema,
  type AuthTokensDto,
  isUuid,
  OtpRequestSchema,
  OtpVerifySchema,
  RefreshSchema,
  UpdateMeSchema,
} from "@nobar/contracts";
import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { KEY_STORE, type KeyStore } from "./keys";
import { type OtpSent, OtpService } from "./otp.service";
import { SessionsService } from "./sessions.service";
import { UsersService } from "./users.service";

const addressId = (id: string) => {
  if (!isUuid(id)) throw notFound("آدرس");
  return id;
};

@Controller()
export class IdentityController {
  constructor(
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(KEY_STORE) private readonly keys: KeyStore,
  ) {}

  @Public()
  @Get(".well-known/jwks.json")
  jwks() {
    return this.keys.jwks();
  }

  /** Step 1 of sign-in: send a one-time code by SMS. */
  @Public()
  @Post("v1/auth/otp")
  @HttpCode(200)
  requestOtp(@Body(new ZodPipe(OtpRequestSchema)) body: z.infer<typeof OtpRequestSchema>, @Req() req: FastifyRequest): Promise<OtpSent> {
    return this.otp.request(body.phone, req.ip);
  }

  /** Step 2: check the code; signs the user in (and registers them on first sign-in). */
  @Public()
  @Post("v1/auth/verify")
  @HttpCode(200)
  async verify(@Body(new ZodPipe(OtpVerifySchema)) body: z.infer<typeof OtpVerifySchema>): Promise<AuthTokensDto & { isNew: boolean }> {
    await this.otp.verify(body.phone, body.code);
    const { user, created } = await this.users.signIn(body.phone);
    return { ...(await this.sessions.start(user)), isNew: created };
  }

  @Public()
  @Post("v1/auth/refresh")
  @HttpCode(200)
  refresh(@Body(new ZodPipe(RefreshSchema)) body: z.infer<typeof RefreshSchema>): Promise<AuthTokensDto> {
    return this.sessions.refresh(body.refreshToken);
  }

  @Public()
  @Post("v1/auth/logout")
  @HttpCode(204)
  async logout(@Body(new ZodPipe(RefreshSchema)) body: z.infer<typeof RefreshSchema>): Promise<void> {
    await this.sessions.end(body.refreshToken);
  }

  @Get("v1/me")
  me(@CurrentUser() user: AuthUser) {
    return this.users.get(user.id);
  }

  @Patch("v1/me")
  updateMe(@CurrentUser() user: AuthUser, @Body(new ZodPipe(UpdateMeSchema)) body: z.infer<typeof UpdateMeSchema>) {
    return this.users.update(user.id, body);
  }

  @Get("v1/me/addresses")
  addresses(@CurrentUser() user: AuthUser) {
    return this.users.addresses(user.id);
  }

  @Post("v1/me/addresses")
  addAddress(@CurrentUser() user: AuthUser, @Body(new ZodPipe(AddressCreateSchema)) body: z.infer<typeof AddressCreateSchema>) {
    return this.users.addAddress(user.id, body);
  }

  @Patch("v1/me/addresses/:id")
  updateAddress(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(AddressUpdateSchema)) body: z.infer<typeof AddressUpdateSchema>) {
    return this.users.updateAddress(user.id, addressId(id), body);
  }

  @Delete("v1/me/addresses/:id")
  @HttpCode(204)
  removeAddress(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    return this.users.removeAddress(user.id, addressId(id));
  }
}
