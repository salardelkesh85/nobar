import { CATEGORIES, currentMonth, JALALI_MONTHS, PRODUCE_TYPES } from "@nobar/demo";
import { cn } from "@nobar/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { NobarSubscribe } from "@/components/nobar-subscribe";
import { Photo } from "@/components/photo";

export const metadata: Metadata = { title: "تقویم نوبر", description: "هر میوه و سبزی در کدام ماه در فصل خودش است." };

export default function SeasonPage() {
  const month = currentMonth();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-extrabold sm:text-2xl">تقویم نوبر</h1>
        <p className="mt-1 text-ink-soft">هر محصول در کدام ماه‌ها فصل دارد. خانه‌های پررنگ اوج فصل است. ماه جاری: {JALALI_MONTHS[month - 1]}.</p>
      </header>
      <div className="studio-season-scroll overflow-x-auto rounded-card border border-line bg-surface" role="region" aria-label="تقویم فصل‌ها؛ برای دیدن همهٔ ماه‌ها جدول را افقی حرکت دهید" tabIndex={0}>
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">تقویم فصل محصولات بر اساس ماه شمسی</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 bg-surface p-3 text-start">محصول</th>
              {JALALI_MONTHS.map((m, i) => (
                <th key={m} scope="col" className={cn("p-1 text-center text-xs font-bold", i + 1 === month ? "text-brand" : "text-ink-soft")}>
                  {m}
                </th>
              ))}
              <th scope="col" className="p-3"><span className="sr-only">خبر نوبر</span></th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.flatMap((c) =>
              PRODUCE_TYPES.filter((p) => p.categoryId === c.id).map((pt) => (
                <tr key={pt.id} className="border-t border-line">
                  <th scope="row" className="sticky start-0 bg-surface p-2 text-start font-medium">
                    <Link href={`/p/${pt.id}`} className="flex items-center gap-2 hover:text-brand">
                      <Photo kind={pt.id} alt="" className="size-8 shrink-0 rounded-full text-base [&_span]:text-xl" fallback={{ emoji: pt.emoji, hue: pt.hue }} />
                      {pt.name}
                    </Link>
                  </th>
                  {JALALI_MONTHS.map((m, i) => {
                    const on = pt.months.includes(i + 1);
                    const peak = pt.peakMonths.includes(i + 1);
                    return (
                      <td key={m} className={cn("p-1", i + 1 === month && "bg-brand-soft/50")}>
                        <span
                          className={cn("block h-6 rounded-md", peak ? "bg-brand" : on ? "bg-brand/35" : "bg-transparent")}
                          title={on ? (peak ? `${m}: اوج فصل` : `${m}: در فصل`) : undefined}
                        >
                          <span className="sr-only">{on ? (peak ? "اوج فصل" : "در فصل") : "خارج از فصل"}</span>
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-2">
                    <NobarSubscribe produceTypeId={pt.id} name={pt.name} />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-soft">داده‌های فصل تقریبی است و کارشناس نوبر آن را برای هر استان بازبینی می‌کند.</p>
    </div>
  );
}
