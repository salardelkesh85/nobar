import { cityName, LISTINGS, provinceOfCity, ratingBayes, SHOP_TYPE_FA, SHOPS } from "@nobar/demo";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";

export const metadata: Metadata = { title: "غرفه‌ها" };

export default function ShopsPage() {
  const shops = [...SHOPS].sort((a, b) => ratingBayes(b) - ratingBayes(a));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">غرفه‌های نوبر</h1>
        <p className="text-sm text-ink-soft">باغدارها، تعاونی‌ها و میوه‌فروشی‌هایی که مستقیم از مبدأ می‌فروشند؛ به ترتیب امتیاز.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((s) => (
          <li key={s.id}>
            <Link href={`/shop/${s.id}`} className="flex gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
              <Photo kind={s.art} alt="" sizes="64px" className="size-16 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-bold">
                  <span className="truncate">{s.name}</span>
                  <BadgeCheck className="size-4 shrink-0 text-brand" aria-label="هویت تأییدشده" />
                </p>
                <p className="flex items-center gap-1 text-xs text-ink-soft">
                  <MapPin className="size-3.5" aria-hidden />
                  {cityName(s.cityId)}، {provinceOfCity(s.cityId)?.name} · {SHOP_TYPE_FA[s.type]}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-0.5 font-bold">
                    <Star className="size-3.5 fill-saffron text-saffron" aria-hidden />
                    {s.ratingAvg.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-ink-soft">({s.ratingCount.toLocaleString("fa-IR")} نظر)</span>
                  <span className="text-ink-soft">· {LISTINGS.filter((l) => l.shopId === s.id).length.toLocaleString("fa-IR")} محصول</span>
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-brand-strong">{s.story.title}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
