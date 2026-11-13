// Release gate: drives a running Nobar stack through the edge like real users, with the API in production mode
// and the ZarinPal / Melipayamak stand-ins (stubs.mjs). No dependencies:
//   BASE=http://localhost STUBS=http://localhost:8080 ADMIN_PHONE=09120000001 node smoke.mjs
const BASE = (process.env.BASE ?? "http://localhost").replace(/\/$/, "");
const STUBS = (process.env.STUBS ?? "http://localhost:8080").replace(/\/$/, "");
// the gateway address the API was given (inside the network); rewritten to STUBS to follow redirects from here
const STUBS_INTERNAL = (process.env.STUBS_INTERNAL ?? "http://stubs:8080").replace(/\/$/, "");
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "09120000001";
const NATIONAL_ID = "0084575948";
const SHEBA = "IR270170000000100324200001";

let step = 0;
const log = (msg) => console.log(`✓ ${String(++step).padStart(2, "0")} ${msg}`);
function check(cond, msg, detail) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    if (detail !== undefined) console.error(typeof detail === "string" ? detail.slice(0, 2000) : JSON.stringify(detail, null, 2).slice(0, 2000));
    process.exit(1);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A browser-like client: keeps its cookies (path and Secure ignored), sends the site's Origin on writes. */
class Session {
  jar = new Map();
  async req(method, path, body, headers = {}) {
    const res = await fetch(path.startsWith("http") ? path : `${BASE}${path}`, {
      method,
      redirect: "manual",
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(method === "GET" ? {} : { origin: BASE }),
        ...(this.jar.size ? { cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value) this.jar.set(name, value);
      else this.jar.delete(name);
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    return { status: res.status, headers: res.headers, text, body: json };
  }
  get = (p, h) => this.req("GET", p, undefined, h);
  post = (p, b, h) => this.req("POST", p, b, h);
}

const key = () => `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function signIn(phone) {
  const s = new Session();
  const before = (await (await fetch(`${STUBS}/messages?to=${phone}`)).json()).length;
  const sent = await s.post("/v1/auth/otp", { phone });
  check(sent.status === 200 || sent.status === 201, `send sign-in code to ${phone}`, sent.text);
  check(sent.body.devCode === undefined, "production does not echo the sign-in code", sent.body);
  let code;
  for (let i = 0; i < 50 && !code; i++) {
    const inbox = await (await fetch(`${STUBS}/messages?to=${phone}`)).json();
    if (inbox.length > before) code = /(\d{6})/.exec(inbox.at(-1).text)?.[1];
    else await sleep(100);
  }
  check(code, `the SMS with the code reached ${phone}`);
  const verified = await s.post("/v1/auth/verify", { phone, code });
  check(verified.status === 200, `sign in ${phone}`, verified.text);
  return s;
}

async function waitForStack() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/v1/catalog/categories`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await sleep(2000);
  }
  check(false, "stack did not come up in 4 minutes");
}

await waitForStack();
log("stack answers through the edge");

// --- pages served by the edge
const guest = new Session();
const home = await guest.get("/");
check(home.status === 200 && home.text.includes("نوبر"), "store home page", home.status);
check(home.headers.get("x-content-type-options") === "nosniff", "edge security headers");
for (const p of ["/seller/", "/admin/", "/search/", "/cart/", "/baghboon/"]) {
  const r = await guest.get(p);
  check(r.status === 200, `page ${p}`, r.status);
}
check(!(await guest.get("/healthz")).text.includes('"service":"api"'), "API health is not public");
check(!(await guest.get("/metrics")).text.includes("nobar_outbox_pending"), "metrics are not public");
log("store, seller and admin pages are served; internal endpoints stay internal");

// --- a fresh production market: reference data, no demo shops
const types = await guest.get("/v1/catalog/produce-types");
check(types.status === 200 && types.body.length > 10, "produce types are seeded", types.body);
check((await guest.get("/v1/shops")).body.length === 0, "no demo shops in production");
log(`${types.body.length} produce types ready, no demo data`);

// --- seller onboarding and a first listing, approved by staff
const admin = await signIn(ADMIN_PHONE);
check((await admin.get("/v1/me")).body.roles.includes("ADMIN"), "admin phone gets the ADMIN role");
const sellerPhone = "09141110101";
let seller = await signIn(sellerPhone);
const shop = await seller.post("/v1/seller/shop", {
  name: "باغ سیب آزمون",
  type: "GROWER",
  cityId: "miandoab",
  ownerName: "آزمون",
  handlingDays: 1,
  acceptanceSlaHours: 6,
  story: { title: "باغی کنار زرینه‌رود", body: ["سه نسل است که سیب می‌کاریم."], practices: ["آبیاری قطره‌ای"], sinceYear: 1370 },
  shipping: [{ method: "TIPAX", baseRial: 900_000, perKgRial: 60_000, maxWeightGrams: 30_000 }],
  kyc: { nationalId: NATIONAL_ID, sheba: SHEBA },
});
check(shop.status === 201, "shop application", shop.text);
check(JSON.stringify(shop.body).includes(NATIONAL_ID) === false, "KYC is not echoed back");
check((await admin.post(`/v1/admin/shops/${shop.body.shop.id}/approve`)).status === 201, "staff approve the shop");
seller = await signIn(sellerPhone);
const listing = await seller.post("/v1/seller/listings", {
  produceTypeId: "apple-red",
  title: "سیب قرمز آزمون انتشار",
  description: "سیب قرمز ترد و آبدار، دیروز از باغ چیده شده است.",
  grade: "GRADE_1",
  harvestedAt: new Date(Date.now() - 86_400_000).toISOString(),
  stockBase: 200_000,
  packages: [{ label: "کارتن ۵ کیلویی", netGrams: 5000, priceRial: 4_500_000 }],
});
check(listing.status === 201, "create a listing", listing.text);
const listingId = listing.body.id ?? listing.body.listing?.id;
check((await admin.post(`/v1/admin/listings/${listingId}/approve`)).status === 201, "staff approve the listing");
log("seller onboarding, KYC, listing and both staff approvals");

// --- the new listing has a real page (server-rendered, not in any build)
const page = await guest.get(`/l/${listingId}/`);
check(page.status === 200 && page.text.includes("سیب قرمز آزمون انتشار"), "product page of a listing created after the build", page.status);
check((await guest.get("/l/no-such-listing/")).status === 404, "unknown product page is a 404");
const shopPage = await guest.get(`/shop/${shop.body.shop.id}/`);
check(shopPage.status === 200 && shopPage.text.includes("باغ سیب آزمون"), "shop page of a shop approved after the build", shopPage.status);
log("product and shop pages for items created after the build; 404 for unknown ones");

// --- a buyer finds it, pays through the gateway, the seller accepts
const buyer = await signIn("09121110202");
const hits = (await buyer.get(`/v1/search?dest=tehran&q=${encodeURIComponent("سیب")}`)).body.hits;
check(hits.some((h) => h.listing.id === listingId), "search finds the new listing for Tehran", hits.map((h) => h.listing.id));
const address = await buyer.post("/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار آزمون", phone: "09121110202", line: "تهران، خیابان نمونه، پلاک ۱۲", postalCode: "1234567890" });
check(address.status === 201, "add an address", address.text);
const added = await buyer.post("/v1/cart/items?dest=tehran", { listingId, packageId: listing.body.packages?.[0]?.id ?? (await guest.get(`/v1/listings/${listingId}?dest=tehran`)).body.listing.packages[0].id, qty: 1 }, { "idempotency-key": key() });
check(added.status === 201, "add to cart", added.text);
const checkoutKey = key();
const checkout = await buyer.post("/v1/checkouts", { addressId: address.body.id, paymentMethod: "GATEWAY" }, { "idempotency-key": checkoutKey });
check(checkout.status === 201, "checkout", checkout.text);
const again = await buyer.post("/v1/checkouts", { addressId: address.body.id, paymentMethod: "GATEWAY" }, { "idempotency-key": checkoutKey });
check(again.body?.id === checkout.body.id, "a retried checkout returns the same checkout", again.body);
const pay = await buyer.post(`/v1/checkouts/${checkout.body.id}/pay`, undefined, { "idempotency-key": key() });
check(pay.status === 201 && pay.body.redirectUrl.startsWith(`${STUBS_INTERNAL}/pg/StartPay/`), "payment opens on the gateway", pay.body);
const gateway = await fetch(pay.body.redirectUrl.replace(STUBS_INTERNAL, STUBS), { redirect: "manual" });
const callback = gateway.headers.get("location");
check(gateway.status === 302 && callback?.startsWith(`${BASE}/v1/payments/callback`), "gateway sends the buyer back to the callback", callback);
const back = await buyer.get(callback);
check(back.status === 303 && back.headers.get("location")?.includes("payment=ok"), "payment verified with the gateway", back.headers.get("location"));
check((await buyer.get(callback)).headers.get("location")?.includes("payment=ok"), "a repeated gateway callback is harmless");
const orderPage = await buyer.get(new URL(back.headers.get("location")).pathname + new URL(back.headers.get("location")).search);
check(orderPage.status === 200, "order page after payment", orderPage.status);
const orders = (await buyer.get("/v1/orders")).body;
check(orders.length === 1 && orders[0].status === "AWAITING_ACCEPTANCE", "one paid order waits for the seller", orders);
log("search → cart → checkout (idempotent) → ZarinPal → verified once → order");

const accepted = await seller.post(`/v1/seller/orders/${orders[0].id}/accept`);
check(accepted.body?.status === "ACCEPTED", "seller accepts", accepted.text);
let notified = false;
for (let i = 0; i < 50 && !notified; i++) {
  notified = (await (await fetch(`${STUBS}/messages?to=${sellerPhone}`)).json()).some((m) => m.text.includes("سفارش"));
  if (!notified) await sleep(100);
}
check(notified, "the seller got an SMS about the new order");
const finance = (await admin.get("/v1/admin/finance")).body;
check(finance.receivedRial === orders[0].totalRial && finance.escrowRial === orders[0].totalRial, "money is in escrow", finance);
log("seller accepts; SMS sent; money held in escrow");

// --- a cancelled payment leaves the checkout open
const buyer2 = await signIn("09121110303");
const address2 = await buyer2.post("/v1/me/addresses", { title: "خانه", cityId: "tehran", name: "خریدار دوم", phone: "09121110303", line: "تهران، خیابان نمونه، پلاک ۱۴", postalCode: "1234567890" });
await buyer2.post("/v1/cart/items?dest=tehran", { listingId, packageId: added.body.groups[0].lines[0].pkg.id, qty: 1 }, { "idempotency-key": key() });
const checkout2 = await buyer2.post("/v1/checkouts", { addressId: address2.body.id, paymentMethod: "GATEWAY" }, { "idempotency-key": key() });
const pay2 = await buyer2.post(`/v1/checkouts/${checkout2.body.id}/pay`, undefined, { "idempotency-key": key() });
const cancelled = await fetch(`${pay2.body.redirectUrl.replace(STUBS_INTERNAL, STUBS)}?cancel=1`, { redirect: "manual" });
const back2 = await buyer2.get(cancelled.headers.get("location"));
check(back2.headers.get("location")?.includes("payment=failed"), "a cancelled payment is reported as failed", back2.headers.get("location"));
check((await buyer2.get("/v1/orders")).body.length === 0, "no order for a cancelled payment");
log("cancelled payment: no order, nothing charged");

// --- assistant (rule-based model in this stack)
const chat = await buyer.post("/v1/assistant/chat?dest=tehran", { message: "سیب میخوام" });
check(chat.status === 201 && chat.body.productCards.some((c) => c.listingId === listingId), "assistant finds the listing", chat.body);
log("assistant answers from live catalog data");

console.log(`\nall ${step} checks passed against ${BASE}`);
