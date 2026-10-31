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

async function call(method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${api.url}${path}`, {
    method,
    headers: { "x-forwarded-for": randomIp(), ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
}

async function signIn(phone = newPhone()) {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  expect(sent.status).toBe(200);
  const v = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  expect(v.status).toBe(200);
  return v.body as { accessToken: string; refreshToken: string; isNew: boolean; user: { id: string; roles: string[]; name: string | null } };
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
    expect((await call("GET", "/healthz")).body).toMatchObject({ status: "ok", service: "api" });
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
    expect(rows.map((r) => r.token_hash)).not.toContain(s.body.refreshToken);
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
    const r1 = await call("POST", "/v1/auth/refresh", { refreshToken: s.refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).not.toBe(s.refreshToken);
    expect((await call("GET", "/v1/me", undefined, r1.body.accessToken)).status).toBe(200);

    const reuse = await call("POST", "/v1/auth/refresh", { refreshToken: s.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("REFRESH_REUSED");
    // the token issued after the stolen one is dead too
    expect((await call("POST", "/v1/auth/refresh", { refreshToken: r1.body.refreshToken })).status).toBe(401);
  });

  it("ends the session on sign-out", async () => {
    const s = await signIn();
    expect((await call("POST", "/v1/auth/logout", { refreshToken: s.refreshToken })).status).toBe(204);
    expect((await call("POST", "/v1/auth/refresh", { refreshToken: s.refreshToken })).status).toBe(401);
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
    const r = await call("PATCH", "/v1/me", { name: "سالار", cityId: "urmia" }, s.accessToken);
    expect(r.body).toMatchObject({ name: "سالار", cityId: "urmia" });
    expect((await call("PATCH", "/v1/me", { cityId: "atlantis" }, s.accessToken)).status).toBe(400);
  });

  it("adds, edits and removes addresses, normalising digits", async () => {
    const s = await signIn();
    const add = await call("POST", "/v1/me/addresses", address, s.accessToken);
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ phone: "+989141234567", postalCode: "5971812345", cityId: "miandoab" });

    const upd = await call("PATCH", `/v1/me/addresses/${add.body.id}`, { title: "محل کار" }, s.accessToken);
    expect(upd.body).toMatchObject({ title: "محل کار", line: address.line });
    expect((await call("GET", "/v1/me/addresses", undefined, s.accessToken)).body).toHaveLength(1);

    expect((await call("DELETE", `/v1/me/addresses/${add.body.id}`, undefined, s.accessToken)).status).toBe(204);
    expect((await call("GET", "/v1/me/addresses", undefined, s.accessToken)).body).toHaveLength(0);
  });

  it("validates addresses like the store's form", async () => {
    const s = await signIn();
    const r = await call("POST", "/v1/me/addresses", { ...address, postalCode: "123" }, s.accessToken);
    expect(r.status).toBe(400);
    expect(r.body.detail).toBe("کد پستی ۱۰ رقم است");
  });

  it("keeps each user's addresses private", async () => {
    const a = await signIn();
    const b = await signIn();
    const add = await call("POST", "/v1/me/addresses", address, a.accessToken);
    expect((await call("DELETE", `/v1/me/addresses/${add.body.id}`, undefined, b.accessToken)).status).toBe(404);
    expect((await call("PATCH", `/v1/me/addresses/${add.body.id}`, { title: "x" }, b.accessToken)).status).toBe(404);
    expect((await call("DELETE", "/v1/me/addresses/not-a-uuid", undefined, a.accessToken)).status).toBe(404);
  });
});

describe("CORS", () => {
  it("answers preflight only for the configured apps", async () => {
    const ok = await call("OPTIONS", "/v1/me", undefined, undefined, { origin: "http://localhost:3000", "access-control-request-method": "GET" });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await call("GET", "/healthz", undefined, undefined, { origin: "https://evil.example" });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
