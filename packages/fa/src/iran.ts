import { toEnDigits } from "./digits";

/** Iranian national ID (کد ملی): 10 digits with a mod-11 check digit; repeated-digit codes are invalid. */
export function isValidNationalId(input: string): boolean {
  const code = toEnDigits(input).replace(/\D/g, "");
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const sum = digits.slice(0, 9).reduce((s, d, i) => s + d * (10 - i), 0) % 11;
  const check = digits[9]!;
  return sum < 2 ? check === sum : check === 11 - sum;
}

/** Iranian IBAN (شبا): "IR" + 24 digits, ISO 13616 mod-97 check. Spaces and Persian digits are accepted. */
export function normalizeSheba(input: string): string | null {
  const v = toEnDigits(input).replace(/[\s-]/g, "").toUpperCase();
  const iban = /^\d{24}$/.test(v) ? `IR${v}` : v;
  if (!/^IR\d{24}$/.test(iban)) return null;
  const rearranged = `${iban.slice(4)}1827${iban.slice(2, 4)}`; // I=18, R=27
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1 ? iban : null;
}
