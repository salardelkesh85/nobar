import { type RunningService, startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0914${String(++n).padStart(7, "0")}`;
const randomIp = () => `10.30.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
const setCookies = (headers: Headers): string[] => {
  const values = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  return values?.length ? values : (headers.get("set-cookie")?.split(/,\s*(?=nobar_)/) ?? []);
};
const cookieHeader = (cookies: string[]) => cookies.map((value) => value.split(";", 1)[0]).join("; ");
const listing = demo.LISTINGS.find((item) => item.id === "l101")!;
const pkg = listing.packages[0]!;

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
  return { cookie: verified.cookie, user: verified.body.user as { id: string } };
}

async function address(cookie: string) {
  const response = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, cookie);
  expect(response.status).toBe(201);
  return response.body.id as string;
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(47_000 + Math.floor(Math.random() * 1_000)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", CORS_ORIGINS: "http://localhost:3000" },
  });
});
afterAll(async () => {
  await api?.stop();
});

beforeEach(async () => {
  await api.deps.db.query("update ordering.stock_reservations set released_at = now() where released_at is null", []);
  await api.deps.db.query("update ordering.checkouts set status = 'FAILED' where status = 'PENDING_PAYMENT'", []);
  await api.deps.db.query("update catalog.listings set stock_base = $2 where id = $1", [listing.id, demo.LISTINGS.find((item) => item.id === listing.id)!.stockBase]);
  api.app.get(CatalogService).invalidate();
});

describe("transactional checkout reservations", () => {
  async function add(cookie: string, key: string, listingId = listing.id, packageId = pkg.id) {
    const response = await call("POST", "/v1/cart/items?dest=tehran", { listingId, packageId, qty: 1 }, cookie, { "idempotency-key": key });
    expect(response.status).toBe(201);
  }

  it("requires a key, snapshots the address/order and clears the cart after reservation", async () => {
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-cart-0001");
    const missing = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, session.cookie);
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");

    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, session.cookie, { "idempotency-key": "checkout-create-0001" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("PENDING_PAYMENT");
    expect(created.body.orders).toHaveLength(1);
    expect(created.body.orders[0]).toMatchObject({ status: "PENDING_PAYMENT", paymentMethod: "GATEWAY", address: { cityId: "tehran" } });
    expect(created.body.totalRial).toBeGreaterThan(0);
    const reservations = await api.deps.db.query<{ quantity_base: number }>("select quantity_base from ordering.stock_reservations where checkout_id = $1", [created.body.id]);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]!.quantity_base).toBe(pkg.netGrams);
    expect((await call("GET", "/v1/cart?dest=tehran", undefined, session.cookie)).body.itemCount).toBe(0);

    const replay = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, session.cookie, { "idempotency-key": "checkout-create-0001" });
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(created.body.id);
    expect((await call("GET", `/v1/checkouts/${created.body.id}`, undefined, session.cookie)).body.id).toBe(created.body.id);
  });

  it("allows only one of two concurrent checkouts to reserve the same stock", async () => {
    await api.deps.db.query("update catalog.listings set stock_base = $2 where id = $1", [listing.id, pkg.netGrams]);
    api.app.get(CatalogService).invalidate();
    const a = await signIn();
    const b = await signIn();
    const addressA = await address(a.cookie);
    const addressB = await address(b.cookie);
    await add(a.cookie, "checkout-race-cart-a");
    await add(b.cookie, "checkout-race-cart-b");
    const results = await Promise.all([
      call("POST", "/v1/checkouts", { addressId: addressA, paymentMethod: "GATEWAY" }, a.cookie, { "idempotency-key": "checkout-race-a" }),
      call("POST", "/v1/checkouts", { addressId: addressB, paymentMethod: "GATEWAY" }, b.cookie, { "idempotency-key": "checkout-race-b" }),
    ]);
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(1);
    expect((await api.deps.db.query<{ n: number }>("select count(*)::int as n from ordering.stock_reservations where listing_id = $1 and released_at is null", [listing.id]))[0]!.n).toBe(1);
  });

  it("releases an expired reservation and marks checkout failed", async () => {
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-expire-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, session.cookie, { "idempotency-key": "checkout-expire-0001" });
    await api.deps.db.query("update ordering.checkouts set expires_at = now() - interval '1 second' where id = $1", [created.body.id]);
    await api.deps.db.query("update ordering.stock_reservations set expires_at = now() - interval '1 second' where checkout_id = $1", [created.body.id]);
    const loaded = await call("GET", `/v1/checkouts/${created.body.id}`, undefined, session.cookie);
    expect(loaded.body.status).toBe("FAILED");
    expect((await api.deps.db.query<{ n: number }>("select count(*)::int as n from ordering.stock_reservations where checkout_id = $1 and released_at is not null", [created.body.id]))[0]!.n).toBe(1);
  });
  it("charges the shipping method the buyer chose for each shop", async () => {
    const options = demo.quoteDelivery(listing, "tehran", pkg.netGrams, pkg.priceRial).options;
    expect(options.length).toBeGreaterThan(1);
    const pricier = options[options.length - 1]!;
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-method-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY", shipping: { [listing.shopId]: pricier.method } }, session.cookie, { "idempotency-key": "checkout-method-0001" });
    expect(created.status).toBe(201);
    expect(created.body.orders[0].deliveryFeeRial).toBe(pricier.costRial);
  });

  it("refuses a shipping method the shop cannot use for this city", async () => {
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-bad-method-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY", shipping: { [listing.shopId]: "SELLER_LOCAL" } }, session.cookie, { "idempotency-key": "checkout-bad-method" });
    expect(created.status).toBe(409);
    expect(created.body.code).toBe("SHIPPING_METHOD_UNAVAILABLE");
  });

  it("cancels the shop orders of an expired checkout", async () => {
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-expire-orders-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, session.cookie, { "idempotency-key": "checkout-expire-orders" });
    await api.deps.db.query("update ordering.checkouts set expires_at = now() - interval '1 second' where id = $1", [created.body.id]);
    const loaded = await call("GET", `/v1/checkouts/${created.body.id}`, undefined, session.cookie);
    expect(loaded.body.status).toBe("FAILED");
    expect(loaded.body.orders.map((o: { status: string }) => o.status)).toEqual(["CANCELLED"]);
  });

  it("answers 404 for unknown or foreign checkouts", async () => {
    const a = await signIn();
    const b = await signIn();
    const addressId = await address(a.cookie);
    await add(a.cookie, "checkout-foreign-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "GATEWAY" }, a.cookie, { "idempotency-key": "checkout-foreign-0001" });
    expect((await call("GET", `/v1/checkouts/${created.body.id}`, undefined, b.cookie)).status).toBe(404);
    expect((await call("GET", "/v1/checkouts/not-a-uuid", undefined, a.cookie)).status).toBe(404);
  });
  it("does not offer cash on delivery yet", async () => {
    const session = await signIn();
    const addressId = await address(session.cookie);
    await add(session.cookie, "checkout-cod-cart");
    const created = await call("POST", "/v1/checkouts", { addressId, paymentMethod: "COD" }, session.cookie, { "idempotency-key": "checkout-cod-0001" });
    expect(created.status).toBe(422);
    expect(created.body.code).toBe("COD_NOT_AVAILABLE");
  });
});
