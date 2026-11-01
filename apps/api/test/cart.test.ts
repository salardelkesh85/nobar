import { type RunningService, startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0913${String(++n).padStart(7, "0")}`;
const randomIp = () => `10.20.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
const setCookies = (headers: Headers): string[] => {
  const values = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  return values?.length ? values : (headers.get("set-cookie")?.split(/,\s*(?=nobar_)/) ?? []);
};
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
  const verified = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  expect(verified.status).toBe(200);
  return { cookie: verified.cookie, user: verified.body.user as { id: string } };
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(45_000 + Math.floor(Math.random() * 2_000)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", CORS_ORIGINS: "http://localhost:3000" },
  });
});
afterAll(async () => {
  await api?.stop();
});

describe("server cart", () => {
  const first = demo.LISTINGS.find((listing) => listing.id === "l101")!;
  const firstPackage = first.packages[0]!;

  it("requires an authenticated user and an idempotency key for add", async () => {
    const unauthenticated = await call("GET", "/v1/cart?dest=tehran");
    expect(unauthenticated.status).toBe(401);
    const session = await signIn();
    const missingKey = await call("POST", "/v1/cart/items?dest=tehran", { listingId: first.id, packageId: firstPackage.id, qty: 1 }, session.cookie);
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("adds, groups and replays an item without duplicating it", async () => {
    const session = await signIn();
    const body = { listingId: first.id, packageId: firstPackage.id, qty: 1 };
    const key = "cart-add-l101-0001";
    const added = await call("POST", "/v1/cart/items?dest=tehran", body, session.cookie, { "idempotency-key": key });
    expect(added.status).toBe(201);
    expect(added.body.groups).toHaveLength(1);
    expect(added.body.groups[0].lines[0]).toMatchObject({ listing: { id: first.id }, pkg: { id: firstPackage.id }, qty: 1 });
    expect(added.body.itemsRial).toBe(firstPackage.priceRial);

    const replay = await call("POST", "/v1/cart/items?dest=tehran", body, session.cookie, { "idempotency-key": key });
    expect(replay.status).toBe(201);
    expect(replay.body.itemCount).toBe(1);
    expect(replay.body.groups[0].lines[0].qty).toBe(1);

    const changed = await call("POST", "/v1/cart/items?dest=tehran", { ...body, qty: 2 }, session.cookie, { "idempotency-key": key });
    expect(changed.status).toBe(422);
    expect(changed.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("revalidates stock and delivery on every read", async () => {
    const session = await signIn();
    const body = { listingId: first.id, packageId: firstPackage.id, qty: 1 };
    await call("POST", "/v1/cart/items?dest=tehran", body, session.cookie, { "idempotency-key": "cart-stock-0001" });
    await api.deps.db.query("update catalog.listings set stock_base = 0 where id = $1", [first.id]);
    api.app.get(CatalogService).invalidate();
    const cart = await call("GET", "/v1/cart?dest=tehran", undefined, session.cookie);
    expect(cart.body.hasIssues).toBe(true);
    expect(cart.body.groups[0].blocked[0]).toMatchObject({ reason: "OUT_OF_STOCK" });
  });

  it("updates, removes, clears and isolates carts by user", async () => {
    const a = await signIn();
    const b = await signIn();
    const body = { listingId: "l201", packageId: demo.LISTINGS.find((listing) => listing.id === "l201")!.packages[0]!.id, qty: 2 };
    await call("POST", "/v1/cart/items?dest=tehran", body, a.cookie, { "idempotency-key": "cart-update-0001" });
    const updated = await call("PATCH", "/v1/cart/items?dest=tehran", { ...body, qty: 3 }, a.cookie);
    expect(updated.body.itemCount).toBe(3);
    const other = await call("GET", "/v1/cart?dest=tehran", undefined, b.cookie);
    expect(other.body.itemCount).toBe(0);
    const removed = await call("DELETE", `/v1/cart/items/${body.listingId}/${body.packageId}?dest=tehran`, undefined, a.cookie);
    expect(removed.body.itemCount).toBe(0);
    const cleared = await call("DELETE", "/v1/cart?dest=tehran", undefined, a.cookie);
    expect(cleared.body.groups).toEqual([]);
  });
});
