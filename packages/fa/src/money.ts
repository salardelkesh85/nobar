import { formatFaNumber } from "./digits";

/** All money in Nobar is an integer number of Rials. Toman exists only for display (1 Toman = 10 Rial). */
export type Rial = number;

export function assertRial(value: number): Rial {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`Invalid Rial amount: ${value}`);
  return value;
}

export const rialToToman = (rial: Rial): number => Math.round(rial / 10);
export const tomanToRial = (toman: number): Rial => Math.round(toman * 10);

/** «۱۲۰٬۰۰۰ تومان» */
export function formatToman(rial: Rial, opts: { unit?: boolean } = {}): string {
  const n = formatFaNumber(rialToToman(rial));
  return opts.unit === false ? n : `${n} تومان`;
}

/** Short form for chat and badges: «۱۲۰ هزار تومان», «۱٫۵ میلیون تومان». */
export function formatTomanShort(rial: Rial): string {
  const toman = rialToToman(rial);
  if (toman >= 1_000_000) {
    const m = Math.round((toman / 1_000_000) * 10) / 10;
    return `${formatFaNumber(m)} میلیون تومان`;
  }
  if (toman >= 1_000 && toman % 1_000 === 0) return `${formatFaNumber(toman / 1_000)} هزار تومان`;
  return `${formatFaNumber(toman)} تومان`;
}
