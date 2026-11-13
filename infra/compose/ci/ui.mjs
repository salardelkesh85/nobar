// Release gate, part two: the three apps in a real browser against the production-mode stack, after smoke.mjs
// (it reuses that run's listing, seller and admin). Needs the playwright package and Chromium:
//   BASE=http://localhost STUBS=http://localhost:8080 node ui.mjs
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = (process.env.BASE ?? "http://localhost").replace(/\/$/, "");
const STUBS = (process.env.STUBS ?? "http://localhost:8080").replace(/\/$/, "");
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "09120000001";
const SELLER_PHONE = "09141110101";
const LISTING_TITLE = "سیب قرمز آزمون انتشار";
const SHOTS = process.env.SHOTS; // optional folder for screenshots

let step = 0;
const ok = (msg) => console.log(`✓ ${String(++step).padStart(2, "0")} ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inbox = async (phone) => (await (await fetch(`${STUBS}/messages?to=${phone}`)).json());

/** Waits for a new code SMS to `phone` (newer than `before` messages) and returns the six digits. */
async function codeFor(phone, before) {
  for (let i = 0; i < 100; i++) {
    const m = await inbox(phone);
    if (m.length > before) {
      const code = /(\d{6})/.exec(m.at(-1).text)?.[1];
      if (code) return code;
    }
    await sleep(100);
  }
  throw new Error(`no sign-in code reached ${phone}`);
}

/** Fills a phone form and submits; if the API asks to wait before a new code (resend cooldown), waits and retries. */
async function requestCode(page, phoneInput, phone, submitText) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = (await inbox(phone)).length;
    await page.fill(phoneInput, phone);
    await page.getByRole("button", { name: submitText }).click();
    try {
      return await codeFor(phone, before);
    } catch {
      const alert = await page.locator("[role=alert]").first().textContent().catch(() => "");
      if (!/ثانیه/.test(alert ?? "")) throw new Error(`no code for ${phone}: ${alert}`);
      await sleep(61_000);
    }
  }
  throw new Error(`no code for ${phone}`);
}

const browser = await chromium.launch();
const errors = [];
async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fa-IR" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    // expected: 401 while a signed-out page checks the session
    if (m.type() === "error" && !/401|Unauthorized/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
  return page;
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

try {
  // --- buyer: sign in, find the listing, add it to the cart
  const store = await newPage();
  await store.goto(`${BASE}/login/`);
  const buyerPhone = "09121110404";
  const code = await requestCode(store, "#phone", buyerPhone, "دریافت کد ورود");
  await store.fill("#code", code);
  await store.getByRole("button", { name: "تأیید و ادامه" }).click();
  // a new buyer is asked for a name once; a returning one goes straight on
  const name = store.locator("#name");
  const next = await Promise.race([
    name.waitFor({ timeout: 15_000 }).then(() => "name"),
    store.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 }).then(() => "done"),
  ]);
  if (next === "name") {
    await name.fill("خریدار مرورگر");
    await store.getByRole("button", { name: "ورود به نوبر" }).click();
  }
  await store.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
  ok("buyer signs in with the code from the SMS");

  await store.goto(`${BASE}/search/?q=${encodeURIComponent("سیب")}`);
  await store.getByText(LISTING_TITLE).first().waitFor({ timeout: 20_000 });
  await store.getByText(LISTING_TITLE).first().click();
  await store.waitForURL(/\/l\//, { timeout: 15_000 });
  await store.getByRole("heading", { name: LISTING_TITLE }).first().waitFor({ timeout: 15_000 });
  await shot(store, "product");
  await store.getByRole("button", { name: "افزودن به سبد" }).first().click();
  await store.getByText("به سبد اضافه شد").first().waitFor({ timeout: 10_000 });
  await store.goto(`${BASE}/cart/`);
  await store.getByText(LISTING_TITLE).first().waitFor({ timeout: 15_000 });
  await shot(store, "cart");
  ok("search → product page → add to cart → cart shows it");

  // --- seller panel
  const seller = await newPage();
  await seller.goto(`${BASE}/seller/`);
  const sellerCode = await requestCode(seller, "#seller-phone", SELLER_PHONE, "دریافت کد");
  await seller.fill("#seller-code", sellerCode);
  await seller.getByRole("button", { name: "ورود" }).click();
  // navigate only once signed in: leaving earlier can drop the request that sets the session cookie
  await seller.locator("#seller-code").waitFor({ state: "detached", timeout: 20_000 });
  await seller.goto(`${BASE}/seller/products/`);
  await seller.getByText(LISTING_TITLE).first().waitFor({ timeout: 20_000 });
  await shot(seller, "seller-products");
  ok("seller signs in to the panel and sees the listing");

  // --- admin panel
  const admin = await newPage();
  await admin.goto(`${BASE}/admin/`);
  const adminCode = await requestCode(admin, "#admin-phone", ADMIN_PHONE, "دریافت کد");
  await admin.fill("#admin-code", adminCode);
  await admin.getByRole("button", { name: "ورود" }).click();
  await admin.locator("#admin-code").waitFor({ state: "detached", timeout: 20_000 });
  await admin.getByRole("heading", { name: "پیشخوان" }).waitFor({ timeout: 20_000 });
  await admin.getByText("آخرین سفارش‌ها").waitFor({ timeout: 20_000 });
  await shot(admin, "admin-home");
  await admin.goto(`${BASE}/admin/shops/`);
  await admin.getByText("باغ سیب آزمون").first().waitFor({ timeout: 20_000 });
  ok("staff sign in to the admin panel; dashboard and shops load");

  if (errors.length) throw new Error(`errors in the browser:\n${errors.join("\n")}`);
  ok("no script errors in any page");
  console.log(`\nall ${step} browser checks passed against ${BASE}`);
} catch (e) {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  for (const [i, ctx] of browser.contexts().entries()) {
    for (const page of ctx.pages()) {
      console.error(`  page ${i}: ${page.url()}\n  ${(await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600)}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/failure-${i}.png` }).catch(() => undefined);
    }
  }
  if (errors.length) console.error(`errors in the browser:\n${errors.join("\n")}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
