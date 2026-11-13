import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";

let api: RunningService<ApiConfig>;
let n = 0;
/** a fresh phone per test, so cooldowns and limits don't leak between tests */
const newPhone = () => `0912${String(++n).padStart(7, "0")}`;
const e164 = (p: string) => `+98${p.slice(1)}`;
/** a different client IP per request (forwarded by the trusted loopback "proxy"), unless a test sets one */
const randomIp = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 250)}`;

const setCookies = (headers: Headers): string[] => {
  const values = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  return values?.length ? values : (headers.get("set-cookie")?.split(/,\s*(?=nobar_)/) ?? []);
};
const cookieValue = (cookies: string[], name: string) => cookies.map((value) => value.split(";", 1)[0]!).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const cookieHeader = (cookies: string[]) => cookies.map((value) => value.split(";", 1)[0]).join("; ");

async function call(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${api.url}${path}`, {
    method,
    headers: { "x-forwarded-for": randomIp(), ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const cookies = setCookies(res.headers);
  return { status: res.status, headers: res.headers, cookies, cookie: cookieHeader(cookies), body: text ? JSON.parse(text) : undefined };
}

async function signIn(phone = newPhone()) {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  expect(sent.status).toBe(200);
  const v = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  expect(v.status).toBe(200);
  return {
    ...(v.body as { isNew: boolean; user: { id: string; roles: string[]; name: string | null } }),
    cookie: v.cookie,
    refreshToken: cookieValue(v.cookies, "nobar_refresh")!,
  };
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: {
      PORT: String(40_000 + Math.floor(Math.random() * 10_000)),
      DATA_DIR: "memory",
      LOG_LEVEL: "silent",
      NODE_ENV: "test",
      OTP_ECHO: "true",
      ADMIN_PHONES: "09120000000",
      CORS_ORIGINS: "http://localhost:3000",
    },
  });
});
afterAll(async () => {
  await api?.stop();
});

describe("health", () => {
  it("answers liveness and readiness", async () => {
    const health = await call("GET", "/healthz");
    expect(health.body).toMatchObject({ status: "ok", service: "api" });
    expect(health.headers.get("x-content-type-options")).toBe("nosniff");
    expect(health.headers.get("x-frame-options")).toBe("DENY");
    expect(health.headers.get("referrer-policy")).toBe("no-referrer");
    expect((await call("GET", "/readyz")).body).toMatchObject({ status: "ready", checks: { db: true } });
  });
});

describe("OTP sign-in", () => {
  it("signs a new user in, then recognises them", async () => {
    const phone = newPhone();
    const first = await signIn(phone);
    expect(first.isNew).toBe(true);
    expect(first.user.roles).toEqual(["BUYER"]);
    expect(first.user.name).toBeNull();
    // the cooldown is per challenge; a used challenge is gone, so signing in again works
    const again = await signIn(phone);
    expect(again.isNew).toBe(false);
    expect(again.user.id).toBe(first.user.id);
  });

  it("accepts Persian digits and any phone format", async () => {
    const sent = await call("POST", "/v1/auth/otp", { phone: "۰۹۳۵۱۲۳۴۵۶۷" });
    const code = String(sent.body.devCode).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
    const v = await call("POST", "/v1/auth/verify", { phone: "+98 935 123 4567", code });
    expect(v.status).toBe(200);
  });

  it("rejects an invalid phone with a Persian message", async () => {
    const r = await call("POST", "/v1/auth/otp", { phone: "12345" });
    expect(r.status).toBe(400);
    expect(r.body.detail).toContain("موبایل");
  });

  it("enforces the resend cooldown", async () => {
    const phone = newPhone();
    expect((await call("POST", "/v1/auth/otp", { phone })).status).toBe(200);
    const again = await call("POST", "/v1/auth/otp", { phone });
    expect(again.status).toBe(429);
    expect(Number(again.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("allows at most 5 attempts per code", async () => {
    const phone = newPhone();
    const { body } = await call("POST", "/v1/auth/otp", { phone });
    const wrong = body.devCode === "000000" ? "111111" : "000000";
    for (let i = 1; i <= 4; i++) expect((await call("POST", "/v1/auth/verify", { phone, code: wrong })).body.code).toBe("OTP_INVALID");
    expect((await call("POST", "/v1/auth/verify", { phone, code: wrong })).body.code).toBe("OTP_LOCKED");
    // even the right code no longer works
    const right = await call("POST", "/v1/auth/verify", { phone, code: body.devCode });
    expect(right.status).toBe(429);
    expect(right.body.code).toBe("OTP_LOCKED");
  });

  it("rejects an expired code", async () => {
    const phone = newPhone();
    const { body } = await call("POST", "/v1/auth/otp", { phone });
    await api.deps.db.query("update identity.otp_challenges set expires_at = now() - interval '1 second' where phone = $1", [e164(phone)]);
    expect((await call("POST", "/v1/auth/verify", { phone, code: body.devCode })).body.code).toBe("OTP_EXPIRED");
  });

  it("limits code requests per phone", async () => {
    const phone = newPhone();
    for (let i = 0; i < 5; i++) {
      expect((await call("POST", "/v1/auth/otp", { phone })).status).toBe(200);
      await api.deps.db.query("delete from identity.otp_challenges where phone = $1", [e164(phone)]); // skip the cooldown
    }
    expect((await call("POST", "/v1/auth/otp", { phone })).status).toBe(429);
  });

  it("limits code requests per IP", async () => {
    const ip = { "x-forwarded-for": "10.99.99.99" };
    for (let i = 0; i < 20; i++) expect((await call("POST", "/v1/auth/otp", { phone: newPhone() }, undefined, ip)).status).toBe(200);
    expect((await call("POST", "/v1/auth/otp", { phone: newPhone() }, undefined, ip)).status).toBe(429);
  });

  it("never stores raw codes or refresh tokens", async () => {
    const phone = newPhone();
    const { body } = await call("POST", "/v1/auth/otp", { phone });
    const [c] = await api.deps.db.query<{ code_hash: string }>("select code_hash from identity.otp_challenges where phone = $1", [e164(phone)]);
    expect(c!.code_hash).not.toContain(body.devCode);
    const s = await call("POST", "/v1/auth/verify", { phone, code: body.devCode });
    const rows = await api.deps.db.query<{ token_hash: string }>("select token_hash from identity.refresh_tokens where user_id = $1", [s.body.user.id]);
    expect(s.body).not.toHaveProperty("accessToken");
    expect(s.body).not.toHaveProperty("refreshToken");
    expect(rows.map((r) => r.token_hash)).not.toContain(cookieValue(s.cookies, "nobar_refresh"));
    expect(s.cookies.every((cookie) => cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax"))).toBe(true);
  });

  it("gives configured phones the ADMIN role", async () => {
    const s = await signIn("09120000000");
    expect(s.user.roles).toContain("ADMIN");
  });

  it("writes user.registered to the outbox in the same transaction", async () => {
    const s = await signIn();
    const rows = await api.deps.db.query<{ type: string; payload: { subject: string; data: { userId: string } } }>(
      "select type, payload from outbox where type = 'user.registered' and payload->>'subject' = $1",
      [s.user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload.data.userId).toBe(s.user.id);
  });
});

describe("sessions", () => {
  it("rotates refresh tokens and revokes the family when an old one is reused", async () => {
    const s = await signIn();
    const r1 = await call("POST", "/v1/auth/refresh", undefined, s.cookie);
    expect(r1.status).toBe(200);
    expect(cookieValue(r1.cookies, "nobar_refresh")).not.toBe(s.refreshToken);
    expect((await call("GET", "/v1/me", undefined, r1.cookie)).status).toBe(200);

    await api.deps.db.query("update identity.refresh_tokens set revoked_at = now() - interval '11 seconds' where replaced_by is not null and user_id = $1", [s.user.id]);
    const reuse = await call("POST", "/v1/auth/refresh", undefined, s.cookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("REFRESH_REUSED");
    // the token issued after the stolen one is dead too
    expect((await call("POST", "/v1/auth/refresh", undefined, r1.cookie)).status).toBe(401);
  });

  it("does not revoke a session for a concurrent refresh from another tab", async () => {
    const s = await signIn();
    const first = await call("POST", "/v1/auth/refresh", undefined, s.cookie);
    expect(first.status).toBe(200);
    const collision = await call("POST", "/v1/auth/refresh", undefined, s.cookie);
    expect(collision.status).toBe(409);
    expect(collision.body.code).toBe("REFRESH_RACE");
    expect((await call("POST", "/v1/auth/refresh", undefined, first.cookie)).status).toBe(200);
  });

  it("ends the session on sign-out", async () => {
    const s = await signIn();
    const logout = await call("POST", "/v1/auth/logout", undefined, s.cookie);
    expect(logout.status).toBe(204);
    expect(logout.cookies.every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
    expect((await call("POST", "/v1/auth/refresh", undefined, s.cookie)).status).toBe(401);
  });

  it("publishes the verification keys", async () => {
    const r = await call("GET", "/.well-known/jwks.json");
    expect(r.body.keys[0]).toMatchObject({ kty: "EC", alg: "ES256", use: "sig" });
    expect(r.body.keys[0].d).toBeUndefined();
  });
});

describe("profile and addresses", () => {
  const address = { title: "خانه", cityId: "miandoab", name: "سالار دلکش", phone: "۰۹۱۴۱۲۳۴۵۶۷", line: "خیابان امام، کوچه‌ی باغ، پلاک ۱۲", postalCode: "۵۹۷۱۸۱۲۳۴۵" };

  it("requires a token", async () => {
    const r = await call("GET", "/v1/me");
    expect(r.status).toBe(401);
    expect(r.headers.get("content-type")).toContain("application/problem+json");
  });

  it("updates the name and city", async () => {
    const s = await signIn();
    const r = await call("PATCH", "/v1/me", { name: "سالار", cityId: "urmia" }, s.cookie);
    expect(r.body).toMatchObject({ name: "سالار", cityId: "urmia" });
    expect((await call("PATCH", "/v1/me", { cityId: "atlantis" }, s.cookie)).status).toBe(400);
  });

  it("adds, edits and removes addresses, normalising digits", async () => {
    const s = await signIn();
    const add = await call("POST", "/v1/me/addresses", address, s.cookie);
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ phone: "+989141234567", postalCode: "5971812345", cityId: "miandoab" });

    const upd = await call("PATCH", `/v1/me/addresses/${add.body.id}`, { title: "محل کار" }, s.cookie);
    expect(upd.body).toMatchObject({ title: "محل کار", line: address.line });
    expect((await call("GET", "/v1/me/addresses", undefined, s.cookie)).body).toHaveLength(1);

    expect((await call("DELETE", `/v1/me/addresses/${add.body.id}`, undefined, s.cookie)).status).toBe(204);
    expect((await call("GET", "/v1/me/addresses", undefined, s.cookie)).body).toHaveLength(0);
  });

  it("validates addresses like the store's form", async () => {
    const s = await signIn();
    const r = await call("POST", "/v1/me/addresses", { ...address, postalCode: "123" }, s.cookie);
    expect(r.status).toBe(400);
    expect(r.body.detail).toBe("کد پستی ۱۰ رقم است");
  });

  it("keeps each user's addresses private", async () => {
    const a = await signIn();
    const b = await signIn();
    const add = await call("POST", "/v1/me/addresses", address, a.cookie);
    expect((await call("DELETE", `/v1/me/addresses/${add.body.id}`, undefined, b.cookie)).status).toBe(404);
    expect((await call("PATCH", `/v1/me/addresses/${add.body.id}`, { title: "x" }, b.cookie)).status).toBe(404);
    expect((await call("DELETE", "/v1/me/addresses/not-a-uuid", undefined, a.cookie)).status).toBe(404);
  });
});

describe("CORS", () => {
  it("answers preflight only for the configured apps", async () => {
    const ok = await call("OPTIONS", "/v1/me", undefined, undefined, { origin: "http://localhost:3000", "access-control-request-method": "GET" });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(ok.headers.get("access-control-allow-credentials")).toBe("true");
    const other = await call("GET", "/healthz", undefined, undefined, { origin: "https://evil.example" });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects state changes from an untrusted browser origin", async () => {
    const session = await signIn();
    const allowed = await call("PATCH", "/v1/me", { name: "کاربر مجاز" }, session.cookie, { origin: "http://localhost:3000" });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
    const denied = await call("PATCH", "/v1/me", { name: "مهاجم" }, session.cookie, { origin: "https://evil.example" });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("ORIGIN_FORBIDDEN");
    const profile = await call("GET", "/v1/me", undefined, session.cookie);
    expect(profile.body.name).toBe("کاربر مجاز");
  });
});
