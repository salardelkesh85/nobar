// Plain-text fallbacks for the seller copilot. They are also what the rule-based model answers with,
// and what a seller gets when a real model's answer fails a check.

export interface ListingFacts {
  produceType: string;
  variety?: string;
  grade: "PREMIUM" | "GRADE_1" | "GRADE_2" | "PROCESSING";
  originCity: string;
  isOrganic: boolean;
  harvestedDaysAgo?: number;
  storageTips?: string;
  /** the seller's own notes (their words; treated as data) */
  notes?: string;
}

const GRADE_FA: Record<ListingFacts["grade"], string> = { PREMIUM: "ممتاز", GRADE_1: "درجه یک", GRADE_2: "درجه دو", PROCESSING: "مناسب فرآوری (رب، مربا، آبگیری)" };

export function listingTemplate(f: ListingFacts): { title: string; description: string } {
  const name = [f.produceType, f.variety].filter(Boolean).join(" ");
  const harvest = f.harvestedDaysAgo === undefined ? "" : f.harvestedDaysAgo === 0 ? "امروز برداشت شده است. " : f.harvestedDaysAgo === 1 ? "دیروز برداشت شده است. " : `${f.harvestedDaysAgo.toLocaleString("fa-IR")} روز پیش برداشت شده است. `;
  return {
    title: `${name} ${f.originCity}`.slice(0, 80),
    description: [`${name} ${GRADE_FA[f.grade]} از ${f.originCity}${f.isOrganic ? "، ارگانیک" : ""}. `, harvest, f.notes ? `${f.notes.trim().replace(/[.!؟]*$/, "")}. ` : "", f.storageTips ?? ""].join("").trim().slice(0, 600),
  };
}

export interface ReviewFacts {
  rating: number;
  freshnessRating: number;
  text: string;
  shopName: string;
}

export function reviewReplyTemplate(f: ReviewFacts): string {
  if (f.rating >= 4) return `سپاس از خرید و نظر شما. خوشحالیم که راضی بودید؛ ${f.shopName} منتظر سفارش بعدی شماست.`;
  if (f.rating === 3) return `سپاس از نظر شما. نکته‌ای که نوشتید را بررسی می‌کنیم تا سفارش بعدی بهتر به دستتان برسد. ${f.shopName}`;
  return `از اینکه این سفارش مطابق انتظار شما نبود متأسفیم. نظر شما را بررسی می‌کنیم؛ اگر هنوز در مهلت شکایت هستید، از صفحه‌ی سفارش شکایت ثبت کنید تا رسیدگی شود. ${f.shopName}`;
}
