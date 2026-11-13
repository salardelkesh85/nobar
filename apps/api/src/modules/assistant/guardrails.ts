import { toEnDigits } from "@nobar/fa";

// Guardrails that do not depend on the model behaving well.

/** Seller and buyer text is data, never instructions: no markup that could close our delimiters, and a bounded length. */
export function sanitizeUntrusted(text: string, max = 300): string {
  return text.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Tool results go to the model inside a delimiter that the system prompt declares to be untrusted data. */
export function wrapToolResult(name: string, result: unknown): string {
  return `<tool_result name="${name}" trust="data-only">\n${JSON.stringify(result)}\n</tool_result>`;
}

/** Phone numbers and long digit runs (cards, national IDs) never reach the audit log. */
export function redactPii(text: string): string {
  return toEnDigits(text)
    .replace(/\d{12,}/g, "[number]")
    .replace(/(?<!\d)(?:\+98|0)?9\d{9}(?!\d)/g, "[phone]")
    .replace(/\d{10,}/g, "[number]");
}

const numbersIn = (text: string): number[] =>
  // "۶۴۵,۰۰۰" / "645٬000" / "645000" → 645000
  (toEnDigits(text).replace(/(?<=\d)[,٬،.](?=\d{3}(?!\d))/g, "").match(/\d+/g) ?? []).map(Number);

function collectNumbers(value: unknown, into: Set<number>): void {
  if (typeof value === "number" && Number.isFinite(value)) into.add(Math.round(value));
  else if (typeof value === "string") for (const n of numbersIn(value)) into.add(n);
  else if (Array.isArray(value)) for (const v of value) collectNumbers(v, into);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectNumbers(v, into);
}

/**
 * Every amount the assistant states must come from a tool result of this turn (or from the buyer's own
 * words). Amounts are stored in Rial and spoken in Toman, so a tool value also covers its tenth.
 * Returns the numbers that have no source; small numbers (counts, days, kilos) are not checked.
 */
export function ungroundedNumbers(message: string, toolResults: unknown[], userText: string): number[] {
  const known = new Set<number>();
  for (const r of toolResults) collectNumbers(r, known);
  // spoken in Toman: a tenth of the Rial value, whichever way an odd Rial was rounded
  for (const n of [...known]) for (const toman of [Math.floor(n / 10), Math.round(n / 10), Math.ceil(n / 10)]) known.add(toman);
  // the buyer's own figures, also when they said "۸۰۰ هزار" or "۲ میلیون"
  for (const n of numbersIn(userText)) for (const scale of [1, 1000, 1_000_000]) known.add(n * scale);
  return [...new Set(numbersIn(message))].filter((n) => n >= 1000 && !known.has(n));
}

/** The same redaction for every string inside a value that is about to be logged. */
export function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactPii(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}
