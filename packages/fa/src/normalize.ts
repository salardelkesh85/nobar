import { toEnDigits } from "./digits";

const ZWNJ = "‌";
// Arabic diacritics (harakat, tanwin, shadda, sukun, superscript alef) and tatweel (kashida)
const DIACRITICS = /[ً-ٰٟـ]/g;

/**
 * Canonical Persian form used everywhere text is compared or indexed:
 * Arabic ي/ك/ة → Persian ی/ک/ه, hamza-carrying alefs → ا (آ is kept), diacritics and kashida removed,
 * Persian/Arabic digits → Latin, ZWNJ kept as a single ZWNJ, whitespace collapsed, lower-cased Latin.
 */
export function normalizeFa(input: string): string {
  return toEnDigits(input)
    .replace(/ي|ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/[أإ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(DIACRITICS, "")
    .replace(/[‌‍‎‏­]+/g, ZWNJ)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Search key: normalized text with ZWNJ removed and common suffix spacing unified, so
 * «گوجه‌فرنگی», «گوجه فرنگی» and «گوجهفرنگی» compare equal as compact keys.
 */
export function searchKey(input: string): string {
  return normalizeFa(input).replace(new RegExp(ZWNJ, "g"), "").replace(/\s+/g, "");
}

const PUNCT = /[.,،؛;:!?؟«»"'()[\]{}\-_/\\|*+=<>@#$%^&~`…]+/g;

/** Splits normalized text into tokens; ZWNJ-joined compounds also yield their parts. */
export function tokenizeFa(input: string): string[] {
  const out: string[] = [];
  for (const raw of normalizeFa(input).replace(PUNCT, " ").split(" ")) {
    if (!raw) continue;
    if (raw.includes(ZWNJ)) {
      out.push(raw.replace(new RegExp(ZWNJ, "g"), ""));
      for (const part of raw.split(ZWNJ)) if (part.length > 1) out.push(part);
    } else {
      out.push(raw);
    }
  }
  return out;
}

export const FA_STOPWORDS = new Set([
  "و", "در", "به", "از", "که", "را", "با", "این", "آن", "برای", "تا", "یا", "هم", "یک", "می", "های", "ها",
  "است", "هست", "بود", "شود", "کن", "کنم", "میخوام", "میخواهم", "خواهم", "لطفا", "لطفاً", "چی", "چه", "کجا",
  "یه", "رو", "تو", "من", "ما", "شما", "دارید", "داری", "داره", "دارم", "بده", "بدید", "کیلو", "تومن", "تومان",
]);

/** Levenshtein distance with an early exit once the distance exceeds `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}
