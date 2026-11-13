import { CITIES } from "@nobar/contracts/cities";
import { formatToman, normalizeFa, parseBudgetRial, parsePeopleCount, toEnDigits } from "@nobar/fa";
import type { ChatMessage, ChatRequest, ChatResult, LlmProvider, ToolCall } from "./llm";

// A deterministic stand-in for a language model: fixed rules pick one tool, and the answer is written
// only from that tool's result. It runs the evals in CI and keeps the assistant usable when no model
// is configured. It follows the same contract as a real model: it never knows a price by itself.

const FILLER = new Set(["تازه", "برسه", "برسد", "برسن", "میرسه", "می‌رسه", "میخوام", "می‌خوام", "میخواهم", "می‌خواهم", "بده", "پیدا", "کن", "کنید", "لطفا", "لطفاً", "یه", "یک", "خوب", "خوبه", "برای", "که", "تا", "به", "دارید", "داری", "هست", "چی", "شهر", "رو", "را", "مقایسه", "ارگانیک", "ارزان", "ارزون", "ارزان‌ترین", "ارزونترین", "قیمت", "چنده", "چند", "از", "و", "با", "من", "هم", "پس", "است", "شماره"]);

function cleanQuery(text: string): string {
  let t = toEnDigits(normalizeFa(text));
  for (const c of CITIES) t = t.replaceAll(normalizeFa(c.name), " ");
  return t
    .replace(/[؟?!.،,:]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w) && !/^(ارزون|ارزان)/.test(w) && !/\d/.test(w))
    .join(" ");
}

const fa = (n: number) => n.toLocaleString("fa-IR");

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- tool results are read defensively below

function parseToolContent(content: string): Json {
  try {
    return JSON.parse(content.replace(/^<tool_result[^>]*>\n?/, "").replace(/\n?<\/tool_result>$/, "")) as Json;
  } catch {
    return {};
  }
}

function plan(text: string): ToolCall | string {
  const n = normalizeFa(text);
  const call = (name: string, args: unknown): ToolCall => ({ id: `fake-${name}`, name, arguments: args });
  if (/سبدم|سبد خریدم|سبد من|توی سبد/.test(n)) return call("get_cart", {});
  if (/مقایسه|کدوم بهتر|کدام بهتر/.test(n)) {
    const query = cleanQuery(text);
    return query ? call("compare_products", { query }) : "کدام محصول را مقایسه کنم؟ مثلاً بنویسید «انار را مقایسه کن».";
  }
  const budget = parseBudgetRial(text);
  if (budget || /سبد|مهمونی|مهمانی|یلدا/.test(n)) {
    const people = parsePeopleCount(text);
    return call("build_basket", { ...(budget ? { budgetRial: budget } : {}), ...(people ? { people } : {}) });
  }
  if (/فصل|نوبر چی|الان چی/.test(n)) return call("get_seasonal_suggestions", {});
  const query = cleanQuery(text);
  if (!query || /^(سلام|درود|وقت بخیر|خسته نباشید?)( .{0,12})?$/.test(n.trim())) return "سلام! من باغبون هستم و در خرید میوه و سبزی کمک می‌کنم. مثلاً بنویسید «سیب ترش برای کمپوت» یا «سبد میوه برای ۶ نفر با ۸۰۰ هزار تومن».";
  return call("search_products", { query, ...(/ارگانیک/.test(n) ? { organicOnly: true } : {}), ...(/ارزان|ارزون/.test(n) ? { sort: "landed" } : {}) });
}

function compose(tool: string, r: Json): string {
  if (typeof r.error === "string" && tool !== "build_basket") return `${r.error}.`;
  switch (tool) {
    case "search_products": {
      if (!r.results?.length) return "چیزی با این مشخصات پیدا نکردم که تازه به شهر شما برسد. من فقط در خرید میوه و سبزی کمک می‌کنم؛ مثلاً بنویسید «پرتقال آبگیری» یا «سبد میوه برای ۴ نفر».";
      const b = r.results[0];
      return [
        `${fa(r.total)} محصول پیدا کردم که تازه به ${r.destCity} می‌رسد.`,
        `پیشنهاد اول: ${b.title} از ${b.shop}؛ تمام‌شده هر کیلو ${formatToman(b.landedPerKgRial)}، ${b.harvest}، رسیدن تا ${fa(b.arrivesWithinDays)} روز.`,
      ].join("\n");
    }
    case "compare_products": {
      if (!r.offers?.length) return `برای ${r.produceType} کمتر از دو پیشنهاد داریم که تازه به ${r.destCity} برسد.`;
      const best = r.offers[0];
      const cheap = [...r.offers].sort((a: Json, b: Json) => a.landedPerKgRial - b.landedPerKgRial)[0];
      const lines = [
        `${fa(r.offers.length)} پیشنهاد ${r.produceType} را برای ${fa(r.kilos)} کیلو تا ${r.destCity} مقایسه کردم.`,
        `بهترین در مجموع: ${best.title} از ${best.shop}، تمام‌شده هر کیلو ${formatToman(best.landedPerKgRial)}، رسیدن تا ${fa(best.arrivesWithinDays)} روز و ${fa(best.freshDaysOnArrival)} روز تازگی هنگام رسیدن.`,
      ];
      if (cheap.listingId !== best.listingId) lines.push(`ارزان‌ترین تا درِ خانه ${cheap.shop} است با هر کیلو ${formatToman(cheap.landedPerKgRial)}.`);
      lines.push("رتبه‌بندی را فرمول ثابت مقایسه‌گر حساب کرده، نه من؛ من فقط توضیحش می‌دهم.");
      return lines.join("\n");
    }
    case "get_seasonal_suggestions":
      return [`این ماه این‌ها در فصل خودشان هستند: ${(r.inSeason ?? []).join("، ")}.`, r.peak?.length ? `اوج فصل: ${r.peak.join("، ")}.` : ""].filter(Boolean).join("\n");
    case "get_cart":
      if (!r.itemCount) return "سبد خریدتان خالی است.";
      return `در سبدتان ${fa(r.itemCount)} قلم هست؛ جمع کالاها ${formatToman(r.itemsRial)} و ارسال ${formatToman(r.deliveryRial)}، در مجموع ${formatToman(r.totalRial)}.${r.hasIssues ? " بعضی قلم‌ها مشکل دارند؛ سبد را ببینید." : ""}`;
    case "build_basket":
    case "propose_basket": {
      if (r.error) return `${r.error}${r.budgetRial ? ` (بودجه ${formatToman(r.budgetRial)})` : ""}. بودجه را کمی بیشتر کنید یا محصول دیگری بگویید.`;
      return [
        `${r.summary}${r.budgetRial ? ` با بودجه‌ی ${formatToman(r.budgetRial)}${r.budgetAssumed ? " (بودجه نگفتید؛ این را فرض کردم)" : ""}` : ""}:`,
        ...r.items.map((i: Json) => `• ${i.title} — ${i.label} × ${fa(i.qty)}: ${formatToman(i.lineRial)}`),
        `جمع کالاها ${formatToman(r.itemsRial)} + ارسال ${formatToman(r.shippingRial)} = ${formatToman(r.totalRial)}.`,
        "اگر موافقید دکمه‌ی تأیید را بزنید تا به سبدتان اضافه شود.",
      ].join("\n");
    }
    default:
      return "متوجه نشدم؛ لطفاً دوباره بپرسید.";
  }
}

export class FakeLlmProvider implements LlmProvider {
  readonly name = "fake";
  readonly model = "rules-v1";

  async chat(request: ChatRequest): Promise<ChatResult> {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const lastUser = request.messages.findLastIndex((m) => m.role === "user");
    const turn = request.messages.slice(lastUser + 1).filter((m): m is Extract<ChatMessage, { role: "tool" }> => m.role === "tool");
    if (turn.length) {
      const last = turn[turn.length - 1]!;
      return { content: compose(last.name, parseToolContent(last.content)), toolCalls: [], usage };
    }
    const user = request.messages[lastUser];
    const step = plan(user?.role === "user" ? user.content : "");
    return typeof step === "string" ? { content: step, toolCalls: [], usage } : { content: "", toolCalls: [step], usage };
  }
}
