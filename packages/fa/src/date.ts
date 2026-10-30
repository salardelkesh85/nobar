const TZ = "Asia/Tehran";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, ...opts });
const dateFmt = fmt({ year: "numeric", month: "long", day: "numeric" });
const shortFmt = fmt({ month: "long", day: "numeric" });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const monthFmt = new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: TZ, month: "numeric" });

/** «۳۰ مهر ۱۴۰۵» — dates are stored in UTC and shown in the Jalali calendar, Tehran time. */
export function formatJalaliDate(date: Date | string): string {
  return dateFmt.format(new Date(date));
}

/** «۳۰ مهر» */
export function formatJalaliShort(date: Date | string): string {
  return shortFmt.format(new Date(date));
}

/** «۳۰ مهر ۱۴۰۵، ۱۴:۰۵» */
export function formatJalaliDateTime(date: Date | string): string {
  const d = new Date(date);
  return `${dateFmt.format(d)}، ${timeFmt.format(d)}`;
}

/** Jalali month number 1–12 (Farvardin = 1) in Tehran time. */
export function jalaliMonth(date: Date | string = new Date()): number {
  return Number(monthFmt.format(new Date(date)));
}

export type Season = "spring" | "summer" | "autumn" | "winter";
export const SEASON_FA: Record<Season, string> = { spring: "بهار", summer: "تابستان", autumn: "پاییز", winter: "زمستان" };

export function jalaliSeason(date: Date | string = new Date()): Season {
  const m = jalaliMonth(date);
  return m <= 3 ? "spring" : m <= 6 ? "summer" : m <= 9 ? "autumn" : "winter";
}

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Whole calendar days between two instants, counted in Tehran time (b − a). */
export function tehranDaysBetween(a: Date | string, b: Date | string): number {
  const day = (d: Date | string) => Date.parse(`${dayKeyFmt.format(new Date(d))}T00:00:00Z`);
  return Math.round((day(b) - day(a)) / 86_400_000);
}

/** «امروز» · «دیروز» · «۳ روز پیش» · «فردا» · «۲ روز دیگر» */
export function relativeDayFa(date: Date | string, now: Date | string = new Date()): string {
  const diff = tehranDaysBetween(date, now);
  if (diff === 0) return "امروز";
  if (diff === 1) return "دیروز";
  if (diff === -1) return "فردا";
  if (diff > 1) return `${Math.abs(diff).toLocaleString("fa-IR")} روز پیش`;
  return `${Math.abs(diff).toLocaleString("fa-IR")} روز دیگر`;
}

/** Human freshness label from hours since harvest. */
export function freshnessLabel(hours: number): string {
  if (hours < 24) return "برداشت امروز";
  const days = Math.floor(hours / 24);
  if (days === 1) return "برداشت دیروز";
  return `برداشت ${days.toLocaleString("fa-IR")} روز پیش`;
}
