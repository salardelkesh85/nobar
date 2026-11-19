// Renders the launcher icons and splash images from the original Nobar logo (wordmark and two leaves, from the
// brand deck; packages/ui/brand). Needs Playwright with Chromium: `node scripts/render-assets.cjs`.
const { chromium } = require("playwright");
const { mkdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const RES = join(__dirname, "..", "android", "app", "src", "main", "res");
const BRAND = join(__dirname, "..", "..", "..", "packages", "ui", "brand");
const FONT = "file://" + join(__dirname, "..", "..", "..", "packages", "ui", "fonts", "VazirmatnNobar-Medium.ttf");
const dataUri = (file) => "data:image/png;base64," + readFileSync(join(BRAND, file)).toString("base64");
const WHITE = dataUri("nobar-logo-white.png"); // on green
const GREEN = dataUri("nobar-logo.png"); // on white
const RATIO = 1299 / 523; // logo width / height
const GREEN_BG = "linear-gradient(145deg, #2e8b45 0%, #17602f 100%)";

/** The logo `w` pixels wide, centred, with an optional tagline under it. */
const logo = (src, w, tagline) => `<div style="display:flex;flex-direction:column;align-items:center">
  <img src="${src}" style="width:${w}px;height:${w / RATIO}px;display:block">
  ${tagline ? `<div style="font-family:Vazir;font-size:${w * 0.075}px;color:#4b5a52;margin-top:${w * 0.09}px">${tagline}</div>` : ""}
</div>`;

const page = (w, h, background, body, radius = 0) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
  @font-face{font-family:Vazir;src:url("${FONT}")}
  html,body{margin:0;width:${w}px;height:${h}px;background:transparent}
  .c{width:${w}px;height:${h}px;display:grid;place-items:center;background:${background};border-radius:${radius}px;overflow:hidden}
</style></head><body><div class="c">${body}</div></body></html>`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const p = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const shot = async (html, w, h, file) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(html, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    mkdirSync(join(file, ".."), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  };

  for (const [d, k] of Object.entries(DENSITIES)) {
    // adaptive icon foreground: 108dp canvas; the logo stays inside the 66dp safe circle (background: green drawable)
    const f = Math.round(108 * k);
    await shot(page(f, f, "transparent", logo(WHITE, f * 0.56)), f, f, join(RES, `mipmap-${d}`, "ic_launcher_foreground.png"));
    // legacy icons (Android 7): rounded square and round
    const s = Math.round(48 * k);
    await shot(page(s, s, GREEN_BG, logo(WHITE, s * 0.8), s * 0.2), s, s, join(RES, `mipmap-${d}`, "ic_launcher.png"));
    await shot(page(s, s, GREEN_BG, logo(WHITE, s * 0.72), s / 2), s, s, join(RES, `mipmap-${d}`, "ic_launcher_round.png"));
  }

  // Android 12+ splash icon: 288dp canvas shown inside a 192dp circle
  await shot(page(1152, 1152, "transparent", logo(GREEN, 1152 * 0.5)), 1152, 1152, join(RES, "drawable-xxxhdpi", "splash_icon.png"));

  // splash for Android 7–11 (window background), every size the template ships
  const splash = [
    ["drawable", 480, 320], ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800], ["drawable-port-xhdpi", 720, 1280],
    ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920], ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480],
    ["drawable-land-xhdpi", 1280, 720], ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
  ];
  for (const [dir, w, h] of splash) {
    await shot(page(w, h, "#ffffff", logo(GREEN, Math.min(w, h) * 0.55, "از باغ تا سفره")), w, h, join(RES, dir, "splash.png"));
  }

  // a large preview for the README and store listings
  await shot(page(512, 512, GREEN_BG, logo(WHITE, 400), 112), 512, 512, join(__dirname, "..", "icon-512.png"));
  await browser.close();
  console.log("rendered icons and splash images");
})();
