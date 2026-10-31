import { Inject, Injectable } from "@nestjs/common";
import { currentTraceparent, type Database, enqueueEvent, iso, notFound, type Sql, TOKENS } from "@nobar/common";
import { type AddressDto, makeEvent, normalizeIranPhone, type Role, type UserDto, uuidv7 } from "@nobar/contracts";
import type { ApiConfig } from "../../config";

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  roles: Role[];
  city_id: string | null;
  created_at: Date;
}

interface AddressRow {
  id: string;
  title: string;
  city_id: string;
  receiver_name: string;
  receiver_phone: string;
  line: string;
  postal_code: string;
}

export type AddressInput = Omit<AddressDto, "id">;

const toUser = (r: UserRow): UserDto => ({ id: r.id, phone: r.phone, name: r.name, roles: r.roles, cityId: r.city_id, createdAt: iso(r.created_at) });
const toAddress = (r: AddressRow): AddressDto => ({
  id: r.id,
  title: r.title,
  cityId: r.city_id,
  name: r.receiver_name,
  phone: r.receiver_phone,
  line: r.line,
  postalCode: r.postal_code,
});

const USER_COLS = "id, phone, name, roles, city_id, created_at";
const ADDRESS_COLS = "id, title, city_id, receiver_name, receiver_phone, line, postal_code";

@Injectable()
export class UsersService {
  private readonly adminPhones: Set<string>;

  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(TOKENS.CONFIG) config: ApiConfig,
  ) {
    this.adminPhones = new Set(
      config.ADMIN_PHONES.split(",")
        .map((p) => normalizeIranPhone(p))
        .filter((p): p is string => p !== null),
    );
  }

  private event(type: "user.registered" | "user.updated", u: UserDto) {
    return makeEvent(type, {
      source: "api/identity",
      subject: u.id,
      data: { userId: u.id, roles: u.roles, cityId: u.cityId },
      ...(u.cityId ? { cityId: u.cityId } : {}),
      ...(currentTraceparent() ? { traceparent: currentTraceparent()! } : {}),
    });
  }

  /** Sign-in: returns the user for this phone, creating it on first sign-in. */
  async signIn(phone: string): Promise<{ user: UserDto; created: boolean }> {
    return this.db.tx(async (sql) => {
      const roles: Role[] = this.adminPhones.has(phone) ? ["BUYER", "ADMIN"] : ["BUYER"];
      const inserted = await sql.query<UserRow>(
        `insert into identity.users (id, phone, roles) values ($1, $2, $3) on conflict (phone) do nothing returning ${USER_COLS}`,
        [uuidv7(), phone, roles],
      );
      if (inserted[0]) {
        const user = toUser(inserted[0]);
        await enqueueEvent(sql, this.event("user.registered", user));
        return { user, created: true };
      }
      const [row] = await sql.query<UserRow>(`select ${USER_COLS} from identity.users where phone = $1`, [phone]);
      if (!row) throw notFound("کاربر");
      if (this.adminPhones.has(phone) && !row.roles.includes("ADMIN")) return { user: await this.addRole(sql, row.id, "ADMIN"), created: false };
      return { user: toUser(row), created: false };
    });
  }

  private async addRole(sql: Sql, id: string, role: Role): Promise<UserDto> {
    const [row] = await sql.query<UserRow>(
      `update identity.users set roles = array_append(roles, $2), updated_at = now() where id = $1 returning ${USER_COLS}`,
      [id, role],
    );
    const user = toUser(row!);
    await enqueueEvent(sql, this.event("user.updated", user));
    return user;
  }

  async get(id: string): Promise<UserDto> {
    const [row] = await this.db.query<UserRow>(`select ${USER_COLS} from identity.users where id = $1`, [id]);
    if (!row) throw notFound("کاربر");
    return toUser(row);
  }

  async update(id: string, patch: { name?: string | undefined; cityId?: string | undefined }): Promise<UserDto> {
    return this.db.tx(async (sql) => {
      const [row] = await sql.query<UserRow>(
        `update identity.users set name = coalesce($2, name), city_id = coalesce($3, city_id), updated_at = now()
         where id = $1 returning ${USER_COLS}`,
        [id, patch.name ?? null, patch.cityId ?? null],
      );
      if (!row) throw notFound("کاربر");
      const user = toUser(row);
      await enqueueEvent(sql, this.event("user.updated", user));
      return user;
    });
  }

  async addresses(userId: string): Promise<AddressDto[]> {
    const rows = await this.db.query<AddressRow>(`select ${ADDRESS_COLS} from identity.addresses where user_id = $1 order by created_at`, [userId]);
    return rows.map(toAddress);
  }

  async addAddress(userId: string, a: AddressInput): Promise<AddressDto> {
    const [row] = await this.db.query<AddressRow>(
      `insert into identity.addresses (id, user_id, title, city_id, receiver_name, receiver_phone, line, postal_code)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning ${ADDRESS_COLS}`,
      [uuidv7(), userId, a.title, a.cityId, a.name, a.phone, a.line, a.postalCode],
    );
    return toAddress(row!);
  }

  async updateAddress(userId: string, id: string, a: Partial<AddressInput>): Promise<AddressDto> {
    const [row] = await this.db.query<AddressRow>(
      `update identity.addresses set
         title = coalesce($3, title), city_id = coalesce($4, city_id), receiver_name = coalesce($5, receiver_name),
         receiver_phone = coalesce($6, receiver_phone), line = coalesce($7, line), postal_code = coalesce($8, postal_code)
       where id = $1 and user_id = $2 returning ${ADDRESS_COLS}`,
      [id, userId, a.title ?? null, a.cityId ?? null, a.name ?? null, a.phone ?? null, a.line ?? null, a.postalCode ?? null],
    );
    if (!row) throw notFound("آدرس");
    return toAddress(row);
  }

  async removeAddress(userId: string, id: string): Promise<void> {
    const rows = await this.db.query("delete from identity.addresses where id = $1 and user_id = $2 returning id", [id, userId]);
    if (rows.length === 0) throw notFound("آدرس");
  }
}
