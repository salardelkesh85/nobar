// Builds docs/seminar/Nobar-Seminar.pptx — the Persian (RTL) seminar deck for Nobar.
// Run: pnpm deck   (from the repo root)
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const JSZip = require("jszip");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const Lu = require("react-icons/lu");

const OUT = path.resolve(__dirname, "../../docs/seminar/Nobar-Seminar.pptx");

const THEME = {
  name: "Nobar Orchard",
  headFontFace: "Segoe UI",
  bodyFontFace: "Segoe UI",
  colors: {
    dk1: "17301E", // near-black green: body text
    lt1: "FFFFFF",
    dk2: "1F4D2B", // forest: dominant dark
    lt2: "EEF5EA", // mint tint: cards
    accent1: "2E7D32", // leaf green
    accent2: "F28C38", // apricot: the one sharp accent
    accent3: "7CB342", // young leaf
    accent4: "D9534F", // pomegranate: failure / compensation
    accent5: "F4C542", // saffron
    accent6: "7E57C2", // fig
    hlink: "2E7D32",
    folHlink: "7E57C2",
  },
};
const SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
const HEX = THEME.colors; // only for options that take hex (icons, shadows, chart colors)
const MUTED = "5E6E62";
const FONT = THEME.bodyFontFace;

const W = 13.333;
const H = 7.5;
const MX = 0.6;
const CW = W - 2 * MX;
const RIGHT = W - MX;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.rtlMode = true;
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "نوبر — معماری سیستم";
pres.subject = "سمینار مهندسی نرم‌افزار";
pres.author = "Nobar";
const C = pres.SchemeColor;

// ---------- helpers ----------
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (v) => String(v).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);

const shadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 90, color: HEX.dk2, opacity: 0.14 });
const noLine = () => ({ type: "none" });

function text(slide, t, x, y, w, h, o = {}) {
  const opts = {
    x, y, w, h,
    margin: 0,
    rtlMode: true,
    align: "right",
    valign: "top",
    lang: "fa-IR",
    fontSize: 14,
    color: C.text1,
    isTextBox: true,
    ...o,
  };
  // Paragraph direction is read from each run's own options, so arrays of runs must carry
  // rtlMode/align themselves or Persian bullets and mixed-script runs come out scrambled.
  const runs = Array.isArray(t)
    ? t.map((r) => ({ text: r.text, options: { rtlMode: opts.rtlMode, lang: opts.lang, align: opts.align, ...(r.options || {}) } }))
    : t;
  slide.addText(runs, opts);
}
function ltr(slide, t, x, y, w, h, o = {}) {
  text(slide, t, x, y, w, h, { rtlMode: false, align: "left", lang: "en-US", ...o });
}

function box(slide, x, y, w, h, o = {}) {
  const { fill = C.background2, line, r = 0.12, shadowed = false, transparency, name } = o;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    rectRadius: r,
    fill: transparency === undefined ? { color: fill } : { color: fill, transparency },
    line: line || noLine(),
    shadow: shadowed ? shadow() : undefined,
    objectName: name,
  });
}

function arrow(slide, x1, y1, x2, y2, color = C.text2, o = {}) {
  // Lines are drawn left→right / top→bottom; the head goes at the requested end.
  const toLeft = x2 < x1;
  const toUp = y2 < y1;
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
    line: {
      color,
      width: o.width || 1.75,
      dashType: o.dash || "solid",
      ...(toLeft || toUp ? { beginArrowType: "triangle" } : { endArrowType: "triangle" }),
    },
  });
}

const iconCache = new Map();
async function iconData(name, colorHex = "FFFFFF") {
  const key = `${name}:${colorHex}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const Comp = Lu[name];
  if (!Comp) throw new Error(`Unknown icon react-icons/lu.${name}`);
  const svg = renderToStaticMarkup(React.createElement(Comp, { size: 256, color: `#${colorHex}` }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = `image/png;base64,${png.toString("base64")}`;
  iconCache.set(key, data);
  return data;
}
async function icon(slide, name, x, y, size, colorHex) {
  slide.addImage({ data: await iconData(name, colorHex), x, y, w: size, h: size, altText: name });
}
async function iconCircle(slide, name, x, y, d, fill = C.accent1, iconHex = "FFFFFF") {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: noLine() });
  const s = d * 0.56;
  await icon(slide, name, x + (d - s) / 2, y + (d - s) / 2, s, iconHex);
}

function contentSlide(section, title, lead, notes) {
  const s = pres.addSlide({ masterName: "NOBAR_CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title", rtlMode: true, lang: "fa-IR" });
  if (lead) s.addText(lead, { placeholder: "lead", rtlMode: true, lang: "fa-IR", bullet: false });
  if (notes) s.addNotes(notes);
  return s;
}

// RTL grid: index 0 is the right-most column.
const colX = (i, colW, gap, right = RIGHT) => right - colW - i * (colW + gap);

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "NOBAR_DARK",
  background: { color: C.text2 },
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: 4.9, y: 1.25, w: 7.83, h: 1.35, fontSize: 60, bold: true, color: C.background1, align: "right", valign: "bottom", margin: 0 },
        text: "",
      },
    },
    {
      placeholder: {
        options: { name: "body", type: "body", x: 4.9, y: 3.55, w: 7.83, h: 1.5, fontSize: 20, color: C.background1, align: "right", valign: "top", margin: 0 },
        text: "",
      },
    },
  ],
});

pres.defineSlideMaster({
  title: "NOBAR_CONTENT",
  background: { color: C.background1 },
  margin: [0.5, MX, 0.6, MX],
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: MX, y: 0.35, w: CW, h: 0.75, fontSize: 30, bold: true, color: C.text2, align: "right", valign: "middle", margin: 0 },
        text: "",
      },
    },
    {
      placeholder: {
        options: { name: "lead", type: "body", x: MX, y: 1.1, w: CW, h: 0.45, fontSize: 16, color: MUTED, align: "right", valign: "top", margin: 0 },
        text: "",
      },
    },
    {
      text: {
        text: "نوبر · از باغ تا سفره",
        options: { x: RIGHT - 4, y: 6.98, w: 4, h: 0.3, fontSize: 10, color: MUTED, align: "right", rtlMode: true, lang: "fa-IR", margin: 0 },
      },
    },
  ],
  slideNumber: { x: MX, y: 6.98, w: 0.8, h: 0.3, fontSize: 10, color: MUTED, align: "left" },
});

// ---------- slides ----------
async function s01Title() {
  const s = pres.addSlide({ masterName: "NOBAR_DARK", sectionTitle: "مقدمه" });
  s.addText("نوبر", { placeholder: "title", rtlMode: true, lang: "fa-IR" });
  text(s, "از باغ تا سفره", 4.9, 2.62, 7.83, 0.65, { fontSize: 28, bold: true, color: C.accent2, valign: "middle" });
  s.addText("معماری Cloud-Native یک بازار آنلاین چندفروشنده‌ی میوه و سبزیجات، هر فروشنده از شهر خودش، همراه با دستیار هوشمند خرید", {
    placeholder: "body", rtlMode: true, lang: "fa-IR", bullet: false,
  });
  text(s, "سمینار درس مهندسی نرم‌افزار · پاییز ۱۴۰۵", 4.9, 6.25, 7.83, 0.4, { fontSize: 14, color: C.background2 });

  // orchard composition
  await iconCircle(s, "LuCitrus", 1.55, 1.2, 2.0, C.accent2);
  await iconCircle(s, "LuCherry", 0.75, 3.45, 1.35, C.accent4);
  await iconCircle(s, "LuSprout", 2.45, 3.55, 1.65, C.accent3);
  await iconCircle(s, "LuCarrot", 3.75, 2.2, 1.0, C.accent5, HEX.dk2);
  await iconCircle(s, "LuGrape", 1.55, 5.35, 1.05, C.accent6);
  s.addNotes(
    "سلام. موضوع ارائه‌ی ما «نوبر» است: یک بازار آنلاین چندفروشنده برای میوه و سبزیجات که باغدار و کشاورز هر شهر را مستقیم به خریدار همان شهر وصل می‌کند. " +
      "تمرکز ارائه روی معماری است: چطور با Docker، Kubernetes، الگوهای سیستم‌های توزیع‌شده و یک لایه‌ی هوش مصنوعی امن، این سیستم را طراحی کرده‌ایم."
  );
}

async function s02Why() {
  const s = contentSlide(
    "مقدمه",
    "چرا نوبر؟",
    "محصول فسادپذیر است؛ پس تازگی، سرعت و اعتماد مهم‌ترین ارزش‌های سیستم‌اند",
    "کالای ما فسادپذیر است و همین همه‌ی تصمیم‌های معماری را شکل می‌دهد. فروشنده و خریدار در یک شهرند، پس تحویل سریع ممکن است. " +
      "سه ارزش اصلی را می‌بینید: تازگی که با تاریخ برداشت روی هر محصول نشان داده می‌شود، سرعت که با محدود کردن همه‌چیز به شهر به دست می‌آید، و اعتماد که با نظرهای واقعی و قیمت دقیق ساخته می‌شود."
  );
  const nodes = [
    { icon: "LuStore", label: "فروشنده‌ی محلی", sub: "باغدار، کشاورز، غرفه‌دار", fill: C.accent1 },
    { icon: "LuSprout", label: "نوبر", sub: "جستجو، سفارش، پرداخت، ارسال", fill: C.accent2 },
    { icon: "LuUsers", label: "خریدار همان شهر", sub: "تازه، سریع، مطمئن", fill: C.accent1 },
  ];
  const centers = [RIGHT - 1.6, W / 2, MX + 1.6];
  const d = 1.0;
  for (let i = 0; i < nodes.length; i++) {
    const cx = centers[i];
    await iconCircle(s, nodes[i].icon, cx - d / 2, 1.85, d, nodes[i].fill);
    text(s, nodes[i].label, cx - 1.6, 2.95, 3.2, 0.4, { fontSize: 17, bold: true, align: "center", color: C.text2 });
    text(s, nodes[i].sub, cx - 1.6, 3.33, 3.2, 0.35, { fontSize: 13, align: "center", color: MUTED });
    if (i < nodes.length - 1) arrow(s, cx - d / 2 - 0.25, 2.35, centers[i + 1] + d / 2 + 0.25, 2.35, C.text2);
  }

  const cards = [
    { icon: "LuLeaf", title: "تازگی", body: "تاریخ برداشت و «ساعت تازگی» روی هر محصول؛ نوبر یعنی نخستین میوه‌ی فصل", fill: C.accent3 },
    { icon: "LuTruck", title: "سرعت تحویل", body: "فروشنده و خریدار در یک شهر؛ محدوده‌ی ارسال و بازه‌ی زمانی تحویل مشخص", fill: C.accent2 },
    { icon: "LuShieldCheck", title: "اعتماد", body: "قیمت و موجودی دقیق، نظر فقط از خرید واقعی، پرداخت امن و قابل ممیزی", fill: C.accent1 },
  ];
  const cw = (CW - 2 * 0.35) / 3;
  for (let i = 0; i < cards.length; i++) {
    const x = colX(i, cw, 0.35);
    const y = 4.1;
    box(s, x, y, cw, 2.55, { shadowed: true });
    await iconCircle(s, cards[i].icon, x + cw - 0.3 - 0.7, y + 0.3, 0.7, cards[i].fill);
    text(s, cards[i].title, x + 0.3, y + 0.3, cw - 1.5, 0.7, { fontSize: 20, bold: true, color: C.text2, valign: "middle" });
    text(s, cards[i].body, x + 0.3, y + 1.2, cw - 0.6, 1.15, { fontSize: 15 });
  }
}

async function s03Principles() {
  const s = contentSlide(
    "مقدمه",
    "اصول طراحی",
    "هفت اصل که همه‌ی تصمیم‌های فنی از آن‌ها پیروی می‌کنند",
    "این هفت اصل معیار ما برای هر تصمیم فنی بوده‌اند. دو مورد مخصوص نوبر است: City-First یعنی تقریباً همه‌چیز، از جستجو تا موجودی و ارسال، بر اساس شهر تقسیم می‌شود؛ " +
      "و Persian-First یعنی رابط راست‌به‌چپ، تقویم شمسی، تومان و درگاه‌های پرداخت ایرانی از روز اول در طراحی هستند، نه بعداً."
  );
  const items = [
    ["LuCloud", "Cloud-Native", "کانتینری، بدون وضعیت، مقیاس‌پذیر افقی و خودترمیم", C.accent1],
    ["LuBoxes", "Domain-Driven", "مرز سرویس‌ها همان مرز دامنه‌های کسب‌وکار است", C.accent1],
    ["LuZap", "Event-Driven", "ارتباط ناهمگام با رویداد برای کاهش وابستگی", C.accent1],
    ["LuMapPin", "City-First", "جستجو، موجودی و ارسال بر اساس شهر تقسیم می‌شوند", C.accent2],
    ["LuSparkles", "AI-Native", "هوش مصنوعی بخشی از تجربه‌ی اصلی خرید است، نه افزونه", C.accent2],
    ["LuLanguages", "Persian-First", "راست‌به‌چپ، تقویم شمسی، تومان، درگاه ایرانی", C.accent2],
    ["LuLock", "Security by Default", "حداقل دسترسی، رمزنگاری و ممیزی در همه‌ی لایه‌ها", C.text2],
  ];
  const cw = (CW - 3 * 0.3) / 4;
  const ch = 2.3;
  for (let i = 0; i < items.length; i++) {
    const row = i < 4 ? 0 : 1;
    const col = row === 0 ? i : i - 4;
    const rowRight = row === 0 ? RIGHT : (W + (3 * cw + 2 * 0.3)) / 2;
    const x = colX(col, cw, 0.3, rowRight);
    const y = row === 0 ? 1.85 : 4.4;
    const [ic, name, desc, fill] = items[i];
    box(s, x, y, cw, ch, { shadowed: true });
    await iconCircle(s, ic, x + cw - 0.25 - 0.6, y + 0.25, 0.6, fill);
    text(s, name, x + 0.25, y + 0.98, cw - 0.5, 0.4, { fontSize: 16, bold: true, color: C.text2 });
    text(s, desc, x + 0.25, y + 1.42, cw - 0.5, 0.8, { fontSize: 14 });
  }
}

async function s04Quality() {
  const s = contentSlide(
    "مقدمه",
    "اهداف کیفی قابل اندازه‌گیری",
    "معماری برای رسیدن به این اعداد طراحی شده است، نه برعکس",
    "به جای صفت‌های کلی مثل «سریع» یا «قابل اعتماد»، هدف‌های قابل اندازه‌گیری تعریف کرده‌ایم. " +
      "عدد صفر را دقت کنید: مدل زبانی هیچ‌وقت مستقیم به دیتابیس دسترسی ندارد و فقط از ابزارهای اعتبارسنجی‌شده استفاده می‌کند. جدول پایین نشان می‌دهد هر ویژگی کیفی با چه سازوکاری تأمین می‌شود."
  );
  const stats = [
    ["۹۹٫۵٪", "دسترس‌پذیری ثبت سفارش (SLO)"],
    ["۳۰۰", "میلی‌ثانیه، سقف زمان پاسخ ۹۵٪ جستجوها"],
    ["۱۳", "سرویس مستقل، هرکدام با دیتابیس خودش"],
    ["صفر", "دسترسی مستقیم هوش مصنوعی به دیتابیس"],
  ];
  const cw = (CW - 3 * 0.3) / 4;
  stats.forEach(([num, label], i) => {
    const x = colX(i, cw, 0.3);
    box(s, x, 1.85, cw, 1.75);
    text(s, num, x + 0.2, 1.95, cw - 0.4, 0.9, { fontSize: 44, bold: true, color: i === 3 ? C.accent2 : C.accent1, align: "center", valign: "middle" });
    text(s, label, x + 0.2, 2.9, cw - 0.4, 0.6, { fontSize: 14, color: MUTED, align: "center" });
  });

  const head = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, align: "right", rtlMode: true, lang: "fa-IR" } });
  const cell = (t, i, bold = false) => ({
    text: t,
    options: { bold, color: bold ? C.text2 : C.text1, fill: { color: i % 2 ? C.background1 : C.background2 }, align: "right", rtlMode: true, lang: "fa-IR" },
  });
  const rows = [
    ["تازگی و سرعت", "رویدادهای لحظه‌ای، رزرو موجودی، جستجوی محدود به شهر"],
    ["اعتماد", "ریال صحیح، دفتر کل دوطرفه، ممیزی؛ واقعیت‌ها فقط از ابزار"],
    ["دسترس‌پذیری", "Saga با جبران، Circuit Breaker، تخریب تدریجی"],
    ["مقیاس‌پذیری", "سرویس‌های بدون‌وضعیت، HPA و KEDA، CDN"],
    ["تکامل‌پذیری", "قراردادهای نسخه‌دار، رابط‌های قابل تعویض، ADR"],
  ];
  const table = [[head("سازوکار در معماری"), head("ویژگی کیفی")], ...rows.map(([q, m], i) => [cell(m, i), cell(q, i, true)])];
  s.addTable(table, {
    x: MX, y: 3.9, w: CW, colW: [CW - 3.0, 3.0], rowH: 0.45,
    fontSize: 14, valign: "middle", margin: [0, 0.15, 0, 0.15],
    border: { type: "solid", pt: 1, color: HEX.lt1 },
  });
}

async function s05Overview() {
  const s = contentSlide(
    "معماری",
    "نمای کلی معماری",
    "یک ورودی عمومی، سرویس‌های مستقل، گذرگاه رویداد و داده‌ی جدا برای هر سرویس",
    "از بالا به پایین: کاربران از وب، پنل‌ها یا ربات تلگرام وارد می‌شوند. همه‌ی ترافیک از CDN و WAF و سپس از API Gateway عبور می‌کند؛ این تنها نقطه‌ی عمومی سیستم است. " +
      "زیر آن سیزده سرویس دامنه و دو سرویس هوش مصنوعی قرار دارند. سرویس‌ها تغییرات را به‌صورت رویداد روی گذرگاه منتشر می‌کنند و هر سرویس پایگاه داده‌ی مخصوص خودش را دارد."
  );
  const cx = W / 2;
  // L1 clients
  const clients = ["وب و PWA · Next.js", "پنل فروشنده", "پنل ادمین", "ربات تلگرام"];
  const pw = 2.55;
  const pGap = 0.25;
  const pRight = cx + (4 * pw + 3 * pGap) / 2;
  clients.forEach((c, i) => {
    const x = colX(i, pw, pGap, pRight);
    box(s, x, 1.8, pw, 0.48, { fill: C.background2, r: 0.24 });
    text(s, c, x, 1.8, pw, 0.48, { fontSize: 13, align: "center", valign: "middle", bold: true, color: C.text2 });
  });
  arrow(s, cx, 2.3, cx, 2.55);
  // L2 edge
  const gwW = 6.0;
  const cdnW = 3.0;
  const eGap = 0.6;
  const eLeft = cx - (gwW + cdnW + eGap) / 2;
  box(s, eLeft + gwW + eGap, 2.57, cdnW, 0.55, { fill: C.background2 });
  ltr(s, "CDN + WAF", eLeft + gwW + eGap, 2.57, cdnW, 0.55, { fontSize: 14, bold: true, align: "center", valign: "middle", color: C.text2 });
  box(s, eLeft, 2.57, gwW, 0.55, { fill: C.text2 });
  text(s, "API Gateway (Kong) + BFF · احراز هویت، Rate Limit، مسیریابی", eLeft, 2.57, gwW, 0.55, { fontSize: 14, bold: true, align: "center", valign: "middle", color: C.background1 });
  arrow(s, eLeft + gwW + eGap, 2.845, eLeft + gwW, 2.845);
  arrow(s, cx, 3.14, cx, 3.36);
  // L3 services
  const rowA = ["Identity", "Seller", "Catalog", "Search", "Cart", "Order", "Payment"];
  const rowB = ["Delivery", "Review", "Notification", "Analytics", "Admin", "AI Gateway", "AI Workers"];
  const sw = (CW - 6 * 0.12) / 7;
  [rowA, rowB].forEach((row, r) => {
    row.forEach((name, i) => {
      const x = colX(i, sw, 0.12);
      const y = 3.38 + r * 0.6;
      const ai = name.startsWith("AI");
      box(s, x, y, sw, 0.48, { fill: C.background1, line: { color: ai ? HEX.accent2 : HEX.accent1, width: 1.25 }, r: 0.08 });
      ltr(s, name, x, y, sw, 0.48, { fontSize: 13, bold: true, align: "center", valign: "middle", color: ai ? C.accent2 : C.text2 });
    });
  });
  arrow(s, cx, 4.48, cx, 4.68);
  // L4 bus
  box(s, MX, 4.7, CW, 0.52, { fill: C.accent1 });
  text(s, "گذرگاه رویداد · NATS JetStream · رویدادهای نسخه‌دار با الگوی Outbox", MX, 4.7, CW, 0.52, { fontSize: 15, bold: true, align: "center", valign: "middle", color: C.background1 });
  arrow(s, cx, 5.24, cx, 5.44);
  // L5 data
  const stores = [
    [{ text: "PostgreSQL", options: { breakLine: true } }, { text: "PostGIS · pgvector" }],
    "Redis",
    "OpenSearch",
    "MinIO / S3",
    "ClickHouse",
  ];
  const dw = (CW - 4 * 0.25) / 5;
  stores.forEach((st, i) => {
    const x = colX(i, dw, 0.25);
    s.addShape(pres.shapes.CAN, { x, y: 5.46, w: dw, h: 0.8, fill: { color: C.background2 }, line: { color: HEX.dk2, width: 1 } });
    ltr(s, st, x, 5.62, dw, 0.6, { fontSize: 12, bold: true, align: "center", valign: "middle", color: C.text2 });
  });
  text(s, "فقط Gateway عمومی است؛ سرویس‌ها تنها از داخل کلاستر در دسترس‌اند (NetworkPolicy)", MX, 6.42, CW, 0.35, { fontSize: 13, color: MUTED });
}

async function s06Contexts() {
  const s = contentSlide(
    "معماری",
    "سرویس‌ها و مرزهای دامنه",
    "هر Bounded Context یک سرویس است با داده‌ای که فقط مال خودش است",
    "سرویس‌ها را با طراحی دامنه‌محور تقسیم کرده‌ایم. بخش «هسته» مزیت رقابتی ماست: کاتالوگ و تازگی، سفارش چندفروشنده و لایه‌ی هوشمند. " +
      "بخش‌های پشتیبان برای کسب‌وکار لازم‌اند و بخش‌های عمومی را می‌شد حتی خرید. قانون طلایی: هیچ سرویسی به دیتابیس سرویس دیگر دسترسی ندارد."
  );
  const cols = [
    {
      title: "هسته", sub: "مزیت رقابتی", fill: C.accent2,
      items: [["catalog", "محصول، موجودی، تاریخ برداشت"], ["cart · order", "سبد خرید و سفارش چندفروشنده"], ["search · ai-gateway", "جستجو، دستیار خرید، مقایسه"]],
    },
    {
      title: "پشتیبان", sub: "لازم برای کسب‌وکار", fill: C.accent1,
      items: [["seller", "احراز و تأیید فروشنده"], ["payment", "درگاه، کمیسیون، تسویه"], ["delivery", "محدوده، اسلات، پیک"], ["review", "نظر فقط از خرید تأییدشده"], ["admin", "شهرها، اختلاف‌ها، تنظیمات"]],
    },
    {
      title: "عمومی", sub: "قابل خرید یا جایگزینی", fill: C.text2,
      items: [["identity", "ورود با OTP، توکن JWT، نقش‌ها"], ["notification", "پیامک، تلگرام، Push، ایمیل"], ["analytics", "رویدادهای رفتاری در ClickHouse"]],
    },
  ];
  const cw = (CW - 2 * 0.35) / 3;
  cols.forEach((c, i) => {
    const x = colX(i, cw, 0.35);
    box(s, x, 1.8, cw, 4.15, { fill: C.background2 });
    box(s, x, 1.8, cw, 0.8, { fill: c.fill });
    text(s, [
      { text: c.title, options: { bold: true, fontSize: 20, color: C.background1 } },
      { text: `  ·  ${c.sub}`, options: { fontSize: 14, color: C.background1 } },
    ], x + 0.25, 1.8, cw - 0.5, 0.8, { valign: "middle" });
    c.items.forEach(([svc, desc], j) => {
      const y = 2.78 + j * 0.62;
      ltr(s, svc, x + 0.25, y, cw - 0.5, 0.3, { fontSize: 14, bold: true, color: C.text2, align: "right" });
      text(s, desc, x + 0.25, y + 0.29, cw - 0.5, 0.3, { fontSize: 13, color: MUTED });
    });
  });
  box(s, MX, 6.1, CW, 0.65, { fill: C.background1, line: { color: HEX.accent4, width: 1.25 } });
  await iconCircle(s, "LuLock", RIGHT - 0.2 - 0.45, 6.2, 0.45, C.accent4);
  text(s, [
    { text: "قانون طلایی: ", options: { bold: true, color: C.accent4 } },
    { text: "هیچ سرویسی به دیتابیس سرویس دیگر دسترسی ندارد؛ ارتباط فقط با API و رویداد" },
  ], MX + 0.3, 6.1, CW - 1.1, 0.65, { fontSize: 15, valign: "middle" });
}

async function s07Comms() {
  const s = contentSlide(
    "معماری",
    "ارتباط همگام و ناهمگام",
    "پرسشی که همین حالا جواب می‌خواهد با REST؛ «اتفاقی افتاد» با رویداد",
    "قاعده‌ی ما ساده است: اگر جواب را همین حالا لازم داریم، مثل اعتبارسنجی قیمت سبد، از REST با تایم‌اوت و Circuit Breaker استفاده می‌کنیم. " +
      "اگر فقط باید خبر بدهیم که چیزی اتفاق افتاده، رویداد منتشر می‌کنیم. پاکت رویدادها با استاندارد CloudEvents سازگار است و شناسه‌ی شهر و trace را هم حمل می‌کند."
  );
  const pw = (CW - 0.4) / 2;
  const xr = RIGHT - pw;
  const xl = MX;
  // sync (right)
  box(s, xr, 1.8, pw, 4.95, { fill: C.background2 });
  await iconCircle(s, "LuArrowLeftRight", xr + pw - 0.3 - 0.6, 2.0, 0.6, C.accent1);
  text(s, "همگام · REST + OpenAPI", xr + 0.3, 2.0, pw - 1.4, 0.6, { fontSize: 20, bold: true, color: C.text2, valign: "middle" });
  text(s, [
    { text: "درخواست کاربر از Gateway به سرویس مالک داده", options: { bullet: true, breakLine: true } },
    { text: "پرسشی که همین حالا جواب می‌خواهد؛ مثلاً اعتبارسنجی قیمت سبد", options: { bullet: true, breakLine: true } },
    { text: "فرمان‌های Saga همراه با Idempotency-Key", options: { bullet: true } },
  ], xr + 0.3, 2.8, pw - 0.6, 1.7, { fontSize: 15, paraSpaceAfter: 8 });
  box(s, xr + 0.3, 4.65, pw - 0.6, 1.85, { fill: C.background1 });
  text(s, [
    { text: "محافظ‌ها", options: { bold: true, color: C.accent1, breakLine: true } },
    { text: "تایم‌اوت ۲ ثانیه برای هر فراخوانی", options: { bullet: true, breakLine: true } },
    { text: "Retry فقط برای عملیات idempotent", options: { bullet: true, breakLine: true } },
    { text: "Circuit Breaker و حداکثر ۲ پرش همگام", options: { bullet: true } },
  ], xr + 0.5, 4.8, pw - 1.0, 1.6, { fontSize: 14, paraSpaceAfter: 4 });
  // async (left)
  box(s, xl, 1.8, pw, 4.95, { fill: C.background2 });
  await iconCircle(s, "LuZap", xl + pw - 0.3 - 0.6, 2.0, 0.6, C.accent2);
  text(s, "ناهمگام · رویداد", xl + 0.3, 2.0, pw - 1.4, 0.6, { fontSize: 20, bold: true, color: C.text2, valign: "middle" });
  text(s, [
    { text: "تحویل حداقل‌یک‌بار؛ مصرف‌کننده‌ی idempotent با جدول inbox", options: { bullet: true, breakLine: true } },
    { text: "ترتیب تضمینی برای هر aggregate؛ صف خطا (DLQ)", options: { bullet: true, breakLine: true } },
    { text: "رویدادها نسخه‌دارند و قراردادشان تست می‌شود", options: { bullet: true } },
  ], xl + 0.3, 2.8, pw - 0.6, 1.7, { fontSize: 15, paraSpaceAfter: 8 });
  box(s, xl + 0.3, 4.65, pw - 0.6, 1.85, { fill: C.text2 });
  ltr(s, [
    { text: "{", options: { breakLine: true } },
    { text: '  "type": "order.placed",', options: { breakLine: true } },
    { text: '  "id": "0192b7e0-…",', options: { breakLine: true } },
    { text: '  "subject": "order/0192b7d1",', options: { breakLine: true } },
    { text: '  "nobarcityid": "tehran",', options: { breakLine: true } },
    { text: '  "data": { … }', options: { breakLine: true } },
    { text: "}" },
  ], xl + 0.55, 4.75, pw - 1.1, 1.7, { fontSize: 12, fontFace: "Consolas", color: C.background2, valign: "middle" });
}

async function s08Saga() {
  const s = contentSlide(
    "الگوها و داده",
    "Saga ثبت سفارش",
    "هر قدم یک عمل جبرانی دارد؛ شکست در هر نقطه سیستم را سازگار نگه می‌دارد",
    "در سیستم توزیع‌شده تراکنش واحد نداریم، پس از الگوی Saga استفاده می‌کنیم. سرویس order هماهنگ‌کننده است: موجودی را رزرو می‌کند، پرداخت می‌گیرد، منتظر تأیید فروشنده می‌ماند و ارسال را شروع می‌کند. " +
      "ردیف قرمز نشان می‌دهد اگر هر قدم شکست بخورد، چه چیزی جبران می‌شود. مثلاً اگر فروشنده سفارش را رد کند، پول برگشت داده و موجودی آزاد می‌شود."
  );
  const steps = [
    ["رزرو موجودی", "catalog"],
    ["پرداخت", "payment"],
    ["تأیید فروشنده", "seller"],
    ["ارسال", "delivery"],
    ["تحویل", "order · DELIVERED"],
  ];
  const comp = [
    "ناموجود: پاسخ ۴۰۹، چیزی برای جبران نیست",
    "آزادسازی رزرو موجودی",
    "بازپرداخت و برگرداندن موجودی",
    "لغو ارسال و بازپرداخت",
  ];
  const gap = 0.45;
  const sw = (CW - 4 * gap) / 5;
  for (let i = 0; i < steps.length; i++) {
    const x = colX(i, sw, gap);
    box(s, x, 1.85, sw, 1.25, { fill: C.background1, line: { color: HEX.accent1, width: 1.5 }, shadowed: true });
    s.addShape(pres.shapes.OVAL, { x: x + sw - 0.15 - 0.42, y: 1.97, w: 0.42, h: 0.42, fill: { color: C.accent1 }, line: noLine() });
    text(s, fa(i + 1), x + sw - 0.15 - 0.42, 1.97, 0.42, 0.42, { fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, steps[i][0], x + 0.15, 2.42, sw - 0.3, 0.38, { fontSize: 17, bold: true, color: C.text2 });
    ltr(s, steps[i][1], x + 0.15, 2.76, sw - 0.3, 0.28, { fontSize: 12, color: MUTED, align: "right" });
    if (i < steps.length - 1) arrow(s, x - 0.06, 2.475, x - gap + 0.06, 2.475, C.accent1);
    if (i < comp.length) {
      arrow(s, x + sw / 2, 3.12, x + sw / 2, 3.72, C.accent4, { dash: "dash", width: 1.25 });
      box(s, x, 3.75, sw, 1.0, { fill: C.accent4, transparency: 86 });
      text(s, comp[i], x + 0.15, 3.75, sw - 0.3, 1.0, { fontSize: 14, valign: "middle", align: "center" });
    } else {
      box(s, x, 3.75, sw, 1.0, { fill: C.accent1, transparency: 86 });
      ltr(s, "order.delivered ✓", x + 0.1, 3.75, sw - 0.2, 1.0, { fontSize: 14, bold: true, color: C.accent1, align: "center", valign: "middle" });
    }
  }
  text(s, "جبران در صورت شکست", RIGHT - 3.5, 3.27, 3.5 - (sw / 2 + 0.15), 0.35, { fontSize: 12, bold: true, color: C.accent4 });

  const iw = (CW - 0.35) / 2;
  const info = [
    ["LuWorkflow", "چرا Orchestration؟", "جریان چندمرحله‌ای با تایم‌اوت و جبران نیاز به دید متمرکز دارد؛ وضعیت Saga ذخیره می‌شود و بعد از خرابی ادامه می‌یابد."],
    ["LuShoppingCart", "یک پرداخت، چند سفارش", "خریدار یک بار پرداخت می‌کند؛ سبد به ازای هر فروشنده به یک سفارش جدا تقسیم می‌شود تا هر فروشنده مستقل تأیید و ارسال کند."],
  ];
  for (let i = 0; i < info.length; i++) {
    const x = colX(i, iw, 0.35);
    box(s, x, 5.05, iw, 1.7, { fill: C.background2 });
    await iconCircle(s, info[i][0], x + iw - 0.25 - 0.55, 5.25, 0.55, C.text2);
    text(s, info[i][1], x + 0.25, 5.25, iw - 1.25, 0.55, { fontSize: 17, bold: true, color: C.text2, valign: "middle" });
    text(s, info[i][2], x + 0.25, 5.9, iw - 0.5, 0.8, { fontSize: 14 });
  }
}

async function s09Patterns() {
  const s = contentSlide(
    "الگوها و داده",
    "الگوهای قابلیت اطمینان",
    "چهار الگو که داده‌ی توزیع‌شده را درست و سیستم را سرپا نگه می‌دارند",
    "Outbox تضمین می‌کند که تغییر داده و انتشار رویداد یا هر دو انجام شوند یا هیچ‌کدام. Idempotency-Key جلوی پرداخت یا سفارش تکراری را می‌گیرد. " +
      "با CQRS سبک، نوشتن در PostgreSQL و خواندن جستجو از OpenSearch انجام می‌شود. و با Circuit Breaker، قطع شدن درگاه یا مدل زبانی کل سیستم را از کار نمی‌اندازد."
  );
  const cards = [
    ["LuInbox", "Outbox و Inbox", "تغییر داده و رکورد رویداد در یک تراکنش ثبت می‌شوند و یک Relay آن را منتشر می‌کند؛ مصرف‌کننده شناسه‌ی رویداد را نگه می‌دارد تا دو بار اعمال نشود.", "مثال: order.placed همراه با ثبت سفارش commit می‌شود", C.accent1],
    ["LuKeyRound", "Idempotency-Key", "ارسال دوباره‌ی درخواست ثبت سفارش یا callback تکراری درگاه، همان پاسخ قبلی را برمی‌گرداند؛ هیچ پولی دو بار کم نمی‌شود.", "مثال: هدر Idempotency-Key روی POST /checkout", C.accent2],
    ["LuLayers", "CQRS سبک", "نوشتن در PostgreSQL سرویس مالک، خواندن جستجو از OpenSearch؛ مدل خواندن با بازپخش رویدادها از نو ساخته می‌شود.", "مثال: product.updated ← به‌روزرسانی ایندکس جستجو", C.accent6],
    ["LuShieldCheck", "Circuit Breaker و تخریب تدریجی", "اگر درگاه پرداخت یا مدل زبانی قطع شود، مدار باز می‌شود؛ جستجوی عادی، فیلترها و پرداخت در محل همچنان کار می‌کنند.", "مثال: LLM در دسترس نیست ← GET /search بدون AI", C.accent4],
  ];
  const cw = (CW - 0.3) / 2;
  const ch = 2.35;
  for (let i = 0; i < cards.length; i++) {
    const [ic, title, body, ex, fill] = cards[i];
    const x = colX(i % 2, cw, 0.3);
    const y = i < 2 ? 1.8 : 4.4;
    box(s, x, y, cw, ch, { shadowed: true });
    await iconCircle(s, ic, x + cw - 0.25 - 0.65, y + 0.22, 0.65, fill);
    text(s, title, x + 0.25, y + 0.22, cw - 1.4, 0.65, { fontSize: 18, bold: true, color: C.text2, valign: "middle" });
    text(s, body, x + 0.25, y + 1.0, cw - 0.5, 0.9, { fontSize: 14 });
    // no italics: Segoe UI has no italic Arabic-script glyphs (renders as empty boxes)
    text(s, ex, x + 0.25, y + 1.92, cw - 0.5, 0.32, { fontSize: 12, color: C.accent1 });
  }
}

async function s10Data() {
  const s = contentSlide(
    "الگوها و داده",
    "داده: یک دیتابیس برای هر سرویس",
    "PostgreSQL برای تراکنش؛ هر ابزار تخصصی فقط جایی که واقعاً لازم است",
    "PostgreSQL ستون اصلی داده است: تراکنش‌ها، داده‌ی جغرافیایی با PostGIS و حتی بردارهای جستجوی معنایی با pgvector. " +
      "بقیه‌ی ابزارها فقط برای کاری که در آن بهترین‌اند استفاده می‌شوند. قواعد سمت چپ را دقت کنید: پول همیشه عدد صحیح ریال است و هرگز اعشاری ذخیره نمی‌شود."
  );
  const rows = [
    ["LuDatabase", "PostgreSQL · PostGIS · pgvector", "سفارش، پرداخت، موجودی؛ محدوده‌ی ارسال؛ بردار محصولات", C.accent1],
    ["LuZap", "Redis", "سبد خرید، Rate Limit، کش معنایی هوش مصنوعی", C.accent4],
    ["LuSearch", "OpenSearch", "جستجوی فارسی با تحلیلگر مخصوص؛ مدل خواندن", C.accent2],
    ["LuImage", "MinIO / S3", "عکس محصول و مدارک فروشنده با لینک امضاشده", C.accent6],
    ["LuActivity", "ClickHouse", "رویدادهای رفتاری، گزارش فروش، داده‌ی آموزش مدل پیشنهاد", C.text2],
  ];
  const rw = 7.1;
  const xr = RIGHT - rw;
  for (let i = 0; i < rows.length; i++) {
    const [ic, name, desc, fill] = rows[i];
    const y = 1.85 + i * 0.95;
    await iconCircle(s, ic, RIGHT - 0.62, y + 0.06, 0.62, fill);
    ltr(s, name, xr, y, rw - 0.85, 0.38, { fontSize: 16, bold: true, color: C.text2, align: "right" });
    text(s, desc, xr, y + 0.4, rw - 0.85, 0.36, { fontSize: 14, color: MUTED });
  }
  const lw = CW - rw - 0.4;
  box(s, MX, 1.85, lw, 4.7, { fill: C.text2 });
  text(s, "قواعد داده", MX + 0.3, 2.05, lw - 0.6, 0.5, { fontSize: 19, bold: true, color: C.accent2 });
  text(s, [
    { text: "پول = عدد صحیح ریال (bigint)؛ هرگز اعشاری", options: { bullet: true, breakLine: true } },
    { text: "زمان در UTC؛ نمایش با تقویم شمسی و وقت تهران", options: { bullet: true, breakLine: true } },
    { text: "دفتر کل دوطرفه برای کمیسیون و تسویه‌ی فروشندگان", options: { bullet: true, breakLine: true } },
    { text: "قیمت و نام کالا هنگام سفارش ثبت و ثابت می‌شود", options: { bullet: true, breakLine: true } },
    { text: "پشتیبان‌گیری خودکار و بازیابی لحظه‌ای (PITR)", options: { bullet: true } },
  ], MX + 0.3, 2.7, lw - 0.6, 3.7, { fontSize: 15, color: C.background1, paraSpaceAfter: 10 });
}

async function s11Docker() {
  const s = contentSlide(
    "زیرساخت ابری",
    "Docker و محیط توسعه",
    "هر سرویس یک Image است؛ کل زیرساخت روی یک لپ‌تاپ ۸ گیگابایتی اجرا می‌شود",
    "هر سرویس یک Image مستقل با ساخت چندمرحله‌ای دارد که با کاربر غیر root اجرا می‌شود و در CI با Trivy اسکن می‌شود. " +
      "یک محدودیت واقعی داشتیم: لپ‌تاپ توسعه ۸ گیگابایت رم دارد. برای همین زیرساخت محلی را به پروفایل‌های Docker Compose تقسیم کردیم و هر بار فقط پروفایل لازم را روشن می‌کنیم."
  );
  const practices = [
    "ساخت چندمرحله‌ای: Image کوچک و بدون ابزار build",
    "اجرا با کاربر غیر root",
    "Healthcheck و endpointهای سلامت: healthz و readyz",
    "تنظیمات فقط با متغیر محیطی؛ بدون Secret در Image",
    "اسکن آسیب‌پذیری با Trivy در CI",
    "لاگ JSON و endpoint متریک در همه‌ی سرویس‌ها",
  ];
  const rw = 6.0;
  const xr = RIGHT - rw;
  for (let i = 0; i < practices.length; i++) {
    const y = 1.9 + i * 0.66;
    await iconCircle(s, "LuCheck", RIGHT - 0.42, y + 0.04, 0.42, C.accent1);
    text(s, practices[i], xr, y, rw - 0.6, 0.5, { fontSize: 15, valign: "middle" });
  }
  const lw = CW - rw - 0.5;
  text(s, "حافظه‌ی تقریبی هر پروفایل Docker Compose (مگابایت)", MX, 1.85, lw, 0.4, { fontSize: 14, bold: true, color: C.text2 });
  s.addChart(pres.charts.BAR, [{ name: "RAM (MB)", labels: ["core", "search", "storage", "obs"], values: [350, 1000, 250, 700] }], {
    x: MX, y: 2.3, w: lw, h: 2.9,
    barDir: "bar",
    catAxisOrientation: "maxMin",
    chartColors: [HEX.accent1],
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelFontSize: 12,
    dataLabelFontFace: "+mn-lt",
    dataLabelColor: HEX.dk1,
    catAxisLabelFontFace: "+mn-lt",
    catAxisLabelFontSize: 13,
    catAxisLabelColor: MUTED,
    valAxisHidden: true,
    valGridLine: { style: "none" },
    catGridLine: { style: "none" },
    showLegend: false,
    barGapWidthPct: 60,
  });
  ltr(s, [
    { text: "core = PostgreSQL, Redis, NATS  ·  search = OpenSearch", options: { breakLine: true } },
    { text: "storage = MinIO, Mailpit  ·  obs = Jaeger, Prometheus, Grafana" },
  ], MX, 5.25, lw, 0.55, { fontSize: 11, color: MUTED });
  box(s, MX, 5.95, lw, 0.75, { fill: C.accent2, transparency: 82 });
  text(s, "جمع همه حدود ۲٫۳ گیگابایت؛ فقط پروفایل لازم روشن می‌شود", MX + 0.2, 5.95, lw - 0.4, 0.75, { fontSize: 15, bold: true, color: C.text2, valign: "middle" });
}

async function s12K8s() {
  const s = contentSlide(
    "زیرساخت ابری",
    "استقرار روی Kubernetes",
    "سرویس‌های بدون‌وضعیت با مقیاس خودکار، خودترمیمی و دسترسی حداقلی",
    "در Kubernetes برای هر محیط یک Namespace داریم. سرویس‌ها Deployment هستند و با HPA بر اساس CPU و نرخ درخواست مقیاس می‌گیرند؛ جستجو و هوش مصنوعی با KEDA بر اساس طول صف مقیاس می‌گیرند. " +
      "Probeها خودترمیمی را ممکن می‌کنند و NetworkPolicy فقط ترافیک مجاز را باز می‌گذارد. نوبر اوج مصرف مشخصی دارد: صبح و عصر، و مناسبت‌هایی مثل شب یلدا و نوروز."
  );
  const objs = [
    ["LuGauge", "Deployment + HPA", "مقیاس خودکار با CPU و نرخ درخواست"],
    ["LuTrendingUp", "KEDA", "مقیاس بر اساس صف برای جستجو و AI"],
    ["LuHeartPulse", "Probes", "readiness، liveness و startup برای خودترمیمی"],
    ["LuShield", "PodDisruptionBudget", "حداقل نسخه‌ی سالم هنگام به‌روزرسانی"],
    ["LuNetwork", "NetworkPolicy", "فقط ترافیک مجاز بین سرویس‌ها"],
    ["LuKeyRound", "External Secrets", "Secretها از Vault، نه از Git"],
  ];
  const rw = 5.7;
  const xr = RIGHT - rw;
  for (let i = 0; i < objs.length; i++) {
    const [ic, name, desc] = objs[i];
    const y = 1.85 + i * 0.7;
    await iconCircle(s, ic, RIGHT - 0.5, y + 0.05, 0.5, C.accent1);
    ltr(s, name, xr, y, rw - 0.7, 0.32, { fontSize: 15, bold: true, color: C.text2, align: "right" });
    text(s, desc, xr, y + 0.32, rw - 0.7, 0.3, { fontSize: 13, color: MUTED });
  }
  box(s, xr, 6.15, rw, 0.6, { fill: C.accent2, transparency: 82 });
  text(s, "اوج خرید صبح و عصر، یلدا و نوروز ← Autoscaling و CDN", xr + 0.2, 6.15, rw - 0.4, 0.6, { fontSize: 14, bold: true, color: C.text2, valign: "middle" });

  // cluster diagram (left)
  const lw = CW - rw - 0.45;
  box(s, MX, 1.85, lw, 4.9, { fill: C.background1, line: { color: HEX.dk2, width: 1.25, dashType: "dash" } });
  ltr(s, "Kubernetes cluster", MX + 0.25, 1.95, 3, 0.35, { fontSize: 13, bold: true, color: C.text2 });
  const nx = MX + 0.2;
  const nw = lw - 0.4;
  box(s, nx, 2.4, nw, 2.15, { fill: C.background2 });
  ltr(s, "nobar-prod", nx + 0.15, 2.48, 3, 0.3, { fontSize: 13, bold: true, color: C.accent1 });
  const chips = ["Ingress + cert-manager", "Deployments + HPA", "CloudNativePG", "ConfigMap · Secret"];
  const chw = (nw - 0.45) / 2;
  chips.forEach((c, i) => {
    const x = nx + 0.15 + (i % 2) * (chw + 0.15);
    const y = 2.92 + Math.floor(i / 2) * 0.75;
    box(s, x, y, chw, 0.6, { fill: C.background1, line: { color: HEX.accent1, width: 1 }, r: 0.08 });
    ltr(s, c, x, y, chw, 0.6, { fontSize: 12, bold: true, align: "center", valign: "middle", color: C.text2 });
  });
  const lines = (...ls) => ls.map((l, i) => ({ text: l, options: { breakLine: i < ls.length - 1 } }));
  const small = [
    ["nobar-staging", "همان Chartها با مقادیر دیگر"],
    ["observability", lines("Prometheus", "Grafana", "Loki · Jaeger")],
    ["ai", lines("ai-gateway", "ai-workers")],
  ];
  const sw = (nw - 0.3) / 3;
  small.forEach(([n, d], i) => {
    const x = nx + i * (sw + 0.15);
    box(s, x, 4.75, sw, 1.8, { fill: C.background2 });
    ltr(s, n, x + 0.12, 4.85, sw - 0.24, 0.32, { fontSize: 12, bold: true, color: i === 2 ? C.accent2 : C.accent1 });
    const persian = typeof d === "string" && /[؀-ۿ]/.test(d);
    (persian ? text : ltr)(s, d, x + 0.12, 5.25, sw - 0.24, 1.2, { fontSize: 12, color: C.text1, align: persian ? "right" : "left" });
  });
}

async function s13Cicd() {
  const s = contentSlide(
    "زیرساخت ابری",
    "CI/CD و GitOps",
    "Git منبع حقیقت است؛ Argo CD کلاستر را با آن همگام نگه می‌دارد",
    "در CI، هر Pull Request لینت، تست، ساخت Image و اسکن امنیتی می‌شود. سپس نسخه‌ی جدید Image در مقادیر Helm داخل Git ثبت می‌شود. " +
      "Argo CD تغییر را می‌بیند و کلاستر را با Git همگام می‌کند: Staging خودکار و Production با تأیید. برای سرویس‌های حساس order و payment از استقرار Canary استفاده می‌کنیم. برگشت به نسخه‌ی قبل یعنی یک git revert."
  );
  const ci = [
    ["Pull Request", "بازبینی کد و قراردادها"],
    ["Lint و تست", "واحد، یکپارچه، قرارداد"],
    ["Build و اسکن", "Image، Trivy، SBOM"],
    ["Push", "ارسال به Registry و ثبت نسخه در Helm values"],
  ];
  const cd = [
    ["Argo CD", "همگام‌سازی کلاستر با Git"],
    ["Staging", "استقرار خودکار"],
    ["Production", "با تأیید؛ Canary با Argo Rollouts"],
  ];
  const gap = 0.4;
  const sw = (CW - 3 * gap) / 4;
  const drawRow = (items, y, start, fill) => {
    items.forEach(([t, d], i) => {
      const x = colX(i, sw, gap);
      box(s, x, y, sw, 1.35, { fill: C.background1, line: { color: fill === C.accent1 ? HEX.accent1 : HEX.accent2, width: 1.5 }, shadowed: true });
      s.addShape(pres.shapes.OVAL, { x: x + sw - 0.15 - 0.42, y: y + 0.15, w: 0.42, h: 0.42, fill: { color: fill }, line: noLine() });
      text(s, fa(start + i), x + sw - 0.15 - 0.42, y + 0.15, 0.42, 0.42, { fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
      text(s, t, x + 0.15, y + 0.15, sw - 0.9, 0.42, { fontSize: 16, bold: true, color: C.text2, valign: "middle" });
      text(s, d, x + 0.15, y + 0.68, sw - 0.3, 0.6, { fontSize: 13, color: MUTED });
      if (i < items.length - 1) arrow(s, x - 0.06, y + 0.675, x - gap + 0.06, y + 0.675, fill === C.accent1 ? C.accent1 : C.accent2);
    });
  };
  ltr(s, "CI · GitHub Actions", RIGHT - 4, 1.8, 4, 0.35, { fontSize: 14, bold: true, color: C.accent1, align: "right" });
  drawRow(ci, 2.2, 1, C.accent1);
  ltr(s, "CD · GitOps", RIGHT - 4, 3.95, 4, 0.35, { fontSize: 14, bold: true, color: C.accent2, align: "right" });
  drawRow(cd, 4.35, 5, C.accent2);
  const tx = colX(3, sw, gap);
  box(s, tx, 4.35, sw, 1.35, { fill: C.background2, line: { color: HEX.dk2, width: 1, dashType: "dash" } });
  ltr(s, "Terraform", tx + 0.15, 4.45, sw - 0.3, 0.4, { fontSize: 16, bold: true, color: C.text2, align: "right" });
  text(s, "کلاستر، Postgres مدیریت‌شده و Object Storage به‌صورت کد", tx + 0.15, 4.85, sw - 0.3, 0.8, { fontSize: 13, color: MUTED });
  box(s, MX, 6.05, CW, 0.65, { fill: C.background2 });
  await iconCircle(s, "LuGitBranch", RIGHT - 0.2 - 0.45, 6.15, 0.45, C.text2);
  text(s, "برگشت به نسخه‌ی قبل = یک git revert؛ هر تغییر در کلاستر از یک commit قابل ردیابی است", MX + 0.3, 6.05, CW - 1.1, 0.65, { fontSize: 15, valign: "middle" });
}

async function s14Obs() {
  const s = contentSlide(
    "زیرساخت ابری",
    "مشاهده‌پذیری",
    "هر درخواست از Gateway تا دیتابیس با یک trace_id قابل دنبال کردن است",
    "سه ستون مشاهده‌پذیری را داریم: متریک برای «چقدر و چند وقت»، لاگ برای «چه اتفاقی افتاد» و Trace برای «کجا کند شد». همه با یک trace_id به هم وصل‌اند. " +
      "SLOها را با هشدار burn-rate پایش می‌کنیم تا قبل از تمام شدن بودجه‌ی خطا، تیم از طریق تلگرام و پیامک باخبر شود."
  );
  const pillars = [
    ["LuGauge", "Metrics", "Prometheus + Grafana", ["نرخ سفارش، تأخیر و نرخ خطا", "هشدار موجودی بحرانی", "هزینه‌ی توکن و امتیاز Evals"], C.accent1],
    ["LuFileText", "Logs", "Loki", ["لاگ JSON ساختاریافته", "trace_id در هر خط لاگ", "حذف اطلاعات شخصی از لاگ"], C.accent2],
    ["LuRoute", "Traces", "OpenTelemetry + Jaeger", ["مسیر درخواست بین سرویس‌ها", "عبور از گذرگاه رویداد", "پیدا کردن کندترین قدم"], C.accent6],
  ];
  const cw = (CW - 2 * 0.35) / 3;
  for (let i = 0; i < pillars.length; i++) {
    const [ic, name, tool, bullets, fill] = pillars[i];
    const x = colX(i, cw, 0.35);
    box(s, x, 1.8, cw, 2.75, { shadowed: true });
    await iconCircle(s, ic, x + cw - 0.3 - 0.7, 2.0, 0.7, fill);
    ltr(s, name, x + 0.3, 2.0, cw - 1.5, 0.38, { fontSize: 20, bold: true, color: C.text2, align: "right" });
    ltr(s, tool, x + 0.3, 2.38, cw - 1.5, 0.32, { fontSize: 13, color: MUTED, align: "right" });
    text(s, bullets.map((b, j) => ({ text: b, options: { bullet: true, breakLine: j < bullets.length - 1 } })), x + 0.3, 2.95, cw - 0.6, 2.1, { fontSize: 15, paraSpaceAfter: 8 });
  }
  box(s, MX, 4.85, CW, 1.85, { fill: C.text2 });
  const slos = [
    ["۹۹٫۵٪", "دسترس‌پذیری ثبت سفارش"],
    ["۳۰۰ میلی‌ثانیه", "سقف زمان پاسخ ۹۵٪ جستجوها"],
    ["Burn-rate", "Alertmanager ← تلگرام و پیامک تیم"],
  ];
  const sw = CW / 3;
  slos.forEach(([n, l], i) => {
    const x = colX(i, sw, 0);
    text(s, n, x + 0.3, 5.1, sw - 0.6, 0.75, { fontSize: 30, bold: true, color: C.accent5, align: "center", valign: "middle" });
    text(s, l, x + 0.3, 5.9, sw - 0.6, 0.5, { fontSize: 15, color: C.background1, align: "center" });
  });
}

async function s15AiArch() {
  const s = contentSlide(
    "هوش مصنوعی",
    "لایه‌ی هوش مصنوعی",
    "همه‌ی قابلیت‌های AI از یک دروازه می‌گذرند و فقط از راه ابزارها به داده می‌رسند",
    "همه‌ی درخواست‌های هوش مصنوعی از AI Gateway عبور می‌کنند که احراز هویت، محدودیت نرخ، Guardrailها، کش معنایی و بودجه‌ی توکن را مدیریت می‌کند. " +
      "Agentها هیچ دسترسی مستقیمی به دیتابیس ندارند؛ فقط ابزارهای تعریف‌شده را صدا می‌زنند و این ابزارها با توکن خود کاربر به API داخلی می‌روند. " +
      "رابط LLMProvider اجازه می‌دهد مدل را فقط با تنظیمات عوض کنیم؛ این برای ایران مهم است چون ممکن است API خارجی در دسترس نباشد."
  );
  const dw = 8.1;
  const dx = RIGHT - dw;
  const dcx = dx + dw / 2;
  box(s, dcx - 2.4, 1.8, 4.8, 0.48, { fill: C.background2, r: 0.24 });
  text(s, "کاربر: گفت‌وگو و جستجوی هوشمند", dcx - 2.4, 1.8, 4.8, 0.48, { fontSize: 14, bold: true, align: "center", valign: "middle", color: C.text2 });
  arrow(s, dcx, 2.3, dcx, 2.5);
  box(s, dx, 2.52, dw, 1.05, { fill: C.text2 });
  ltr(s, "AI Gateway", dx + 0.3, 2.6, dw - 0.6, 0.4, { fontSize: 17, bold: true, color: C.accent2, align: "center" });
  text(s, "احراز هویت · Guardrailها · مسیریابی Agent · کش معنایی · بودجه‌ی توکن", dx + 0.3, 3.05, dw - 0.6, 0.4, { fontSize: 14, color: C.background1, align: "center" });
  arrow(s, dcx, 3.59, dcx, 3.79);
  const agents = ["Shopping Agent", "Compare", "Recommend", "Seller Copilot", "Moderation"];
  const aw = (dw - 4 * 0.15) / 5;
  agents.forEach((a, i) => {
    const x = colX(i, aw, 0.15, RIGHT);
    box(s, x, 3.81, aw, 0.55, { fill: C.background1, line: { color: HEX.accent2, width: 1.25 }, r: 0.08 });
    ltr(s, a, x, 3.81, aw, 0.55, { fontSize: 12, bold: true, color: C.text2, align: "center", valign: "middle" });
  });
  arrow(s, dcx, 4.38, dcx, 4.58);
  box(s, dx, 4.6, dw, 1.05, { fill: C.background2, line: { color: HEX.accent1, width: 1.25 } });
  text(s, "لایه‌ی ابزار: فقط API داخلی، با JWT خود کاربر، با اعتبارسنجی Schema", dx + 0.3, 4.66, dw - 0.6, 0.4, { fontSize: 14, bold: true, color: C.text2, align: "center" });
  ltr(s, [
    { text: "search_products · get_product · compare_products", options: { breakLine: true } },
    { text: "add_to_cart · estimate_delivery" },
  ], dx + 0.3, 5.06, dw - 0.6, 0.5, { fontSize: 12, fontFace: "Consolas", color: C.accent1, align: "center" });
  arrow(s, dcx, 5.67, dcx, 5.87);
  const targets = ["سرویس‌های دامنه", "ایندکس جستجو", "Vector Store · pgvector"];
  const tw = (dw - 2 * 0.2) / 3;
  targets.forEach((t, i) => {
    const x = colX(i, tw, 0.2, RIGHT);
    box(s, x, 5.89, tw, 0.5, { fill: C.background1, line: { color: HEX.dk2, width: 1 }, r: 0.08 });
    text(s, t, x, 5.89, tw, 0.5, { fontSize: 13, bold: true, align: "center", valign: "middle", color: C.text2 });
  });

  const lw = CW - dw - 0.4;
  box(s, MX, 1.8, lw, 4.95, { fill: C.background2 });
  await iconCircle(s, "LuCpu", MX + lw - 0.25 - 0.6, 2.0, 0.6, C.accent2);
  ltr(s, "LLMProvider", MX + 0.25, 2.0, lw - 1.3, 0.6, { fontSize: 17, bold: true, color: C.text2, align: "right", valign: "middle" });
  text(s, "تعویض مدل فقط با تنظیمات، بدون تغییر کد", MX + 0.25, 2.7, lw - 0.5, 0.6, { fontSize: 14 });
  ["مدل میزبانی‌شده", "مدل متن‌باز خودمیزبان", "Fake قطعی برای تست و Evals"].forEach((t, i) => {
    box(s, MX + 0.25, 3.4 + i * 0.68, lw - 0.5, 0.56, { fill: C.background1, r: 0.08 });
    text(s, t, MX + 0.4, 3.4 + i * 0.68, lw - 0.8, 0.56, { fontSize: 13, valign: "middle" });
  });
  text(s, "اگر API خارجی در دسترس نبود، مدل داخلی جایگزین می‌شود", MX + 0.25, 5.55, lw - 0.5, 0.9, { fontSize: 13, bold: true, color: C.accent2 });
}

async function s16Assistant() {
  const s = contentSlide(
    "هوش مصنوعی",
    "دستیار خرید در عمل",
    "مدل پیشنهاد می‌دهد؛ تصمیم و پرداخت همیشه با کاربر است",
    "یک نمونه‌ی واقعی: کاربر برای مهمانی ده‌نفره با بودجه‌ی ۸۰۰ هزار تومان دسر میوه‌ای می‌خواهد. دستیار ابزار جستجو و تخمین ارسال را صدا می‌زند و یک سبد پیشنهادی می‌سازد. " +
      "همه‌ی قیمت‌ها از ابزار آمده‌اند، نه از حافظه‌ی مدل. دستیار خودش سفارش ثبت نمی‌کند؛ کاربر باید دکمه‌ی افزودن به سبد را بزند. این پنج اصل را در Evals فارسی و در CI بررسی می‌کنیم."
  );
  const pw = 6.4;
  const px = RIGHT - pw;
  box(s, px, 1.8, pw, 4.95, { fill: C.background2 });
  // user bubble
  box(s, RIGHT - 0.25 - 4.3, 2.0, 4.3, 0.9, { fill: C.accent1, r: 0.18 });
  text(s, "برای مهمونی ۱۰ نفره دسر میوه‌ای می‌خوام، بودجه‌م ۸۰۰ هزار تومنه.", RIGHT - 0.25 - 4.3 + 0.2, 2.0, 3.9, 0.9, { fontSize: 14, color: C.background1, valign: "middle" });
  // tool calls
  const tools = ['search_products(city: "tehran")', "estimate_delivery()"];
  let tx = px + 0.25;
  tools.forEach((t, i) => {
    const w = i === 0 ? 3.0 : 1.9;
    box(s, tx, 3.08, w, 0.36, { fill: C.background1, line: { color: HEX.accent1, width: 0.75, dashType: "dash" }, r: 0.08 });
    ltr(s, t, tx, 3.08, w, 0.36, { fontSize: 11, fontFace: "Consolas", color: C.accent1, align: "center", valign: "middle" });
    tx += w + 0.15;
  });
  // AI label + assistant bubble
  const bx = px + 0.25;
  const bw = 5.0;
  box(s, bx, 3.62, bw, 1.95, { fill: C.background1, line: { color: HEX.dk2, width: 0.75 }, r: 0.14 });
  box(s, bx + bw - 1.55, 3.48, 1.4, 0.3, { fill: C.accent2, r: 0.15 });
  text(s, "پیشنهاد هوشمند", bx + bw - 1.55, 3.48, 1.4, 0.3, { fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  text(s, [
    { text: "این سبد در بودجه‌ی شماست:", options: { bold: true, breakLine: true } },
    { text: "۳ کیلو هلو — ۳۶۰ هزار تومان", options: { breakLine: true } },
    { text: "۲ کیلو انگور بی‌دانه — ۱۸۰ هزار تومان", options: { breakLine: true } },
    { text: "۱ جعبه توت‌فرنگی — ۱۹۰ هزار تومان", options: { breakLine: true } },
    { text: "ارسال ۴۰ هزار · جمع: ۷۷۰ هزار تومان", options: { bold: true, color: C.accent1 } },
  ], bx + 0.25, 3.85, bw - 0.5, 1.8, { fontSize: 14, paraSpaceAfter: 2 });
  box(s, bx, 5.95, 2.2, 0.5, { fill: C.accent2, r: 0.25 });
  text(s, "افزودن به سبد", bx, 5.95, 2.2, 0.5, { fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
  text(s, "تأیید با کاربر", bx + 2.35, 5.95, 2.2, 0.5, { fontSize: 13, color: MUTED, valign: "middle", align: "left" });

  const lw = CW - pw - 0.4;
  const rules = [
    "قیمت، موجودی و امتیاز فقط از ابزار؛ هرگز از حافظه‌ی مدل",
    "نظرها و توضیح محصول «داده»اند، نه دستور؛ سد در برابر Prompt Injection",
    "ثبت سفارش و پرداخت ابزار نیست؛ تأیید صریح کاربر لازم است",
    "هر فراخوانی ابزار در ai_audit_log ثبت می‌شود",
    "Evals فارسی در CI؛ بدون AI، جستجوی عادی کار می‌کند",
  ];
  rules.forEach((r, i) => {
    const y = 1.85 + i * 0.97;
    s.addShape(pres.shapes.OVAL, { x: MX + lw - 0.5, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: C.text2 }, line: noLine() });
    text(s, fa(i + 1), MX + lw - 0.5, y + 0.05, 0.5, 0.5, { fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, r, MX, y, lw - 0.7, 0.85, { fontSize: 15 });
  });
}

async function s17Security() {
  const s = contentSlide(
    "امنیت و تصمیم‌ها",
    "امنیت از پیش‌فرض",
    "حداقل دسترسی، رمزنگاری و ممیزی در هر لایه",
    "امنیت را لایه‌به‌لایه طراحی کرده‌ایم. ورود با کد یک‌بارمصرف پیامکی است و توکن دسترسی فقط پانزده دقیقه اعتبار دارد. " +
      "حتی پشت Gateway، هر سرویس خودش توکن و مالکیت را بررسی می‌کند. هیچ اطلاعات کارت بانکی ذخیره نمی‌شود و همه‌ی عملیات مالی، ادمین و ابزارهای AI ممیزی می‌شوند."
  );
  const cards = [
    ["LuKeyRound", "احراز هویت", "کد یک‌بارمصرف پیامکی، JWT پانزده‌دقیقه‌ای، Refresh Token چرخشی؛ MFA برای ادمین و فروشنده"],
    ["LuUserCheck", "دسترسی", "RBAC با نقش‌های خریدار، فروشنده، پیک و ادمین + بررسی مالکیت در خود سرویس"],
    ["LuNetwork", "شبکه", "فقط Gateway عمومی؛ NetworkPolicy، WAF و Rate Limit؛ mTLS با Linkerd در فاز بعد"],
    ["LuLock", "داده", "رمزنگاری در انتقال و ذخیره؛ هیچ اطلاعات کارت بانکی ذخیره نمی‌شود"],
    ["LuFileText", "ممیزی", "Audit Log برای عملیات مالی، اقدام‌های ادمین و همه‌ی ابزارهای AI"],
    ["LuPackageCheck", "زنجیره‌ی تأمین", "Trivy، Dependabot، SBOM و اسکن Secret در هر بار اجرای CI"],
  ];
  const cw = (CW - 2 * 0.35) / 3;
  const ch = 2.3;
  for (let i = 0; i < cards.length; i++) {
    const [ic, title, body] = cards[i];
    const x = colX(i % 3, cw, 0.35);
    const y = i < 3 ? 1.8 : 4.4;
    box(s, x, y, cw, ch, { shadowed: true });
    await iconCircle(s, ic, x + cw - 0.25 - 0.6, y + 0.25, 0.6, i % 2 ? C.accent1 : C.text2);
    text(s, title, x + 0.25, y + 0.25, cw - 1.3, 0.6, { fontSize: 18, bold: true, color: C.text2, valign: "middle" });
    text(s, body, x + 0.25, y + 1.0, cw - 0.5, 1.15, { fontSize: 14 });
  }
}

async function s18Adr() {
  const s = contentSlide(
    "امنیت و تصمیم‌ها",
    "تصمیم‌های کلیدی",
    "هر انتخاب یک جایگزین جدی داشت؛ دلیل هر تصمیم در یک ADR ثبت شده است",
    "هر تصمیم مهم را در یک Architecture Decision Record ثبت کرده‌ایم تا دلیلش فراموش نشود. نمونه‌ی جالب NATS در برابر Kafka است: " +
      "Kafka شناخته‌شده‌تر است، ولی روی لپ‌تاپ ۸ گیگابایتی حدود یک گیگابایت رم مصرف می‌کند؛ NATS حدود سی مگابایت. چون پشت یک رابط قرار دارد، هر وقت لازم شد می‌توانیم به Kafka مهاجرت کنیم."
  );
  const rows = [
    ["میکروسرویس با مرز تمیز", "Modular Monolith", "مقیاس مستقل، استقرار Canary و جداسازی خطا را نشان می‌دهد"],
    ["NATS JetStream", "Kafka", "حدود ۳۰ مگابایت در برابر ۱ گیگابایت رم؛ پشت یک رابط قابل تعویض"],
    ["PostgreSQL برای هر سرویس", "دیتابیس مشترک", "استقلال استقرار؛ PostGIS و pgvector در یک موتور"],
    ["pgvector", "Qdrant", "بدون زیرساخت جدید؛ مهاجرت وقتی بردارها از ۵ میلیون بگذرند"],
    ["Kong بدون دیتابیس + BFF", "Traefik یا Gateway دست‌ساز", "JWT، Rate Limit و CORS آماده؛ پیکربندی به‌صورت کد"],
    ["مونوریپو pnpm + Turborepo", "Polyrepo", "تغییر هم‌زمان قرارداد و سرویس‌ها در یک PR"],
  ];
  const opt = (o) => ({ align: "right", rtlMode: true, lang: "fa-IR", ...o });
  const head = (t) => ({ text: t, options: opt({ bold: true, color: C.background1, fill: { color: C.text2 } }) });
  const table = [
    [head("چرا"), head("جایگزین"), head("تصمیم")],
    ...rows.map(([d, alt, why], i) => {
      const fill = { color: i % 2 ? C.background1 : C.background2 };
      return [
        { text: why, options: opt({ fill }) },
        { text: alt, options: opt({ fill, color: MUTED }) },
        { text: d, options: opt({ fill, bold: true, color: C.text2 }) },
      ];
    }),
  ];
  s.addTable(table, {
    x: MX, y: 1.85, w: CW, colW: [CW - 2.8 - 3.6, 2.8, 3.6], rowH: 0.66,
    fontSize: 14, valign: "middle", margin: [0, 0.15, 0, 0.15],
    border: { type: "solid", pt: 1, color: HEX.lt1 },
  });
}

async function s19Roadmap() {
  const s = contentSlide(
    "جمع‌بندی",
    "نقشه‌ی راه",
    "از زیرساخت توسعه تا مقیاس بزرگ در شش فاز",
    "پروژه در شش فاز پیش می‌رود و هر فاز معیار خروج مشخص و قابل اندازه‌گیری دارد. بخش نارنجی مسیر سمینار است: " +
      "فاز صفر تا سه، یعنی زیرساخت، بازار پایه، عملیاتی‌شدن روی Kubernetes و لایه‌ی هوش مصنوعی. مستندات معماری و ADRها تکمیل شده‌اند و پیاده‌سازی شروع شده است."
  );
  const phases = [
    ["زیرساخت توسعه", "مونوریپو، Docker Compose، CI"],
    ["MVP بازار", "هویت، کاتالوگ، جستجو، سبد، سفارش، پرداخت"],
    ["عملیاتی‌شدن", "ارسال، نظرها، اعلان‌ها، Kubernetes، GitOps"],
    ["هوش مصنوعی", "جستجوی معنایی، دستیار خرید، مقایسه"],
    ["رشد", "پیشنهاد شخصی، دستیار فروشنده، ضدتقلب"],
    ["مقیاس بزرگ", "Service Mesh، چندمنطقه‌ای، اپ موبایل"],
  ];
  const step = (CW - 2.0) / 5;
  const cxOf = (i) => RIGHT - 1.0 - i * step;
  // seminar-track highlight behind phases 0–3
  const hx = cxOf(3) - 1.0;
  box(s, hx, 1.85, cxOf(0) + 1.0 - hx, 3.55, { fill: C.accent2, transparency: 88 });
  text(s, "مسیر سمینار", cxOf(0) + 1.0 - 2.2, 1.97, 2.0, 0.35, { fontSize: 13, bold: true, color: C.accent2 });
  s.addShape(pres.shapes.LINE, { x: cxOf(5), y: 3.0, w: cxOf(0) - cxOf(5), h: 0, line: { color: HEX.dk2, width: 2 } });
  phases.forEach(([t, d], i) => {
    const cx = cxOf(i);
    const inTrack = i <= 3;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.4, y: 2.6, w: 0.8, h: 0.8, fill: { color: inTrack ? C.accent2 : C.text2 }, line: { color: HEX.lt1, width: 3 } });
    text(s, fa(i), cx - 0.4, 2.6, 0.8, 0.8, { fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, t, cx - 0.98, 3.6, 1.96, 0.4, { fontSize: 16, bold: true, color: C.text2, align: "center" });
    text(s, d, cx - 0.98, 4.05, 1.96, 1.2, { fontSize: 14, color: MUTED, align: "center" });
  });
  box(s, MX, 5.75, CW, 0.65, { fill: C.background2 });
  await iconCircle(s, "LuCircleCheck", RIGHT - 0.2 - 0.45, 5.85, 0.45, C.accent1);
  text(s, "وضعیت: مستندات معماری و ADRها تکمیل شد؛ پیاده‌سازی از فاز صفر آغاز شده است", MX + 0.3, 5.75, CW - 1.1, 0.65, { fontSize: 15, valign: "middle" });
}

async function s20Closing() {
  const s = pres.addSlide({ masterName: "NOBAR_DARK", sectionTitle: "جمع‌بندی" });
  s.addText("جمع‌بندی", { placeholder: "title", rtlMode: true, lang: "fa-IR" });
  const items = [
    ["LuBoxes", "معماری Cloud-Native با مرزهای دامنه‌ای تمیز"],
    ["LuWorkflow", "داده‌ی توزیع‌شده‌ی سازگار با Saga، Outbox و Idempotency"],
    ["LuSparkles", "هوش مصنوعی صادق: واقعیت از ابزار، تصمیم با کاربر"],
  ];
  for (let i = 0; i < items.length; i++) {
    const y = 3.0 + i * 0.85;
    box(s, 4.9, y, 7.83, 0.7, { fill: C.background1, transparency: 88 });
    await iconCircle(s, items[i][0], RIGHT - 0.15 - 0.5, y + 0.1, 0.5, C.accent2);
    text(s, items[i][1], 5.1, y, 6.75, 0.7, { fontSize: 18, color: C.background1, valign: "middle" });
  }
  text(s, "پرسش و پاسخ", 4.9, 5.75, 7.83, 0.7, { fontSize: 32, bold: true, color: C.accent2, valign: "middle" });
  text(s, "سپاس از توجه شما", 4.9, 6.42, 7.83, 0.45, { fontSize: 16, color: C.background2 });
  await iconCircle(s, "LuSprout", 1.4, 2.2, 2.6, C.accent1);
  s.addNotes(
    "جمع‌بندی در سه جمله: یک معماری Cloud-Native با مرزهای دامنه‌ای تمیز ساختیم؛ سازگاری داده در سیستم توزیع‌شده را با Saga، Outbox و Idempotency تضمین کردیم؛ " +
      "و هوش مصنوعی را طوری طراحی کردیم که صادق باشد: واقعیت‌ها از ابزار می‌آیند و تصمیم نهایی با کاربر است. ممنون از توجه شما؛ آماده‌ی پرسش‌ها هستم."
  );
}

// ---------- theme post-processing ----------
// pptxgenjs writes Office's palette and leaves the complex-script (Persian) font slots empty or
// mapped to Times New Roman. Write our colors and point every complex-script slot at our font.
async function finalizeTheme(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = "ppt/theme/theme1.xml";
  const scheme = `<a:clrScheme name="${THEME.name}">${SLOTS.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("")}</a:clrScheme>`;
  const xml = (await zip.file(part).async("string"))
    .replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${THEME.name}"`)
    .replace(/<a:cs typeface="[^"]*"\s*\/>/g, `<a:cs typeface="${FONT}"/>`)
    .replace(/<a:font script="Arab" typeface="[^"]*"\s*\/>/g, `<a:font script="Arab" typeface="${FONT}"/>`);
  if (!xml.includes(scheme)) throw new Error("theme1.xml has no color scheme to replace");
  zip.file(part, xml);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml")) continue;
    const bad = (await zip.file(name).async("string")).match(/<a:srgbClr val="((?![0-9A-Fa-f]{6}")[^"]*)"/);
    if (bad) throw new Error(`${name}: <a:srgbClr val="${bad[1]}"> — a scheme color was passed to a hex-only option`);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

async function main() {
  const slides = [s01Title, s02Why, s03Principles, s04Quality, s05Overview, s06Contexts, s07Comms, s08Saga, s09Patterns, s10Data, s11Docker, s12K8s, s13Cicd, s14Obs, s15AiArch, s16Assistant, s17Security, s18Adr, s19Roadmap, s20Closing];
  const sections = new Set();
  for (const build of slides) {
    // sections are declared just before their first slide
    const src = build.toString();
    const m = src.match(/sectionTitle: "([^"]+)"|contentSlide\(\s*"([^"]+)"/);
    const sec = m && (m[1] || m[2]);
    if (sec && !sections.has(sec)) {
      pres.addSection({ title: sec });
      sections.add(sec);
    }
    await build();
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  await finalizeTheme(OUT);
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
