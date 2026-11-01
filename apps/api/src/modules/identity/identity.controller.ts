import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, Res } from "@nestjs/common";
import { ACCESS_COOKIE, type AuthUser, clearSessionCookie, CurrentUser, notFound, Public, readCookie, REFRESH_COOKIE, sessionCookie, TOKENS, unauthorized, ZodPipe } from "@nobar/common";
import {
  AddressCreateSchema,
  AddressUpdateSchema,
  type AuthSessionDto,
  isUuid,
  OtpRequestSchema,
  OtpVerifySchema,
  UpdateMeSchema,
} from "@nobar/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { KEY_STORE, type KeyStore } from "./keys";
import { type OtpSent, OtpService } from "./otp.service";
import { SessionsService } from "./sessions.service";
import { UsersService } from "./users.service";
import { type ApiConfig, secureSessionCookies } from "../../config";

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
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
  ) {}

  private cookieOptions() {
    const sameSite = `${this.config.SESSION_COOKIE_SAME_SITE[0]!.toUpperCase()}${this.config.SESSION_COOKIE_SAME_SITE.slice(1)}` as "Strict" | "Lax" | "None";
    return { secure: secureSessionCookies(this.config), sameSite };
  }

  private setSession(reply: FastifyReply, tokens: Awaited<ReturnType<SessionsService["start"]>>) {
    const options = this.cookieOptions();
    void reply.header("set-cookie", [
      sessionCookie(ACCESS_COOKIE, tokens.accessToken, { ...options, maxAgeSec: tokens.expiresIn }),
      sessionCookie(REFRESH_COOKIE, tokens.refreshToken, { ...options, maxAgeSec: this.config.REFRESH_TTL_DAYS * 86_400, path: "/v1/auth" }),
    ]);
  }

  private clearSession(reply: FastifyReply) {
    const options = this.cookieOptions();
    void reply.header("set-cookie", [
      clearSessionCookie(ACCESS_COOKIE, options),
      clearSessionCookie(REFRESH_COOKIE, { ...options, path: "/v1/auth" }),
    ]);
  }

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
  async verify(@Body(new ZodPipe(OtpVerifySchema)) body: z.infer<typeof OtpVerifySchema>, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthSessionDto & { isNew: boolean }> {
    await this.otp.verify(body.phone, body.code);
    const { user, created } = await this.users.signIn(body.phone);
    const tokens = await this.sessions.start(user);
    this.setSession(reply, tokens);
    return { expiresIn: tokens.expiresIn, user: tokens.user, isNew: created };
  }

  @Public()
  @Post("v1/auth/refresh")
  @HttpCode(200)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthSessionDto> {
    const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
    if (!refreshToken) throw unauthorized("نشست معتبر نیست؛ دوباره وارد شوید");
    const tokens = await this.sessions.refresh(refreshToken);
    this.setSession(reply, tokens);
    return { expiresIn: tokens.expiresIn, user: tokens.user };
  }

  @Public()
  @Post("v1/auth/logout")
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
    if (refreshToken) await this.sessions.end(refreshToken);
    this.clearSession(reply);
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
