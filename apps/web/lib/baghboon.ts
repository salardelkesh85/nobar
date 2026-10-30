// Scripted stand-in for Baghboon until the AI service exists (kit phase 12).
// It follows the same safety rules: every number comes from a "tool" (the demo rules), and every cart
// change is a proposal the user must confirm.
import {
  candidatesForType,
  CITIES,
  cityName,
  compare,
  COMPARE_BADGE_FA,
  currentMonth,
  destinationCities,
  inSeason,
  isOffer,
  isPeak,
  JALALI_MONTHS,
  landedOffer,
  LISTINGS,
  PRODUCE_TYPES,
  quoteGroup,
  search,
  shopById,
  type CartLine,
  type Offer,
  type ProduceType,
  type SearchHit,
} from "@nobar/demo";
import { formatToman, normalizeFa, parseBudgetRial, parsePeopleCount, searchKey } from "@nobar/fa";

export interface Proposal {
  id: string;
  summary: string;
  items: Array<{ listingId: string; packageId: string; qty: number; title: string; label: string; priceRial: number }>;
  itemsRial: number;
  shippingRial: number;
}

export interface BotReply {
  text: string[];
  hits?: SearchHit[];
  proposal?: Proposal;
  compareHref?: string;
}

const FILLER = ["تازه", "برسه", "برسد", "برسن", "میرسه", "می‌رسه", "میخوام", "می‌خوام", "میخواهم", "بده", "پیدا", "کن", "کنید", "لطفا", "لطفاً", "یه", "یک", "خوب", "خوبه", "خوب", "برای", "که", "تا", "به", "دارید", "داری", "هست", "چی", "شهر"];

function detectCity(text: string): string | undefined {
  const t = normalizeFa(text);
  return destinationCities().find((c) => t.includes(normalizeFa(c.name)))?.id;
}

function detectType(text: string): ProduceType | undefined {
  const k = searchKey(text);
  let best: { pt: ProduceType; len: number } | undefined;
  for (const pt of PRODUCE_TYPES) {
    for (const a of [pt.name, ...pt.aliases]) {
      const ak = searchKey(a);
      if (ak.length >= 2 && k.includes(ak) && (!best || ak.length > best.len)) best = { pt, len: ak.length };
    }
  }
  return best?.pt;
}

function cleanQuery(text: string): string {
  let t = normalizeFa(text);
  for (const c of CITIES) t = t.replaceAll(normalizeFa(c.name), " ");
  return t
    .split(/\s+/)
    .filter((w) => w && !FILLER.includes(w))
    .join(" ");
}

function searchLoose(q: string, dest: string): SearchHit[] {
  const words = q.split(" ").filter(Boolean);
  // drop words from the end until something matches (keeps the produce word first)
  for (let n = words.length; n > 0; n--) {
    const hits = search({ dest, q: words.slice(0, n).join(" ") }).hits;
    if (hits.length) return hits;
  }
  return [];
}

let seq = 0;

export function answer(input: string, dest: string): BotReply {
  const text = input.trim();
  const city = detectCity(text) ?? dest;
  const cityNote = city !== dest ? ` (برای ${cityName(city)} حساب کردم، نه ${cityName(dest)})` : "";
  const n = normalizeFa(text);

  // 1) season advice
  if (/فصل|فصلشه|نوبر/.test(n) && !detectType(text)) {
    const m = currentMonth();
    const now = PRODUCE_TYPES.filter((p) => inSeason(p, m) && LISTINGS.some((l) => l.produceTypeId === p.id));
    const peak = now.filter((p) => isPeak(p, m));
    return {
      text: [
        `در ${JALALI_MONTHS[m - 1]} این‌ها در فصل خودشان هستند: ${now.map((p) => p.name).join("، ")}.`,
        peak.length ? `اوج فصل: ${peak.map((p) => p.name).join("، ")}؛ معمولاً هم خوش‌طعم‌ترند و هم قیمت منصفانه‌تری دارند.` : "",
        "تقویم کامل را در صفحه‌ی «تقویم نوبر» ببینید.",
      ].filter(Boolean),
    };
  }

  // 2) comparison
  if (/مقایسه|کدوم بهتر|کدام بهتر|ارزونتر|ارزان‌تر/.test(n)) {
    const pt = detectType(text);
    if (!pt) return { text: ["کدام محصول را مقایسه کنم؟ مثلاً «انار را مقایسه کن»."] };
    const ids = candidatesForType(pt.id, city, 5000);
    if (ids.length < 2) return { text: [`برای ${pt.name} کمتر از دو پیشنهاد داریم که تازه به ${cityName(city)} برسد.`] };
    const c = compare(ids, city, 5000, "balanced");
    const best = c.offers[0]!;
    const cheap = c.offers.find((o) => o.badges.includes("CHEAPEST_LANDED"));
    const lines = [
      `${ids.length.toLocaleString("fa-IR")} پیشنهاد ${pt.name} را برای ۵ کیلو تا ${cityName(city)} مقایسه کردم${cityNote}.`,
      `«${COMPARE_BADGE_FA.BEST_OVERALL}»: ${best.listing.title} از ${best.shop.name}، تمام‌شده هر کیلو ${formatToman(best.landedPerKgRial)}، رسیدن تا ${best.delivery.etaMaxDays.toLocaleString("fa-IR")} روز و ${best.delivery.freshOnArrivalDays.toLocaleString("fa-IR")} روز تازگی هنگام رسیدن.`,
    ];
    if (cheap && cheap !== best) lines.push(`ارزان‌ترین تا درِ خانه ${cheap.shop.name} است با هر کیلو ${formatToman(cheap.landedPerKgRial)}؛ ولی در امتیاز یا تازگی عقب‌تر است.`);
    lines.push("رتبه‌بندی را فرمول ثابت مقایسه‌گر حساب کرده، نه من؛ من فقط توضیحش می‌دهم.");
    return { text: lines, compareHref: `/compare?type=${pt.slug}` };
  }

  // 3) budget basket
  const budget = parseBudgetRial(text);
  if (budget || /سبد|مهمونی|مهمانی|یلدا/.test(n)) {
    const people = parsePeopleCount(text) ?? 4;
    const limit = budget ?? 8_000_000;
    const m = currentMonth();
    const offers: Offer[] = [];
    const seen = new Set<string>();
    for (const l of LISTINGS) {
      const pt = PRODUCE_TYPES.find((p) => p.id === l.produceTypeId)!;
      if (!["fruit", "citrus"].includes(pt.categoryId) || !inSeason(pt, m) || l.grade === "PROCESSING" || l.isPreorder) continue;
      const o = landedOffer(l, city, people >= 6 ? 3000 : 2000);
      if (isOffer(o)) offers.push(o);
    }
    // cheapest whole offers first so the basket gets variety within the budget
    offers.sort((a, b) => a.landedRial - b.landedRial);
    const chosen: CartLine[] = [];
    for (const o of offers) {
      if (seen.has(o.listing.produceTypeId) || chosen.length >= 5) continue;
      const trial = [...chosen, { listing: o.listing, pkg: o.pkg, qty: o.count }];
      if (basketTotal(trial, city).total <= limit) {
        chosen.push({ listing: o.listing, pkg: o.pkg, qty: o.count });
        seen.add(o.listing.produceTypeId);
      }
    }
    if (!chosen.length) return { text: [`با ${formatToman(limit)} نتوانستم سبدی بچینم که تا ${cityName(city)} تازه برسد. بودجه را کمی بیشتر کنید.`] };
    const t = basketTotal(chosen, city);
    const proposal: Proposal = {
      id: `p${++seq}`,
      summary: `سبد میوه برای ${people.toLocaleString("fa-IR")} نفر`,
      items: chosen.map((c) => ({ listingId: c.listing.id, packageId: c.pkg.id, qty: c.qty, title: c.listing.title, label: c.pkg.label, priceRial: c.pkg.priceRial * c.qty })),
      itemsRial: t.items,
      shippingRial: t.shipping,
    };
    return {
      text: [
        `برای ${people.toLocaleString("fa-IR")} نفر با بودجه‌ی ${formatToman(limit)}${budget ? "" : " (بودجه نگفتید؛ این را فرض کردم)"} این سبد را پیشنهاد می‌کنم${cityNote}:`,
        `جمع کالاها ${formatToman(t.items)} + ارسال ${formatToman(t.shipping)} = ${formatToman(t.total)}. همه‌ی قیمت‌ها از داده‌ی همین الان غرفه‌هاست.`,
        "اگر موافقید تأیید کنید تا به سبدتان اضافه شود.",
      ],
      proposal,
    };
  }

  // 4) natural-language search
  const q = cleanQuery(text);
  const hits = q ? searchLoose(q, city) : [];
  if (hits.length) {
    const top = hits.slice(0, 4);
    const b = top[0]!;
    return {
      text: [
        `${hits.length.toLocaleString("fa-IR")} محصول پیدا کردم که تازه به ${cityName(city)} می‌رسد${cityNote}.`,
        `پیشنهاد اول: ${b.listing.title} از ${shopById(b.listing.shopId)?.name}؛ تمام‌شده هر کیلو ${formatToman(b.offer.landedPerKgRial)}، رسیدن تا ${b.offer.delivery.etaMaxDays.toLocaleString("fa-IR")} روز.`,
      ],
      hits: top,
    };
  }
  const pt = detectType(text);
  if (pt) return { text: [`${pt.name} الان تا ${cityName(city)} تازه نمی‌رسد یا فصلش نیست. می‌خواهید وقتی نوبر شد خبرتان کنیم؟ از «تقویم نوبر» زنگوله را بزنید.`] };
  return { text: ["متوجه نشدم دنبال چه هستید. مثلاً بنویسید: «سیب ترش برای کمپوت که تا کرج تازه برسه» یا «سبد میوه برای ۶ نفر با ۸۰۰ هزار تومن»."] };
}

function basketTotal(lines: CartLine[], city: string): { items: number; shipping: number; total: number } {
  const byShop = new Map<string, CartLine[]>();
  for (const l of lines) byShop.set(l.listing.shopId, [...(byShop.get(l.listing.shopId) ?? []), l]);
  let items = 0;
  let shipping = 0;
  for (const [shopId, ls] of byShop) {
    const g = quoteGroup(shopById(shopId)!, ls, city);
    items += g.itemsRial;
    shipping += g.options[0]?.costRial ?? 0;
  }
  return { items, shipping, total: items + shipping };
}
