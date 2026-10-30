import { formatFaNumber } from "./digits";

/** Weights are integer grams. «۵۰۰ گرم» · «۱ کیلو» · «۲٫۵ کیلو» */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${formatFaNumber(grams)} گرم`;
  const kg = Math.round(grams / 100) / 10;
  return `${formatFaNumber(kg)} کیلو`;
}
