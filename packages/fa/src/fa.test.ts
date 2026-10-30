import { describe, expect, it } from "vitest";
import { parseBudgetRial, parsePeopleCount } from "./amount";
import { formatJalaliDate, relativeDayFa, tehranDaysBetween } from "./date";
import { formatFaNumber, toEnDigits, toFaDigits } from "./digits";
import { formatToman, formatTomanShort, rialToToman } from "./money";
import { normalizeFa, searchKey, tokenizeFa } from "./normalize";
import { formatWeight } from "./weight";

describe("digits", () => {
  it("converts both ways, including Arabic-Indic digits", () => {
    expect(toFaDigits(1405)).toBe("۱۴۰۵");
    expect(toEnDigits("۰۹۱۲٠١٢")).toBe("0912012");
  });
  it("groups thousands with the Persian separator", () => {
    expect(formatFaNumber(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatFaNumber(2.5)).toBe("۲٫۵");
  });
});

describe("money (Rial stored, Toman shown)", () => {
  it("formats Toman from integer Rial", () => {
    expect(rialToToman(1_250_000)).toBe(125_000);
    expect(formatToman(1_250_000)).toBe("۱۲۵٬۰۰۰ تومان");
    expect(formatTomanShort(8_000_000)).toBe("۸۰۰ هزار تومان");
    expect(formatTomanShort(15_000_000)).toBe("۱٫۵ میلیون تومان");
  });
});

describe("budget and people from Persian text", () => {
  it("reads colloquial budgets", () => {
    expect(parseBudgetRial("سبد میوه با ۸۰۰ هزار تومن")).toBe(8_000_000);
    expect(parseBudgetRial("یک و نیم میلیون")).toBe(15_000_000);
    expect(parseBudgetRial("بودجه ۵۰۰ تومن")).toBe(5_000_000);
    expect(parseBudgetRial("بدون بودجه")).toBeUndefined();
  });
  it("reads head counts", () => {
    expect(parsePeopleCount("مهمونی ۱۰ نفره")).toBe(10);
    expect(parsePeopleCount("برای چهار نفر")).toBe(4);
  });
});

describe("normalization and search keys", () => {
  it("unifies Arabic letters, digits and spacing", () => {
    expect(normalizeFa("سيب  كرج ۱۲")).toBe("سیب کرج 12");
  });
  it("treats ZWNJ, space and joined forms of a compound as one key", () => {
    expect(searchKey("گوجه‌فرنگی")).toBe(searchKey("گوجه فرنگی"));
    expect(tokenizeFa("گوجه‌فرنگی تازه")).toEqual(expect.arrayContaining(["گوجهفرنگی", "گوجه", "فرنگی", "تازه"]));
  });
});

describe("weight and dates", () => {
  it("formats grams as kilo or gram", () => {
    expect(formatWeight(500)).toBe("۵۰۰ گرم");
    expect(formatWeight(2500)).toBe("۲٫۵ کیلو");
  });
  it("counts Tehran calendar days, not 24-hour periods", () => {
    // 23:00 and 01:00 Tehran time on consecutive days are one calendar day apart
    expect(tehranDaysBetween("2026-10-29T19:30:00Z", "2026-10-29T21:30:00Z")).toBe(1);
    expect(relativeDayFa("2026-10-29T08:00:00Z", "2026-10-29T12:00:00Z")).toBe("امروز");
  });
  it("shows the Jalali calendar", () => {
    expect(formatJalaliDate("2026-10-30T08:00:00Z")).toContain("آبان");
  });
});
