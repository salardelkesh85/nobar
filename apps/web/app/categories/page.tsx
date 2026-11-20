import {
  CATEGORIES,
  cityName,
  LISTINGS,
  PRODUCE_TYPES,
  SHOPS,
} from "@nobar/demo";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

export default function CategoriesPage() {
  const origins = [
    ...new Set(SHOPS.filter((s) => s.status === "ACTIVE").map((s) => s.cityId)),
  ];
  const published = (typeId: string) => LISTINGS.filter((l) => l.produceTypeId === typeId && l.status === "PUBLISHED").length;
  return (
    <div className="nx-catpage">
      <PageIntro title="دسته‌بندی محصولات" description="میوه، سبزی و خشکبار؛ هر محصول از چند غرفه." href="/season" action="تقویم فصل" />
      <nav className="nx-catpage-jumps" aria-label="رفتن به دسته">
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`#category-${c.id}`} className="nx-chip">
            {c.name}
          </a>
        ))}
      </nav>
      {CATEGORIES.map((c) => {
        const types = PRODUCE_TYPES.filter((p) => p.categoryId === c.id && published(p.id) > 0);
        if (!types.length) return null;
        return (
          <section key={c.id} id={`category-${c.id}`} className="nx-section nx-catpage-section">
            <div className="nx-section-head">
              <h2 className="nx-section-title">{c.name}</h2>
              <Link href={`/search?cat=${c.id}`} className="nx-section-more">
                همه‌ی محصولات <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="nx-catpage-grid">
              {types.map((pt) => (
                <li key={pt.id}>
                  <Link href={`/p/${pt.id}`} className="nx-cat">
                    <Photo kind={pt.id} alt="" sizes="(max-width: 700px) 22vw, 96px" fallback={{ emoji: pt.emoji, hue: pt.hue }} className="nx-cat-photo" />
                    <span className="nx-cat-name">{pt.name}</span>
                    <small className="nx-cat-count">{published(pt.id).toLocaleString("fa-IR")} محصول</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="nx-section">
        <div className="nx-section-head">
          <div>
            <h2 className="nx-section-title">خرید از مبدأ</h2>
            <p className="nx-section-sub">محصول هر شهر، از باغدارهای همان‌جا</p>
          </div>
        </div>
        <ul className="nx-origins">
          {origins.map((id) => (
            <li key={id}>
              <Link href={`/origin/${id}`} className="nx-origin">
                <MapPin className="size-4" aria-hidden />
                <span>{cityName(id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
