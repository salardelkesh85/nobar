// Renders the launcher icons and splash images from the brand's two-leaf mark and the "نوبر" wordmark
// (Vazirmatn Black, packages/ui/fonts). Needs Playwright with Chromium: `node scripts/render-assets.cjs`.
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");
const { join } = require("node:path");

const RES = join(__dirname, "..", "android", "app", "src", "main", "res");
const FONTS = join(__dirname, "..", "..", "..", "packages", "ui", "fonts");
const FONT = "file://" + join(FONTS, "VazirmatnNobar-Black.ttf");
const FONT_REGULAR = "file://" + join(FONTS, "VazirmatnNobar-Medium.ttf");

// leaf geometry from packages/ui/src/domain.tsx (LogoMark)
const leaf = (big1, big2, small1, small2, rib) => `
<svg viewBox="-12 0 384 390" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
  <defs>
    <linearGradient id="a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${big1}"/><stop offset="1" stop-color="${big2}"/></linearGradient>
    <linearGradient id="b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${small1}"/><stop offset="1" stop-color="${small2}"/></linearGradient>
  </defs>
  <path d="M63 378 C120 300 230 210 360 220 C320 320 200 395 63 378 Z" fill="url(#b)"/>
  <path d="M10 363 C-10 250 60 60 243 5 C252 130 190 300 10 363 Z" fill="url(#a)"/>
  <path d="M20 353 Q120 190 225 33" fill="none" stroke="${rib}" stroke-width="9" stroke-linecap="round"/>
</svg>`;
const PALE = leaf("#a9dcae", "#7cc48a", "#e4f2cf", "#c6e39c", "#e3f4e3"); // on green
const GREEN = leaf("#2f8f3e", "#1f6e30", "#a6d16a", "#6fae3c", "#b9e4b9"); // on white
const GREEN_BG = "linear-gradient(145deg, #2e8b45 0%, #17602f 100%)";

/** Leaf above the wordmark; `scale` is the logo block's height as a share of the canvas height. */
const logo = ({ size, scale, mark, color, tagline }) => {
  const h = size.h * scale;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:${h * 0.02}px">
    <div style="width:${h * 0.46}px;height:${h * 0.47}px">${mark}</div>
    <div style="font-family:Vazir;font-weight:900;font-size:${h * 0.42}px;line-height:1;color:${color};margin-top:${h * 0.02}px">نوبر</div>
    ${tagline ? `<div style="font-family:Vazir;font-weight:500;font-size:${h * 0.11}px;color:#4b5a52;margin-top:${h * 0.1}px">${tagline}</div>` : ""}
  </div>`;
};

const page = (w, h, background, body, radius = 0) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
  @font-face{font-family:Vazir;src:url("${FONT}");font-weight:900}
  @font-face{font-family:Vazir;src:url("${FONT_REGULAR}");font-weight:500}
  html,body{margin:0;width:${w}px;height:${h}px;background:transparent}
  .c{width:${w}px;height:${h}px;display:grid;place-items:center;background:${background};border-radius:${radius}px;overflow:hidden}
</style></head><body><div class="c">${body}</div></body></html>`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const shot = async (html, w, h, file) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(html, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    mkdirSync(join(file, ".."), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  };

  for (const [d, k] of Object.entries(DENSITIES)) {
    // adaptive icon foreground: 108dp canvas, the logo inside the 66dp safe zone (background is the green drawable)
    const f = Math.round(108 * k);
    await shot(page(f, f, "transparent", logo({ size: { h: f }, scale: 0.4, mark: PALE, color: "#ffffff" })), f, f, join(RES, `mipmap-${d}`, "ic_launcher_foreground.png"));
    // legacy icons (Android 7): square with rounded corners, and round
    const s = Math.round(48 * k);
    await shot(page(s, s, GREEN_BG, logo({ size: { h: s }, scale: 0.56, mark: PALE, color: "#ffffff" }), s * 0.2), s, s, join(RES, `mipmap-${d}`, "ic_launcher.png"));
    await shot(page(s, s, GREEN_BG, logo({ size: { h: s }, scale: 0.52, mark: PALE, color: "#ffffff" }), s / 2), s, s, join(RES, `mipmap-${d}`, "ic_launcher_round.png"));
  }

  // Android 12+ splash icon: 288dp canvas, shown inside a 192dp circle
  await shot(page(1152, 1152, "transparent", logo({ size: { h: 1152 }, scale: 0.4, mark: GREEN, color: "#13612f" })), 1152, 1152, join(RES, "drawable-xxxhdpi", "splash_icon.png"));

  // splash for Android 7–11 (window background), every size the template ships
  const splash = [
    ["drawable", 480, 320], ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800], ["drawable-port-xhdpi", 720, 1280],
    ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920], ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480],
    ["drawable-land-xhdpi", 1280, 720], ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
  ];
  for (const [dir, w, h] of splash) {
    const base = Math.min(w, h);
    await shot(page(w, h, "#ffffff", logo({ size: { h: base }, scale: 0.42, mark: GREEN, color: "#13612f", tagline: "از باغ تا سفره" })), w, h, join(RES, dir, "splash.png"));
  }

  // a large preview for the README and store listings
  await shot(page(512, 512, GREEN_BG, logo({ size: { h: 512 }, scale: 0.52, mark: PALE, color: "#ffffff" }), 112), 512, 512, join(__dirname, "..", "icon-512.png"));
  await browser.close();
  console.log("rendered icons and splash images");
})();
