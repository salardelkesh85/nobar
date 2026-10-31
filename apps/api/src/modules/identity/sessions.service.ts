import { Inject, Injectable } from "@nestjs/common";
import { AppError, type Database, randomToken, sha256, type Sql, TOKENS } from "@nobar/common";
import { type AuthTokensDto, type UserDto, uuidv7 } from "@nobar/contracts";
import type { ApiConfig } from "../../config";
import { KEY_STORE, type KeyStore } from "./keys";
import { UsersService } from "./users.service";

type Rotation = { ok: true; userId: string; familyId: string } | { ok: false; code: string; message: string };

/**
 * Short-lived ES256 access tokens + rotating refresh tokens (docs/domain.md §2):
 * refresh tokens are stored hashed, rotated on every use, and reuse of a rotated token revokes its family.
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
    @Inject(KEY_STORE) private readonly keys: KeyStore,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  private async storeRefresh(sql: Sql, userId: string, familyId: string): Promise<{ id: string; token: string }> {
    const id = uuidv7();
    const token = randomToken();
    await sql.query(
      `insert into identity.refresh_tokens (id, user_id, family_id, token_hash, expires_at)
       values ($1, $2, $3, $4, now() + make_interval(days => $5))`,
      [id, userId, familyId, sha256(token), this.config.REFRESH_TTL_DAYS],
    );
    return { id, token };
  }

  private async tokens(user: UserDto, refreshToken: string): Promise<AuthTokensDto> {
    const accessToken = await this.keys.sign({ roles: user.roles, ...(user.cityId ? { city: user.cityId } : {}) }, user.id, {
      issuer: this.config.JWT_ISSUER,
      audience: this.config.JWT_AUDIENCE,
      ttlSec: this.config.ACCESS_TTL_SEC,
    });
    return { accessToken, refreshToken, expiresIn: this.config.ACCESS_TTL_SEC, user };
  }

  /** New session (new token family) after a verified OTP. */
  async start(user: UserDto): Promise<AuthTokensDto> {
    const { token } = await this.db.tx((sql) => this.storeRefresh(sql, user.id, uuidv7()));
    return this.tokens(user, token);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const result = await this.db.tx<Rotation & { token?: string }>(async (sql) => {
      const [t] = await sql.query<{ id: string; user_id: string; family_id: string; revoked: boolean; expired: boolean }>(
        `select id, user_id, family_id, revoked_at is not null as revoked, expires_at <= now() as expired
         from identity.refresh_tokens where token_hash = $1 for update`,
        [sha256(refreshToken)],
      );
      if (!t) return { ok: false, code: "REFRESH_INVALID", message: "نشست معتبر نیست؛ دوباره وارد شوید" };
      if (t.revoked) {
        // a rotated token came back: someone else may hold the family, so end all of it
        await sql.query("update identity.refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null", [t.family_id]);
        return { ok: false, code: "REFRESH_REUSED", message: "نشست شما برای امنیت بسته شد؛ دوباره وارد شوید" };
      }
      if (t.expired) return { ok: false, code: "REFRESH_EXPIRED", message: "نشست شما منقضی شده است؛ دوباره وارد شوید" };
      const next = await this.storeRefresh(sql, t.user_id, t.family_id);
      await sql.query("update identity.refresh_tokens set revoked_at = now(), replaced_by = $2 where id = $1", [t.id, next.id]);
      return { ok: true, userId: t.user_id, familyId: t.family_id, token: next.token };
    });
    if (!result.ok) throw new AppError(401, result.code, result.message);
    return this.tokens(await this.users.get(result.userId), result.token!);
  }

  /** Sign-out ends the whole session family of this refresh token. */
  async end(refreshToken: string): Promise<void> {
    await this.db.query(
      `update identity.refresh_tokens set revoked_at = now()
       where revoked_at is null and family_id = (select family_id from identity.refresh_tokens where token_hash = $1)`,
      [sha256(refreshToken)],
    );
  }
}
