import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";

let api: RunningService<ApiConfig>;
let n = 0;
const DEST = "tehran";
const key = () => `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type Res = { status: number; headers: Headers; body: any; cookie: string }; // eslint-disable-line @typescript-eslint/no-explicit-any -- assertions check the shape
async function call(base: string, method: string, url: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${base}${url}`, {
    method,
    redirect: "manual",
    headers: { "x-forwarded-for": `10.90.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const cookies = (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { status: res.status, headers: res.headers, body: text && res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text, cookie: cookies.map((c) => c.split(";", 1)[0]).join("; ") };
}
const get = (url: string, cookie?: string) => call(api.url, "GET", url, undefined, cookie);
async function signIn(): Promise<string> {
  const phone = `0920${String(++n).padStart(7, "0")}`;
  const sent = await call(api.url, "POST", "/v1/auth/otp", { phone });
  return (await call(api.url, "POST", "/v1/auth/verify", { phone, code: sent.body.devCode })).cookie;
}
type Item = { listingId: string; produceTypeId: string; reasonCode: string; reason: string; arrivesWithinDays: number };
type Hit = { listing: { id: string; shopId: string; produceTypeId: string; packages: Array<{ id: string }> } };

/** a buyer pays for these listings in one checkout */
async function buy(listings: Hit["listing"][]) {
  const buyer = await signIn();
  const address = await call(api.url, "POST", "/v1/me/addresses", { title: "خانه", cityId: DEST, name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, buyer);
  for (const l of listings) expect((await call(api.url, "POST", `/v1/cart/items?dest=${DEST}`, { listingId: l.id, packageId: l.packages[0]!.id, qty: 1 }, buyer, { "idempotency-key": key() })).status).toBe(201);
  const checkout = await call(api.url, "POST", "/v1/checkouts", { addressId: address.body.id, paymentMethod: "GATEWAY" }, buyer, { "idempotency-key": key() });
  const pay = await call(api.url, "POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, buyer, { "idempotency-key": key() });
  expect((await get(`/v1/payments/callback?Authority=${pay.body.redirectUrl.split("/fake/")[1]}&Status=OK`)).status).toBe(303);
}
async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean): Promise<T> {
  for (let i = 0; i < 60; i++) {
    const v = await fn();
    if (ok(v)) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  return fn();
}

let a: Hit["listing"];
let b: Hit["listing"];

beforeAll(async () => {
  api = await startService(apiService(), { overrides: { PORT: String(43_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ORDER_TIMER_SEC: "0" } });
  const hits: Hit[] = (await get(`/v1/search?dest=${DEST}`)).body.hits;
  a = hits[0]!.listing;
  // something of another kind that the season alone would not put first
  b = hits.findLast((h) => h.listing.produceTypeId !== a.produceTypeId)!.listing;
});
afterAll(async () => {
  await api?.stop();
});

describe("recommendations", () => {
  it("starts from the season when nothing has been bought yet", async () => {
    const r = await get(`/v1/recommendations?dest=${DEST}`);
    expect(r.status).toBe(200);
    const items: Item[] = r.body.items;
    expect(r.body.enabled).toBe(true);
    expect(items.length).toBeGreaterThan(2);
    expect(items.length).toBeLessThanOrEqual(8);
    expect(items.every((i) => ["PEAK_SEASON", "IN_SEASON"].includes(i.reasonCode) && i.reason.length > 0 && i.arrivesWithinDays > 0)).toBe(true);
    // variety: one listing per produce type
    expect(new Set(items.map((i) => i.produceTypeId)).size).toBe(items.length);
    // everything offered is something search would also show for this city
    const searchable = new Set(((await get(`/v1/search?dest=${DEST}`)).body.hits as Hit[]).map((h) => h.listing.id));
    expect(items.every((i) => searchable.has(i.listingId))).toBe(true);
  });

  it("learns from paid orders: bought together on the product page, popular on the home page", async () => {
    await buy([a, b]);
    await buy([a, b]);
    const page = await eventually(() => get(`/v1/recommendations?dest=${DEST}&listingId=${a.id}`), (r) => r.body.items[0]?.reasonCode === "BOUGHT_TOGETHER");
    expect(page.body.items[0]).toMatchObject({ listingId: b.id, reasonCode: "BOUGHT_TOGETHER", reason: "خریداران این محصول، این را هم خریده‌اند" });
    // never the listing itself or another seller of the same produce (that is the compare page)
    expect((page.body.items as Item[]).every((i) => i.listingId !== a.id && i.produceTypeId !== a.produceTypeId)).toBe(true);

    const home: Item[] = (await get(`/v1/recommendations?dest=${DEST}`)).body.items;
    expect(home.filter((i) => i.reasonCode === "POPULAR").map((i) => i.listingId).sort()).toEqual([a.id, b.id].sort());
  });

  it("suggests for the cart what goes with it, never what is already in it", async () => {
    expect((await get(`/v1/recommendations/cart?dest=${DEST}`)).status).toBe(401);
    const buyer = await signIn();
    await call(api.url, "POST", `/v1/cart/items?dest=${DEST}`, { listingId: a.id, packageId: a.packages[0]!.id, qty: 1 }, buyer, { "idempotency-key": key() });
    const items: Item[] = (await get(`/v1/recommendations/cart?dest=${DEST}`, buyer)).body.items;
    expect(items[0]).toMatchObject({ listingId: b.id, reasonCode: "BOUGHT_TOGETHER" });
    expect(items.some((i) => i.produceTypeId === a.produceTypeId)).toBe(false);
  });

  it("answers an unknown listing with an empty list and a bad city with 400", async () => {
    expect((await get(`/v1/recommendations?dest=${DEST}&listingId=nope`)).body).toEqual({ enabled: true, items: [] });
    expect((await get("/v1/recommendations?dest=atlantis")).status).toBe(400);
  });

  it("can be switched off by the feature flag", async () => {
    const off = await startService(apiService(), { overrides: { PORT: String(42_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", ORDER_TIMER_SEC: "0", RECOMMENDATIONS: "false" } });
    try {
      expect((await call(off.url, "GET", `/v1/recommendations?dest=${DEST}`)).body).toEqual({ enabled: false, items: [] });
    } finally {
      await off.stop();
    }
  });
});
