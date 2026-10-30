const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/** Latin digits → Persian digits (display only). */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA[Number(d)]!);
}

/** Persian and Arabic-Indic digits → Latin digits (for parsing user input). */
export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

/** Formats an integer with Persian digits and the Persian thousands separator (٬). */
export function formatFaNumber(value: number): string {
  const [int, frac] = Math.abs(value).toString().split(".");
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  const out = frac ? `${grouped}٫${frac}` : grouped;
  return toFaDigits(value < 0 ? `-${out}` : out);
}
