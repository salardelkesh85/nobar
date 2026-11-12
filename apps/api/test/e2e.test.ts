import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";

// Beta gate 5 (docs/v1-readiness.md): the whole buying path through the public HTTP API only.

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0916${String(++n).padStart(7, "0")}`;
const ADMIN = "09160000000";
const DEST = "tehran";
const randomIp = () => `10.60.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
const key = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(47_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ADMIN_PHONES: ADMIN, ORDER_TIMER_SEC: "0" },
  });
});
afterAll(async () => {
  await api?.stop();
});

type Hit = { listing: { id: string; shopId: string; stockBase: number; packages: Array<{ id: string }> } };

it("OTP → search → two-seller cart → checkout → test gateway → one seller accepts, the other rejects", async () => {
  // search as a guest, then pick one listing from each of two shops
  const hits: Hit[] = (await call("GET", `/v1/search?dest=${DEST}`)).body.hits;
  const first = hits[0]!;
  const second = hits.find((h) => h.listing.shopId !== first.listing.shopId)!;
  expect(second).toBeDefined();
  const picks = [first, second];

  // each shop gets an owner who can decide on its orders
  const sellers = [await signIn(), await signIn()];
  for (const [i, pick] of picks.entries()) {
    await api.deps.db.query("update catalog.shops set owner_user_id = $1 where id = $2", [sellers[i]!.id, pick.listing.shopId]);
  }
  api.app.get(CatalogService).invalidate();
  const stockOf = async (id: string) => Number((await api.deps.db.query<{ s: number }>("select stock_base as s from catalog.listings where id = $1", [id]))[0]!.s);
  const stockBefore = await Promise.all(picks.map((p) => stockOf(p.listing.id)));

  const buyer = await signIn();
  const address = await call("POST", "/v1/me/addresses", { title: "خانه", cityId: DEST, name: "خریدار نوبر", phone: "09121234567", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" }, buyer.cookie);
  expect(address.status).toBe(201);
  for (const pick of picks) {
    const added = await call("POST", `/v1/cart/items?dest=${DEST}`, { listingId: pick.listing.id, packageId: pick.listing.packages[0]!.id, qty: 1 }, buyer.cookie, { "idempotency-key": key() });
    expect(added.status).toBe(201);
  }

  // one checkout, one payment, one order per shop
  const checkoutKey = key();
  const checkout = await call("POST", "/v1/checkouts", { addressId: address.body.id, paymentMethod: "GATEWAY" }, buyer.cookie, { "idempotency-key": checkoutKey });
  expect(checkout.status).toBe(201);
  const replay = await call("POST", "/v1/checkouts", { addressId: address.body.id, paymentMethod: "GATEWAY" }, buyer.cookie, { "idempotency-key": checkoutKey });
  expect(replay.body.id).toBe(checkout.body.id);

  const pay = await call("POST", `/v1/checkouts/${checkout.body.id}/pay`, undefined, buyer.cookie, { "idempotency-key": key() });
  expect(pay.status).toBe(201);
  const authority = pay.body.redirectUrl.split("/fake/")[1] as string;
  const callback = `/v1/payments/callback?Authority=${authority}&Status=OK`;
  expect((await call("GET", callback)).headers.get("location")).toContain("payment=ok");
  // the gateway may call back twice; the money is booked once
  expect((await call("GET", callback)).status).toBe(303);

  const orders: Array<{ id: string; shopId: string; status: string; totalRial: number; checkoutId: string }> = (await call("GET", "/v1/orders", undefined, buyer.cookie)).body;
  expect(orders).toHaveLength(2);
  expect(orders.every((o) => o.status === "AWAITING_ACCEPTANCE" && o.checkoutId === checkout.body.id)).toBe(true);
  expect(new Set(orders.map((o) => o.shopId))).toEqual(new Set(picks.map((p) => p.listing.shopId)));
  const admin = await signIn(ADMIN);
  const paid = (await call("GET", "/v1/admin/finance", undefined, admin.cookie)).body;
  expect(paid.receivedRial).toBe(orders[0]!.totalRial + orders[1]!.totalRial);
  expect(paid.escrowRial).toBe(paid.receivedRial);

  // seller decisions
  const orderOf = (i: number) => orders.find((o) => o.shopId === picks[i]!.listing.shopId)!;
  expect((await call("POST", `/v1/seller/orders/${orderOf(0).id}/accept`, undefined, sellers[1]!.cookie)).status).toBe(404);
  expect((await call("POST", `/v1/seller/orders/${orderOf(0).id}/accept`, undefined, sellers[0]!.cookie)).body.status).toBe("ACCEPTED");
  expect((await call("POST", `/v1/seller/orders/${orderOf(1).id}/reject`, { reason: "این هفته برداشت نداریم" }, sellers[1]!.cookie)).body.status).toBe("REJECTED");

  // the rejected part is back in the buyer's wallet and on the shelf; the accepted part stays sold and in escrow
  expect((await call("GET", "/v1/me/wallet", undefined, buyer.cookie)).body.balanceRial).toBe(orderOf(1).totalRial);
  expect(await stockOf(picks[0]!.listing.id)).toBeLessThan(stockBefore[0]!);
  expect(await stockOf(picks[1]!.listing.id)).toBe(stockBefore[1]!);
  const t = (await call("GET", "/v1/admin/finance", undefined, admin.cookie)).body;
  expect(t.escrowRial).toBe(orderOf(0).totalRial);
  expect(t.escrowRial + t.walletsRial + t.sellersRial + t.commissionRial + t.paidOutRial).toBe(t.receivedRial);
  const unbalanced = await api.deps.db.query(
    "select txn_id from payment.ledger_entries group by txn_id having sum(case when direction = 'D' then amount_rial else 0 end) <> sum(case when direction = 'C' then amount_rial else 0 end)",
  );
  expect(unbalanced).toEqual([]);

  // both sides are told (notices travel through the outbox, so they arrive a moment later)
  const titles = async (cookie: string, want: string) => {
    for (let i = 0; i < 100; i++) {
      const got: string[] = (await call("GET", "/v1/me/notifications", undefined, cookie)).body.items.map((x: { title: string }) => x.title);
      if (got.includes(want)) return got;
      await new Promise((r) => setTimeout(r, 50));
    }
    return [];
  };
  expect(await titles(buyer.cookie, "غرفه سفارش را تأیید کرد")).toContain("پرداخت انجام شد");
  expect(await titles(sellers[0]!.cookie, "سفارش تازه")).toContain("سفارش تازه");
  expect(await titles(sellers[1]!.cookie, "سفارش تازه")).toContain("سفارش تازه");
});
