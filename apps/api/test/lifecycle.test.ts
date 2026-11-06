import { type RunningService, startService } from "@nobar/common";
import * as demo from "@nobar/demo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";
import { FulfilmentService } from "../src/modules/order/fulfilment.service";
import { commissionOf } from "../src/modules/payment/payment.service";

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0915${String(++n).padStart(7, "0")}`;
const ADMIN = "09150000000";
const randomIp = () => `10.40.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
const listing = demo.LISTINGS.find((l) => l.id === "l101")!;
const pkg = listing.packages[0]!;
const key = () => `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type Res = { status: number; headers: Headers; cookie: string; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- assertions check the shape

async function call(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${api.url}${path}`, {
    method,
    redirect: "manual",
    headers: { "x-forwarded-for": randomIp(), ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const cookies = (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { status: res.status, headers: res.headers, cookie: cookies.map((c) => c.split(";", 1)[0]).join("; "), body: text && res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text };
}

async function signIn(phone = newPhone()) {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  const verified = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  expect(verified.status).toBe(200);
  return { cookie: verified.cookie, id: verified.body.user.id as string };
}

const db = () => api.deps.db;
const balance = async (account: string) =>
  Number((await db().query<{ b: number }>("select coalesce(sum(case when direction = 'C' then amount_rial else -amount_rial end), 0)::bigint as b from payment.ledger_entries where account = $1", [account]))[0]!.b);
const stock = async () => Number((await db().query<{ s: number }>("select stock_base as s from catalog.listings where id = $1", [listing.id]))[0]!.s);

/** a buyer who has paid for one package of l101; returns the order */
async function paidOrder(buyer = undefined as Awaited<ReturnType<typeof signIn>> | undefined) {
  const b = buyer ?? (await signIn());
  const addr = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, b.cookie);
  expect((await call("POST", "/v1/cart/items?dest=tehran", { listingId: listing.id, packageId: pkg.id, qty: 1 }, b.cookie, { "idempotency-key": key() })).status).toBe(201);
  const checkout = await call("POST", "/v1/checkouts", { addressId: addr.body.id, paymentMethod: "GATEWAY" }, b.cookie, { "idempotency-key": key() });
  expect(checkout.status).toBe(201);
  const pay = await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, b.cookie, { "idempotency-key": key() });
  expect(pay.status).toBe(201);
  const authority = decodeURIComponent(pay.body.redirectUrl.split("/fake/")[1]);
  const back = await call("GET", `/v1/payments/callback?Authority=${encodeURIComponent(authority)}&Status=OK`);
  expect(back.status).toBe(303);
  expect(back.headers.get("location")).toContain(`checkout=${checkout.body.id}&payment=ok`);
  const [order] = (await call("GET", "/v1/orders", undefined, b.cookie)).body.filter((o: { checkoutId: string }) => o.checkoutId === checkout.body.id);
  return { buyer: b, checkout: checkout.body, order, authority };
}

let seller: Awaited<ReturnType<typeof signIn>>;
let admin: Awaited<ReturnType<typeof signIn>>;

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(48_000 + Math.floor(Math.random() * 1_000)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ADMIN_PHONES: ADMIN, ORDER_TIMER_SEC: "0" },
  });
  seller = await signIn();
  admin = await signIn(ADMIN);
  // the seller account owns the demo shop of l101
  await db().query("update catalog.shops set owner_user_id = $1 where id = $2", [seller.id, listing.shopId]);
  await db().query("update catalog.listings set stock_base = 1000000 where id = $1", [listing.id]);
  api.app.get(CatalogService).invalidate();
});
afterAll(async () => {
  await api?.stop();
});

describe("payment into escrow", () => {
  it("books the payment once, sells the reserved stock and waits for the seller", async () => {
    const before = await stock();
    const escrowBefore = await balance("escrow");
    const { order, checkout, authority } = await paidOrder();
    expect(order.status).toBe("AWAITING_ACCEPTANCE");
    expect(order.acceptDeadline).not.toBeNull();
    expect(order.commissionRial).toBe(commissionOf(order.itemsTotalRial, 1000)); // apples: 10% overall rule
    expect(await stock()).toBe(before - pkg.netGrams!);
    expect(await balance("escrow")).toBe(escrowBefore + checkout.totalRial);

    // the gateway calling back twice changes nothing
    expect((await call("GET", `/v1/payments/callback?Authority=${encodeURIComponent(authority)}&Status=OK`)).status).toBe(303);
    expect(await balance("escrow")).toBe(escrowBefore + checkout.totalRial);
    expect(await stock()).toBe(before - pkg.netGrams!);
  });

  it("keeps the checkout open when the buyer cancels on the gateway, and shows the test gateway page", async () => {
    const b = await signIn();
    const addr = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, b.cookie);
    await call("POST", "/v1/cart/items?dest=tehran", { listingId: listing.id, packageId: pkg.id, qty: 1 }, b.cookie, { "idempotency-key": key() });
    const checkout = await call("POST", "/v1/checkouts", { addressId: addr.body.id, paymentMethod: "GATEWAY" }, b.cookie, { "idempotency-key": key() });
    const pay = await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, b.cookie, { "idempotency-key": key() });
    const page = await call("GET", new URL(pay.body.redirectUrl).pathname);
    expect(page.status).toBe(200);
    expect(page.body).toContain("درگاه پرداخت آزمایشی");
    const authority = decodeURIComponent(pay.body.redirectUrl.split("/fake/")[1]);
    const back = await call("GET", `/v1/payments/callback?Authority=${encodeURIComponent(authority)}&Status=NOK`);
    expect(back.headers.get("location")).toContain("payment=failed");
    expect((await call("GET", `/v1/checkouts/${checkout.body.id}`, undefined, b.cookie)).body.status).toBe("PENDING_PAYMENT");
    expect((await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, b.cookie, { "idempotency-key": key() })).status).toBe(201);
  });

  it("puts a payment that arrives after the checkout expired into the buyer's wallet", async () => {
    const b = await signIn();
    const addr = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, b.cookie);
    await call("POST", "/v1/cart/items?dest=tehran", { listingId: listing.id, packageId: pkg.id, qty: 1 }, b.cookie, { "idempotency-key": key() });
    const checkout = await call("POST", "/v1/checkouts", { addressId: addr.body.id, paymentMethod: "GATEWAY" }, b.cookie, { "idempotency-key": key() });
    const pay = await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, b.cookie, { "idempotency-key": key() });
    await db().query("update ordering.checkouts set expires_at = now() - interval '1 second' where id = $1", [checkout.body.id]);
    await db().query("update ordering.stock_reservations set expires_at = now() - interval '1 second' where checkout_id = $1", [checkout.body.id]);
    const authority = decodeURIComponent(pay.body.redirectUrl.split("/fake/")[1]);
    expect((await call("GET", `/v1/payments/callback?Authority=${encodeURIComponent(authority)}&Status=OK`)).headers.get("location")).toContain("payment=failed");
    expect((await call("GET", "/v1/me/wallet", undefined, b.cookie)).body.balanceRial).toBe(checkout.body.totalRial);
  });
});

describe("shop order lifecycle", () => {
  it("accept → ship → delivered → settles to the seller after the complaint window", async () => {
    const { order, buyer } = await paidOrder();
    const sellerBefore = await balance(`seller:${listing.shopId}`);
    expect((await call("POST", `/v1/seller/orders/${order.id}/accept`, undefined, seller.cookie)).body.status).toBe("ACCEPTED");
    const noCode = await call("POST", `/v1/seller/orders/${order.id}/ship`, {}, seller.cookie);
    if (order.shippingMethod !== "SELLER_LOCAL") expect(noCode.body.code).toBe("TRACKING_CODE_REQUIRED");
    const shipped = await call("POST", `/v1/seller/orders/${order.id}/ship`, { trackingCode: "TPX-123456" }, seller.cookie);
    expect(shipped.body.status === "SHIPPED" || noCode.body.status === "SHIPPED").toBe(true);
    const delivered = await call("POST", `/v1/orders/${order.id}/delivered`, undefined, buyer.cookie);
    expect(delivered.body.status).toBe("DELIVERED");
    expect(delivered.body.complaintEndsAt).not.toBeNull();

    await db().query("update ordering.orders set complaint_ends_at = now() - interval '1 second' where id = $1", [order.id]);
    expect((await api.app.get(FulfilmentService).tick()).completed).toBeGreaterThanOrEqual(1);
    const done = (await call("GET", `/v1/orders/${order.id}`, undefined, buyer.cookie)).body;
    expect(done.status).toBe("COMPLETED");
    expect(await balance(`seller:${listing.shopId}`)).toBe(sellerBefore + order.totalRial - order.commissionRial);
    expect(done.timeline.map((t: { status: string }) => t.status)).toEqual(["PENDING_PAYMENT", "AWAITING_ACCEPTANCE", "ACCEPTED", "SHIPPED", "DELIVERED", "COMPLETED"]);
  });

  it("seller rejection refunds the buyer in full and puts the stock back", async () => {
    const { order, buyer } = await paidOrder();
    const before = await stock();
    const r = await call("POST", `/v1/seller/orders/${order.id}/reject`, { reason: "این هفته برداشت نداریم" }, seller.cookie);
    expect(r.body.status).toBe("REJECTED");
    expect(await stock()).toBe(before + pkg.netGrams!);
    expect((await call("GET", "/v1/me/wallet", undefined, buyer.cookie)).body.balanceRial).toBe(order.totalRial);
  });

  it("buyer can cancel only before the seller accepts", async () => {
    const first = await paidOrder();
    expect((await call("POST", `/v1/orders/${first.order.id}/cancel`, undefined, first.buyer.cookie)).body.status).toBe("CANCELLED");
    const second = await paidOrder();
    await call("POST", `/v1/seller/orders/${second.order.id}/accept`, undefined, seller.cookie);
    const late = await call("POST", `/v1/orders/${second.order.id}/cancel`, undefined, second.buyer.cookie);
    expect(late.status).toBe(409);
    expect(late.body.code).toBe("ORDER_STATE");
  });

  it("expires orders the seller did not accept in time", async () => {
    const { order, buyer } = await paidOrder();
    await db().query("update ordering.orders set accept_deadline = now() - interval '1 second' where id = $1", [order.id]);
    expect((await api.app.get(FulfilmentService).tick()).expired).toBeGreaterThanOrEqual(1);
    expect((await call("GET", `/v1/orders/${order.id}`, undefined, buyer.cookie)).body.status).toBe("EXPIRED");
    expect((await call("GET", "/v1/me/wallet", undefined, buyer.cookie)).body.balanceRial).toBe(order.totalRial);
  });

  it("handles a complaint: buyer opens, seller answers, staff refunds part, the rest settles", async () => {
    const { order, buyer } = await paidOrder();
    await call("POST", `/v1/seller/orders/${order.id}/accept`, undefined, seller.cookie);
    await call("POST", `/v1/seller/orders/${order.id}/ship`, { trackingCode: "TPX-777777" }, seller.cookie);
    await call("POST", `/v1/orders/${order.id}/delivered`, undefined, buyer.cookie);
    const refund = 100_000;
    const opened = await call("POST", `/v1/orders/${order.id}/dispute`, { reason: "SPOILED", description: "چند تا از سیب‌ها له شده بود", requested: "PARTIAL_REFUND", requestedRial: refund }, buyer.cookie);
    expect(opened.body.status).toBe("DISPUTED");
    expect(opened.body.dispute.status).toBe("AWAITING_SELLER");
    expect((await call("POST", `/v1/seller/orders/${order.id}/dispute/answer`, { response: "عذر می‌خواهیم؛ همان مبلغ را قبول داریم", offerRial: refund }, seller.cookie)).body.dispute.status).toBe("AWAITING_STAFF");

    const sellerBefore = await balance(`seller:${listing.shopId}`);
    expect((await call("POST", `/v1/admin/orders/${order.id}/dispute/resolve`, { refundRial: refund, note: "بازپرداخت جزئی" }, buyer.cookie, { "idempotency-key": key() })).status).toBe(403);
    const resolved = await call("POST", `/v1/admin/orders/${order.id}/dispute/resolve`, { refundRial: refund, note: "بازپرداخت جزئی" }, admin.cookie, { "idempotency-key": key() });
    expect(resolved.body.status).toBe("COMPLETED");
    expect(resolved.body.dispute).toMatchObject({ status: "RESOLVED", refundRial: refund });
    expect((await call("GET", "/v1/me/wallet", undefined, buyer.cookie)).body.balanceRial).toBe(refund);
    expect(await balance(`seller:${listing.shopId}`)).toBe(sellerBefore + order.totalRial - refund - resolved.body.commissionRial);
    expect(resolved.body.commissionRial).toBeLessThan(order.commissionRial);
  });

  it("hides other shops' orders from a seller and other buyers' orders from a buyer", async () => {
    const { order, buyer } = await paidOrder();
    const stranger = await signIn();
    expect((await call("POST", `/v1/seller/orders/${order.id}/accept`, undefined, stranger.cookie)).status).toBe(404);
    expect((await call("GET", `/v1/orders/${order.id}`, undefined, stranger.cookie)).status).toBe(404);
    expect((await call("GET", "/v1/seller/orders", undefined, stranger.cookie)).body).toEqual([]);
    expect((await call("GET", `/v1/orders/${order.code}`, undefined, buyer.cookie)).body.id).toBe(order.id);
    expect((await call("GET", "/v1/admin/orders", undefined, buyer.cookie)).status).toBe(403);
  });
});

describe("money stays consistent", () => {
  it("pays out seller balances and keeps the books balanced", async () => {
    const sellerBalance = await balance(`seller:${listing.shopId}`);
    expect(sellerBalance).toBeGreaterThan(0);
    const run = await call("POST", "/v1/admin/payouts", undefined, admin.cookie, { "idempotency-key": key() });
    expect(run.body.find((p: { shopId: string }) => p.shopId === listing.shopId).amountRial).toBe(sellerBalance);
    expect(await balance(`seller:${listing.shopId}`)).toBe(0);
    expect((await call("GET", "/v1/seller/balance", undefined, seller.cookie)).body[0].payouts[0].amountRial).toBe(sellerBalance);

    const t = (await call("GET", "/v1/admin/finance", undefined, admin.cookie)).body;
    expect(t.escrowRial + t.walletsRial + t.sellersRial + t.commissionRial + t.paidOutRial).toBe(t.receivedRial);
    const unbalanced = await db().query(
      "select txn_id from payment.ledger_entries group by txn_id having sum(case when direction = 'D' then amount_rial else 0 end) <> sum(case when direction = 'C' then amount_rial else 0 end)",
    );
    expect(unbalanced).toEqual([]);
  });

  it("lets staff change commission rules", async () => {
    const rules = await call("PUT", "/v1/admin/commission-rules", { scope: "CATEGORY", scopeId: "veg", rateBps: 800, label: "دسته: صیفی" }, admin.cookie);
    expect(rules.body.find((r: { scopeId: string }) => r.scopeId === "veg").rateBps).toBe(800);
  });
});
