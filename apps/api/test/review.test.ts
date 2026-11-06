import { type RunningService, startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";
import { contactFlags } from "../src/modules/review/review.service";

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0917${String(++n).padStart(7, "0")}`;
const ADMIN = "09170000000";
const randomIp = () => `10.60.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
const listing = demo.LISTINGS.find((l) => l.id === "l101")!;
const pkg = listing.packages[0]!;
const key = () => `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
type Res = { status: number; body: any; cookie: string }; // eslint-disable-line @typescript-eslint/no-explicit-any -- assertions check the shape

async function call(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${api.url}${path}`, {
    method,
    redirect: "manual",
    headers: { "x-forwarded-for": randomIp(), ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const cookies = (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { status: res.status, body: text && res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text, cookie: cookies.map((c) => c.split(";", 1)[0]).join("; ") };
}
async function signIn(phone = newPhone(), name?: string) {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  const v = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  if (name) await call("PATCH", "/v1/me", { name }, v.cookie);
  return { cookie: v.cookie, id: v.body.user.id as string };
}
/** polls until the async consumer has written something (outbox → bus → notification) */
async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean): Promise<T> {
  for (let i = 0; i < 40; i++) {
    const v = await fn();
    if (ok(v)) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  return fn();
}

let seller: Awaited<ReturnType<typeof signIn>>;
let admin: Awaited<ReturnType<typeof signIn>>;

async function deliveredOrder() {
  const b = await signIn(newPhone(), "مریم کریمی");
  const addr = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "مریم کریمی", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, b.cookie);
  await call("POST", "/v1/cart/items?dest=tehran", { listingId: listing.id, packageId: pkg.id, qty: 1 }, b.cookie, { "idempotency-key": key() });
  const checkout = await call("POST", "/v1/checkouts", { addressId: addr.body.id, paymentMethod: "GATEWAY" }, b.cookie, { "idempotency-key": key() });
  const pay = await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, b.cookie, { "idempotency-key": key() });
  await call("GET", `/v1/payments/callback?Authority=${pay.body.redirectUrl.split("/fake/")[1]}&Status=OK`);
  const order = (await call("GET", "/v1/orders", undefined, b.cookie)).body[0];
  await call("POST", `/v1/seller/orders/${order.id}/accept`, undefined, seller.cookie);
  await call("POST", `/v1/seller/orders/${order.id}/ship`, { trackingCode: "TPX-1234" }, seller.cookie);
  return { buyer: b, order };
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(49_900 + Math.floor(Math.random() * 90)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ADMIN_PHONES: ADMIN, ORDER_TIMER_SEC: "0" },
  });
  seller = await signIn();
  admin = await signIn(ADMIN);
  await api.deps.db.query("update catalog.shops set owner_user_id = $1 where id = $2", [seller.id, listing.shopId]);
  api.app.get(CatalogService).invalidate();
});
afterAll(async () => {
  await api?.stop();
});

describe("reviews", () => {
  it("serves the demo reviews", async () => {
    const withReviews = demo.REVIEWS[0]!;
    const r = await call("GET", `/v1/listings/${withReviews.listingId}/reviews`);
    expect(r.body.map((x: { id: string }) => x.id)).toContain(withReviews.id);
  });

  it("accepts a review only after delivery, shows it after staff approval and updates the shop rating", async () => {
    const { buyer, order } = await deliveredOrder();
    const early = await call("POST", `/v1/listings/${listing.id}/reviews`, { orderId: order.id, rating: 5, freshnessRating: 5, text: "سیب‌ها خیلی تازه و ترد بودند." }, buyer.cookie);
    expect(early.body.code).toBe("NOT_DELIVERED_YET");
    await call("POST", `/v1/orders/${order.id}/delivered`, undefined, buyer.cookie);

    const written = await call("POST", `/v1/listings/${listing.id}/reviews`, { orderId: order.id, rating: 4, freshnessRating: 5, text: "سیب‌ها خیلی تازه و ترد بودند." }, buyer.cookie);
    expect(written.status).toBe(201);
    expect(written.body).toMatchObject({ status: "PENDING", buyerName: "مریم ک.", buyerCity: "تهران" });
    expect((await call("POST", `/v1/listings/${listing.id}/reviews`, { orderId: order.id, rating: 4, freshnessRating: 5, text: "دوباره همان دیدگاه را می‌نویسم." }, buyer.cookie)).body.code).toBe("ALREADY_REVIEWED");
    expect((await call("GET", `/v1/listings/${listing.id}/reviews`)).body.map((x: { id: string }) => x.id)).not.toContain(written.body.id);

    const before = (await call("GET", `/v1/shops/${listing.shopId}`)).body.shop;
    await call("POST", `/v1/admin/reviews/${written.body.id}/approve`, undefined, admin.cookie);
    expect((await call("GET", `/v1/listings/${listing.id}/reviews`)).body.map((x: { id: string }) => x.id)).toContain(written.body.id);
    const after = (await call("GET", `/v1/shops/${listing.shopId}`)).body.shop;
    expect(after.ratingCount).toBe(before.ratingCount + 1);

    const reply = await call("POST", `/v1/seller/reviews/${written.body.id}/reply`, { reply: "ممنون از اعتماد شما" }, seller.cookie);
    expect(reply.body.sellerReply).toBe("ممنون از اعتماد شما");
  });

  it("does not let someone review an order that is not theirs", async () => {
    const { order } = await deliveredOrder();
    const stranger = await signIn();
    expect((await call("POST", `/v1/listings/${listing.id}/reviews`, { orderId: order.id, rating: 1, freshnessRating: 1, text: "این سفارش اصلاً مال من نیست." }, stranger.cookie)).status).toBe(404);
  });
});

describe("product questions", () => {
  it("flags contact details and lets the shop answer", async () => {
    expect(contactFlags("برای خرید عمده به ۰۹۱۲۱۲۳۴۵۶۷ زنگ بزنید")).toContain("شماره‌ی تلفن در متن");
    expect(contactFlags("سیب‌ها ترش هستند یا شیرین؟")).toEqual([]);
    const b = await signIn();
    const q = await call("POST", `/v1/listings/${listing.id}/questions`, { question: "این سیب برای کمپوت مناسب است؟" }, b.cookie);
    expect(q.status).toBe(201);
    expect((await call("GET", `/v1/listings/${listing.id}/questions`)).body).toEqual([]);
    await call("POST", `/v1/seller/questions/${q.body.id}/answer`, { answer: "بله، کمی ترش است و برای کمپوت عالی است." }, seller.cookie);
    expect((await call("GET", `/v1/listings/${listing.id}/questions`)).body[0]).toMatchObject({ question: "این سیب برای کمپوت مناسب است؟" });
    const stranger = await signIn();
    expect((await call("POST", `/v1/seller/questions/${q.body.id}/answer`, { answer: "پاسخ از غرفه‌ی دیگر" }, stranger.cookie)).status).toBe(404);
  });
});

describe("notifications", () => {
  it("tells the seller about a new order and the buyer about shipping", async () => {
    const { buyer } = await deliveredOrder();
    const sellerBox = await eventually(() => call("GET", "/v1/me/notifications", undefined, seller.cookie), (r) => r.body.items.some((i: { title: string }) => i.title === "سفارش تازه"));
    expect(sellerBox.body.items.some((i: { title: string }) => i.title === "سفارش تازه")).toBe(true);
    const buyerBox = await eventually(() => call("GET", "/v1/me/notifications", undefined, buyer.cookie), (r) => r.body.items.some((i: { title: string }) => i.title === "سفارش ارسال شد"));
    expect(buyerBox.body.items.map((i: { title: string }) => i.title)).toEqual(expect.arrayContaining(["پرداخت انجام شد", "غرفه سفارش را تأیید کرد", "سفارش ارسال شد"]));
    expect(buyerBox.body.unread).toBeGreaterThan(0);
    await call("POST", "/v1/me/notifications/all/read", undefined, buyer.cookie);
    expect((await call("GET", "/v1/me/notifications", undefined, buyer.cookie)).body.unread).toBe(0);
  });
});
