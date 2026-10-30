import { CATEGORIES, cityName, LISTINGS, PRODUCE_TYPES, SHOPS } from "@nobar/demo";
import { Card, ProduceArt, SectionHeader } from "@nobar/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "دسته‌ها" };

export default function CategoriesPage() {
  const originCities = [...new Set(SHOPS.map((s) => s.cityId))];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black">دسته‌ها</h1>
      {CATEGORIES.map((c) => {
        const types = PRODUCE_TYPES.filter((p) => p.categoryId === c.id && LISTINGS.some((l) => l.produceTypeId === p.id));
        if (!types.length) return null;
        return (
          <section key={c.id}>
            <SectionHeader
              title={`${c.emoji} ${c.name}`}
              action={
                <Link href={`/search?cat=${c.id}`} className="text-sm font-bold text-brand hover:underline">
                  همه
                </Link>
              }
            />
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
              {types.map((pt) => (
                <li key={pt.id}>
                  <Link href={`/p/${pt.slug}`} className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-3 text-center hover:border-brand">
                    <ProduceArt emoji={pt.emoji} kind={pt.id} hue={pt.hue} size="sm" className="size-14 rounded-full" />
                    <span className="text-sm font-bold">{pt.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section>
        <SectionHeader title="شهرهای مبدأ" subtitle="از باغ‌های هر شهر مستقیم بخرید" />
        <ul className="flex flex-wrap gap-2">
          {originCities.map((id) => (
            <li key={id}>
              <Link href={`/origin/${id}`}>
                <Card className="min-h-11 px-4 py-2 text-sm font-bold hover:border-brand">{cityName(id)}</Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
