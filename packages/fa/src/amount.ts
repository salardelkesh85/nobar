import { toEnDigits } from "./digits";
import { normalizeFa } from "./normalize";
import type { Rial } from "./money";

const WORD_NUMBERS: Record<string, number> = {
  یک: 1, یه: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, شیش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10,
  یازده: 11, دوازده: 12, پانزده: 15, بیست: 20, سی: 30, چهل: 40, پنجاه: 50, صد: 100, دویست: 200,
  سیصد: 300, چهارصد: 400, پانصد: 500, ششصد: 600, هفتصد: 700, هشتصد: 800, نهصد: 900,
};

function wordToNumber(word: string): number | undefined {
  if (/^\d+(\.\d+)?$/.test(word)) return Number(word);
  return WORD_NUMBERS[word];
}

const BUDGET_RE =
  /(\d+(?:\.\d+)?|[^\s\d]+)(?:\s*و\s*(نیم))?\s*(هزار|میلیون|ملیون|تومن|تومان|ریال|تومنه|تومانه)(?:\s*(تومن|تومان|ریال|تومنه|تومانه))?/g;

/**
 * Extracts a budget from Persian text and returns it in Rial.
 * «۸۰۰ هزار تومن» → 8,000,000 · «یک و نیم میلیون» → 15,000,000 · «بودجه ۵۰۰ تومن» is read
 * colloquially as 500 thousand Toman (values below 1,000 followed by تومن/تومان).
 */
export function parseBudgetRial(text: string): Rial | undefined {
  const t = normalizeFa(toEnDigits(text)).replace(/[,٬]/g, "").replace(/٫/g, ".");
  for (const m of t.matchAll(BUDGET_RE)) {
    let n = wordToNumber(m[1]!);
    if (n === undefined) continue;
    if (m[2]) n += 0.5;
    const scale = m[3]!;
    const unit = m[4] ?? (scale === "هزار" || scale.startsWith("میلیون") || scale === "ملیون" ? "تومان" : scale);
    let toman = n;
    if (scale === "هزار") toman = n * 1_000;
    else if (scale === "میلیون" || scale === "ملیون") toman = n * 1_000_000;
    else if (n < 1_000) toman = n * 1_000;
    return Math.round(unit === "ریال" ? toman : toman * 10);
  }
  return undefined;
}

/** «برای ۱۰ نفر» / «مهمونی ۱۰ نفره» / «خانواده‌ی چهار نفره» → 10 / 4 */
export function parsePeopleCount(text: string): number | undefined {
  const t = normalizeFa(toEnDigits(text));
  for (const m of t.matchAll(/(\d+|[^\s\d]+)\s*(?:نفر|نفره|نفری)/g)) {
    const n = wordToNumber(m[1]!);
    if (n && n > 0 && n < 500) return n;
  }
  return undefined;
}
