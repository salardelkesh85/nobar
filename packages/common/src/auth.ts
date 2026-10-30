import { type CanActivate, createParamDecorator, type ExecutionContext, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@nobar/contracts";
import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { BaseConfig } from "./config";
import { currentContext } from "./context";
import { forbidden, unauthorized } from "./errors";
import { TOKENS } from "./tokens";
import { safeEqual } from "./util";

export interface AuthUser {
  id: string;
  roles: Role[];
  sellerId?: string;
  cityId?: string;
  /** the raw bearer token, forwarded when a service calls another on the user's behalf (AI tools) */
  token: string;
}

export type AuthedRequest = FastifyRequest & { user?: AuthUser };

/** Verifies access tokens issued by the identity service (ES256, keys from its JWKS endpoint). */
export class JwtVerifier {
  private readonly key: JWTVerifyGetKey;

  constructor(private readonly opts: { jwksUrl?: string; getKey?: JWTVerifyGetKey; issuer: string; audience: string }) {
    if (opts.getKey) this.key = opts.getKey;
    else if (opts.jwksUrl) this.key = createRemoteJWKSet(new URL(opts.jwksUrl), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 });
    else throw new Error("JwtVerifier needs jwksUrl or getKey");
  }

  async verify(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.key, { issuer: this.opts.issuer, audience: this.opts.audience, algorithms: ["ES256"] });
    if (!payload.sub) throw new Error("token without subject");
    return {
      id: payload.sub,
      roles: (payload.roles as Role[] | undefined) ?? [],
      sellerId: (payload.sid as string | undefined) ?? undefined,
      cityId: (payload.city as string | undefined) ?? undefined,
      token,
    };
  }
}

const IS_PUBLIC = "nobar:public";
const IS_INTERNAL = "nobar:internal";
const ROLES = "nobar:roles";

/** No authentication required (a valid token is still attached to req.user when present). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Service-to-service only: requires the shared x-internal-token header; never routed by the gateway. */
export const Internal = () => SetMetadata(IS_INTERNAL, true);
/** Requires one of the roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});

/** Global guard: authenticated by default, @Public/@Internal/@Roles refine it. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKENS.VERIFIER) private readonly verifier: JwtVerifier,
    @Inject(TOKENS.CONFIG) private readonly config: BaseConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL, targets) ?? false;
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets) ?? [];
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        req.user = await this.verifier.verify(header.slice(7));
        const c = currentContext();
        if (c) c.userId = req.user.id;
      } catch {
        if (!isPublic && !isInternal) throw unauthorized("نشست شما منقضی شده است؛ دوباره وارد شوید");
      }
    }

    if (isInternal) {
      const token = req.headers["x-internal-token"];
      if (typeof token !== "string" || !safeEqual(token, this.config.INTERNAL_TOKEN)) throw forbidden("فقط برای ارتباط داخلی سرویس‌ها");
      return true;
    }
    if (isPublic) return true;
    if (!req.user) throw unauthorized();
    if (roles.length && !roles.some((r) => req.user!.roles.includes(r))) throw forbidden();
    return true;
  }
}
