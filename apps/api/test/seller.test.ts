import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { CatalogService } from "../src/modules/catalog/catalog.service";
import { SellerCatalogService } from "../src/modules/catalog/seller-catalog.service";

let api: RunningService<ApiConfig>;
let n = 0;
const newPhone = () => `0916${String(++n).padStart(7, "0")}`;
const ADMIN = "09160000000";
const randomIp = () => `10.50.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`;
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- assertions check the shape

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Res & { cookie: string }> {
  const res = await fetch(`${api.url}${path}`, {
    method,
    headers: { "x-forwarded-for": randomIp(), ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const cookies = (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { status: res.status, body: text ? JSON.parse(text) : undefined, cookie: cookies.map((c) => c.split(";", 1)[0]).join("; ") };
}
async function signIn(phone = newPhone()) {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  const v = await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode });
  return { cookie: v.cookie, id: v.body.user.id as string };
}

const NATIONAL_ID = "0084575948";
const SHEBA = "IR270170000000100324200001";
const application = (overrides: Record<string, unknown> = {}) => ({
  name: "باغ سیب سالار",
  type: "GROWER",
  cityId: "miandoab",
  ownerName: "سالار د.",
  handlingDays: 1,
  acceptanceSlaHours: 6,
  story: { title: "باغی کنار زرینه‌رود", body: ["سه نسل است که در میاندوآب سیب می‌کاریم."], practices: ["آبیاری قطره‌ای"], sinceYear: 1370 },
  shipping: [
    { method: "SELLER_LOCAL", baseRial: 300_000, perKgRial: 0, maxWeightGrams: 60_000 },
    { method: "TIPAX", baseRial: 900_000, perKgRial: 60_000, maxWeightGrams: 30_000 },
  ],
  kyc: { nationalId: NATIONAL_ID, sheba: SHEBA },
  ...overrides,
});
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString();
const listingInput = (overrides: Record<string, unknown> = {}) => ({
  produceTypeId: "apple-red",
  title: "سیب قرمز میاندوآب",
  description: "سیب قرمز ترد و آبدار، همین دیروز از باغ چیده شده است.",
  grade: "GRADE_1",
  harvestedAt: yesterday(),
  stockBase: 200_000,
  packages: [{ label: "جعبه‌ی ۵ کیلویی", netGrams: 5_000, priceRial: 4_000_000 }],
  ...overrides,
});
const searchIds = async (q = "سیب", dest = "miandoab") => (await call("GET", `/v1/search?dest=${dest}&q=${encodeURIComponent(q)}`)).body.hits.map((h: { listing: { id: string } }) => h.listing.id);

let admin: Awaited<ReturnType<typeof signIn>>;
let seller: Awaited<ReturnType<typeof signIn>>;
let shopId: string;
let listingId: string;

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(49_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ADMIN_PHONES: ADMIN, ORDER_TIMER_SEC: "0" },
  });
  admin = await signIn(ADMIN);
  seller = await signIn();
});
afterAll(async () => {
  await api?.stop();
});

describe("seller onboarding", () => {
  it("checks the national ID and Sheba", async () => {
    expect((await call("POST", "/v1/seller/shop", application({ kyc: { nationalId: "0084575949", sheba: SHEBA } }), seller.cookie)).body.code).toBe("NATIONAL_ID_INVALID");
    expect((await call("POST", "/v1/seller/shop", application({ kyc: { nationalId: NATIONAL_ID, sheba: "IR280170000000100324200001" } }), seller.cookie)).body.code).toBe("SHEBA_INVALID");
  });

  it("stores the application with KYC encrypted and shows only the last four digits", async () => {
    const r = await call("POST", "/v1/seller/shop", application(), seller.cookie);
    expect(r.status).toBe(201);
    expect(r.body.shop.status).toBe("PENDING_REVIEW");
    expect(r.body.kyc).toMatchObject({ nationalIdLast4: "5948", shebaLast4: "0001" });
    shopId = r.body.shop.id;
    const [k] = await api.deps.db.query<{ national_id_enc: string; sheba_enc: string }>("select national_id_enc, sheba_enc from catalog.shop_kyc where shop_id = $1", [shopId]);
    expect(k!.national_id_enc).not.toContain(NATIONAL_ID);
    expect(k!.sheba_enc).not.toContain("0170000000100324200001");
    expect((await call("POST", "/v1/seller/shop", application(), seller.cookie)).body.code).toBe("SHOP_EXISTS");
  });

  it("does not let a pending shop list products", async () => {
    expect((await call("POST", "/v1/seller/listings", listingInput(), seller.cookie)).body.code).toBe("SHOP_NOT_ACTIVE");
  });

  it("lets staff approve the shop, which makes the user a seller", async () => {
    expect((await call("GET", "/v1/admin/kyc", undefined, seller.cookie)).status).toBe(403);
    const queue = (await call("GET", "/v1/admin/kyc", undefined, admin.cookie)).body;
    expect(queue.map((q: { shop: { id: string } }) => q.shop.id)).toContain(shopId);
    expect(JSON.stringify(queue)).not.toContain(NATIONAL_ID);
    expect((await call("POST", `/v1/admin/shops/${shopId}/approve`, undefined, admin.cookie)).status).toBe(201);
    expect((await call("GET", "/v1/me", undefined, seller.cookie)).body.roles).toContain("SELLER");
    const audit = (await call("GET", "/v1/admin/audit", undefined, admin.cookie)).body;
    expect(audit[0]).toMatchObject({ action: "تأیید هویت غرفه", subject: "باغ سیب سالار" });
  });

  it("lets a rejected applicant apply again", async () => {
    const other = await signIn();
    const first = await call("POST", "/v1/seller/shop", application({ name: "میوه‌فروشی نمونه", type: "SHOP" }), other.cookie);
    await call("POST", `/v1/admin/shops/${first.body.shop.id}/reject`, { reason: "عکس کارت ملی خوانا نیست" }, admin.cookie);
    expect((await call("GET", "/v1/seller/shop", undefined, other.cookie)).body).toMatchObject({ shop: { status: "REJECTED" }, reviewNote: "عکس کارت ملی خوانا نیست" });
    const again = await call("POST", "/v1/seller/shop", application({ name: "میوه‌فروشی نمونه", type: "SHOP" }), other.cookie);
    expect(again.body.shop).toMatchObject({ id: first.body.shop.id, status: "PENDING_REVIEW" });
  });
});

describe("listings", () => {
  it("checks packages and freshness against the produce type", async () => {
    expect((await call("POST", "/v1/seller/listings", listingInput({ packages: [{ label: "۱۰ عدد", units: 10, priceRial: 900_000 }] }), seller.cookie)).body.code).toBe("PACKAGE_NEEDS_WEIGHT");
    expect((await call("POST", "/v1/seller/listings", listingInput({ harvestedAt: new Date(Date.now() - 60 * 86_400_000).toISOString() }), seller.cookie)).body.code).toBe("NOT_FRESH");
  });

  it("publishes a new listing only after staff review", async () => {
    const r = await call("POST", "/v1/seller/listings", listingInput(), seller.cookie);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PENDING_REVIEW");
    listingId = r.body.id;
    expect(await searchIds()).not.toContain(listingId);
    expect((await call("GET", "/v1/admin/moderation", undefined, admin.cookie)).body.pendingListings.map((l: { id: string }) => l.id)).toContain(listingId);
    await call("POST", `/v1/admin/listings/${listingId}/approve`, undefined, admin.cookie);
    expect(await searchIds()).toContain(listingId);
  });

  it("opens a review case for an organic claim", async () => {
    const r = await call("POST", "/v1/seller/listings", listingInput({ title: "سیب ارگانیک میاندوآب", isOrganic: true }), seller.cookie);
    const cases = (await call("GET", "/v1/admin/moderation", undefined, admin.cookie)).body.cases;
    expect(cases.find((c: { listingId: string }) => c.listingId === r.body.id).rule).toContain("ارگانیک");
  });

  it("updates stock and price at once, and flags a price jump over 30%", async () => {
    expect((await call("PATCH", `/v1/seller/listings/${listingId}/stock`, { stockBase: 150_000 }, seller.cookie)).body.stockBase).toBe(150_000);
    const pkgId = (await call("GET", "/v1/seller/listings", undefined, seller.cookie)).body.find((x: { listing: { id: string } }) => x.listing.id === listingId).listing.packages[0].id;
    const r = await call("PATCH", `/v1/seller/listings/${listingId}/prices`, { prices: [{ packageId: pkgId, priceRial: 6_000_000 }] }, seller.cookie);
    expect(r.body.packages[0].priceRial).toBe(6_000_000);
    expect(r.body.status).toBe("PUBLISHED");
    const cases = (await call("GET", "/v1/admin/moderation", undefined, admin.cookie)).body.cases;
    expect(cases.some((c: { listingId: string; rule: string }) => c.listingId === listingId && c.rule.includes("۳۰٪"))).toBe(true);
  });

  it("pauses and resumes", async () => {
    await call("POST", `/v1/seller/listings/${listingId}/pause`, undefined, seller.cookie);
    expect(await searchIds()).not.toContain(listingId);
    expect((await call("POST", `/v1/seller/listings/${listingId}/resume`, undefined, seller.cookie)).body.status).toBe("PUBLISHED");
    expect(await searchIds()).toContain(listingId);
  });

  it("sends a content edit back to review, and a staff rejection keeps it off the store", async () => {
    const edited = await call("PATCH", `/v1/seller/listings/${listingId}`, { description: "سیب قرمز ترد، چیده‌شده‌ی همین هفته در باغ خودمان." }, seller.cookie);
    expect(edited.body.status).toBe("PENDING_REVIEW");
    await call("POST", `/v1/admin/listings/${listingId}/reject`, { reason: "عکس واقعی محصول لازم است" }, admin.cookie);
    const mine = (await call("GET", "/v1/seller/listings", undefined, seller.cookie)).body.find((x: { listing: { id: string } }) => x.listing.id === listingId);
    expect(mine).toMatchObject({ listing: { status: "PAUSED" }, moderationNote: "عکس واقعی محصول لازم است" });
    expect((await call("POST", `/v1/seller/listings/${listingId}/resume`, undefined, seller.cookie)).body.status).toBe("PENDING_REVIEW");
    await call("POST", `/v1/admin/listings/${listingId}/approve`, undefined, admin.cookie);
  });

  it("keeps sellers out of each other's listings", async () => {
    const stranger = await signIn();
    expect((await call("PATCH", `/v1/seller/listings/${listingId}/stock`, { stockBase: 1 }, stranger.cookie)).status).toBe(404);
    expect((await call("GET", "/v1/seller/listings", undefined, stranger.cookie)).status).toBe(404);
  });

  it("pauses listings automatically once they are too old to sell", async () => {
    await api.deps.db.query("update catalog.listings set harvested_at = now() - interval '60 days' where id = $1", [listingId]);
    api.app.get(CatalogService).invalidate();
    expect(await api.app.get(SellerCatalogService).pauseStale()).toBeGreaterThanOrEqual(1);
    const mine = (await call("GET", "/v1/seller/listings", undefined, seller.cookie)).body.find((x: { listing: { id: string } }) => x.listing.id === listingId);
    expect(mine.listing.status).toBe("PAUSED");
    const audit = (await call("GET", "/v1/admin/audit", undefined, admin.cookie)).body;
    expect(audit.some((a: { action: string }) => a.action.includes("توقف خودکار"))).toBe(true);
  });

  it("hides a suspended shop's listings from buyers", async () => {
    await api.deps.db.query("update catalog.listings set harvested_at = now() - interval '1 day', status = 'PUBLISHED' where id = $1", [listingId]);
    api.app.get(CatalogService).invalidate();
    expect(await searchIds()).toContain(listingId);
    await call("POST", `/v1/admin/shops/${shopId}/suspend`, { reason: "شکایت‌های مکرر" }, admin.cookie);
    expect(await searchIds()).not.toContain(listingId);
    expect((await call("GET", `/v1/shops/${shopId}`)).status).toBe(404);
  });
});
