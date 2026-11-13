// Drives the installed debug app on an Android emulator or device through Playwright's Android support
// (adb must see exactly one device). Each step saves a screenshot of the real screen to $SHOTS.
// Usage: SHOTS=/tmp/shots node apps/mobile/e2e/app.mjs
import { _android as android } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PKG = "ir.nobar.app";
const SHOTS = process.env.SHOTS ?? "shots";
mkdirSync(SHOTS, { recursive: true });

const results = [];
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [device] = await android.devices();
if (!device) throw new Error("no Android device");
console.log(`device: ${device.model()} (${device.serial()})`);

let shotNo = 0;
async function shot(name) {
  shotNo += 1;
  const file = join(SHOTS, `${String(shotNo).padStart(2, "0")}-${name}.png`);
  writeFileSync(file, await device.screenshot());
  return file;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ok  ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e) });
    console.error(`  FAIL ${name}: ${e?.message ?? e}`);
    await shot(`fail-${name.replace(/\W+/g, "-")}`).catch(() => undefined);
  }
}

await device.shell(`am force-stop ${PKG}`);
await device.shell(`am start -W -n ${PKG}/.MainActivity`);
await sleep(1500);
await shot("splash");

const webview = await device.webView({ pkg: PKG }, { timeout: 60_000 });
const page = await webview.page();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`);
});

const expectVisible = (selector, timeout = 20_000) => page.locator(selector).first().waitFor({ state: "visible", timeout });
const path = () => new URL(page.url()).pathname;

await step("home opens inside the app with the native bridge", async () => {
  await expectVisible(".nx-amazing");
  await expectVisible(".nx-brand");
  const native = await page.evaluate(() => Boolean(window.Capacitor?.isNativePlatform?.()));
  if (!native) throw new Error("Capacitor bridge missing");
  const app = await page.evaluate(() => document.documentElement.classList.contains("is-app"));
  if (!app) throw new Error("app mode is off");
  const footer = await page.locator("footer").count();
  if (footer) throw new Error("site footer is shown in the app");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`page is ${overflow}px wider than the screen`);
  await sleep(800);
  await shot("home");
});

await step("home scrolls to the product rails", async () => {
  await page.evaluate(() => window.scrollTo({ top: 900 }));
  await sleep(600);
  await shot("home-rails");
  await page.evaluate(() => window.scrollTo({ top: 0 }));
});

let productPath = "";
await step("a product card opens the product page with an app bar", async () => {
  await page.locator(".nx-amazing .nx-card-link").first().click();
  await page.waitForURL(/\/l\//, { timeout: 20_000 });
  productPath = path();
  await expectVisible(".nx-appbar");
  const title = (await page.locator(".nx-appbar-title").textContent())?.trim();
  if (title !== "جزئیات محصول") throw new Error(`app bar title: ${title}`);
  await expectVisible(".nx-buybar");
  const tabs = await page.locator(".nobar-bottom-nav").isVisible();
  if (tabs) throw new Error("bottom tabs cover the buy bar");
  await sleep(600);
  await shot("product");
});

await step("add to cart from the buy bar", async () => {
  await page.locator(".nx-buybar button").click();
  await page.getByText("به سبد اضافه شد").first().waitFor({ timeout: 10_000 });
  await shot("added-to-cart");
});

await step("reloading a product page keeps that page", async () => {
  await page.reload({ waitUntil: "load" });
  await expectVisible(".nx-appbar");
  if (path() !== productPath) throw new Error(`reloaded to ${path()}`);
  await expectVisible(".nx-buybar");
});

await step("the Android back button returns to the home page", async () => {
  await device.shell("input keyevent KEYCODE_BACK");
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15_000 });
  await expectVisible(".nx-amazing");
});

await step("search from the header", async () => {
  const box = page.locator(".nx-header-search input").first();
  await box.click();
  await box.fill("انار");
  await box.press("Enter");
  await page.waitForURL(/\/search\//, { timeout: 15_000 });
  await expectVisible(".nx-grid .nx-card");
  await expectVisible(".nx-chips");
  await sleep(600);
  await shot("search");
});

await step("filter sheet opens and the back button closes it", async () => {
  await page.getByRole("button", { name: /^فیلتر/ }).click();
  await expectVisible("dialog.nx-sheet[open]");
  await sleep(400);
  await shot("filter-sheet");
  await device.shell("input keyevent KEYCODE_BACK");
  await page.locator("dialog.nx-sheet[open]").waitFor({ state: "detached", timeout: 10_000 });
  if (!path().startsWith("/search")) throw new Error(`back left the search page: ${path()}`);
});

await step("cart tab shows the added item", async () => {
  await page.locator('.nobar-bottom-nav a[href="/cart/"], .nobar-bottom-nav a[href="/cart"]').first().click();
  await page.waitForURL(/\/cart\//, { timeout: 15_000 });
  await page.getByText("تومان").first().waitFor({ timeout: 15_000 });
  const empty = await page.getByText("سبدتان هنوز خالی است").count();
  if (empty) throw new Error("cart is empty");
  await sleep(500);
  await shot("cart");
});

await step("categories and profile tabs", async () => {
  await page.locator('.nobar-bottom-nav a[href^="/categories"]').first().click();
  await page.waitForURL(/\/categories\//, { timeout: 15_000 });
  await sleep(600);
  await shot("categories");
  await page.locator('.nobar-bottom-nav a[href^="/me"]').first().click();
  await page.waitForURL(/\/me\//, { timeout: 15_000 });
  await sleep(600);
  await shot("profile");
});

await step("dark mode", async () => {
  await device.shell("cmd uimode night yes");
  await sleep(1500);
  await page.locator('.nobar-bottom-nav a[href="/"]').first().click();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15_000 });
  await sleep(1000);
  await shot("home-dark");
  await device.shell("cmd uimode night no");
});

await step("no script errors", async () => {
  const real = errors.filter((e) => !/favicon|ERR_INTERNET_DISCONNECTED/.test(e));
  if (real.length) throw new Error(real.join("\n"));
});

await device.close();
writeFileSync(join(SHOTS, "results.json"), JSON.stringify({ results, errors }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
