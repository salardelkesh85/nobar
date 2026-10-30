import { CATEGORIES, cityName, LISTINGS, PRODUCE_TYPES, SHOPS } from "@nobar/demo";
import { ChevronLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

export default function CategoriesPage() {
  const originCities = [...new Set(SHOPS.map((s) => s.cityId))];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">دسته‌بندی‌ها</h1>
      {CATEGORIES.map((c) => {
        const types = PRODUCE_TYPES.filter((p) => p.categoryId === c.id && LISTINGS.some((l) => l.produceTypeId === p.id));
        if (!types.length) return null;
        return (
          <section key={c.id} className="rounded-card border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <Photo kind={c.art} alt="" sizes="32px" className="size-8 rounded-full" />
                {c.name}
              </h2>
              <Link href={`/search?cat=${c.id}`} className="inline-flex items-center gap-0.5 text-sm font-bold text-brand hover:underline">
                همه‌ی محصولات {c.name}
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {types.map((pt) => {
                const count = LISTINGS.filter((l) => l.produceTypeId === pt.id).length;
                return (
                  <li key={pt.id}>
                    <Link href={`/p/${pt.slug}`} className="group flex flex-col items-center gap-2 text-center">
                      <Photo kind={pt.id} alt="" sizes="96px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="aspect-square w-full max-w-24 rounded-full ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-brand" />
                      <span className="text-sm font-semibold">{pt.name}</span>
                      <span className="-mt-1.5 text-[0.7rem] text-ink-soft">{count.toLocaleString("fa-IR")} غرفه</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-1 text-lg font-extrabold">شهرهای مبدأ</h2>
        <p className="mb-3 text-sm text-ink-soft">از باغ‌های هر شهر مستقیم بخرید</p>
        <ul className="flex flex-wrap gap-2">
          {originCities.map((id) => (
            <li key={id}>
              <Link href={`/origin/${id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-line px-3 text-sm font-semibold hover:border-brand hover:text-brand">
                <MapPin className="size-4" aria-hidden />
                {cityName(id)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
