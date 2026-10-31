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
  return (
    <div>
      <PageIntro
        eyebrow="بازار به سلیقهٔ تو"
        title="یک دنیا طعم، همین‌جا."
        description="از میوهٔ فصل تا سبزی هر روز؛ چیزی که دوست داری را پیدا کن."
        href="/season"
        action="این روزها فصل چیه؟"
      >
        <div className="studio-category-preview">
          {["pomegranate", "tangerine", "apple-red"].map((kind) => (
            <Photo
              key={kind}
              kind={kind}
              alt=""
              sizes="110px"
              className="studio-preview-fruit"
            />
          ))}
        </div>
      </PageIntro>
      <nav className="studio-category-jumps" aria-label="رفتن به دسته">
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`#category-${c.id}`}>
            {c.name}
            <ArrowLeft size={14} />
          </a>
        ))}
      </nav>
      {CATEGORIES.map((c, index) => {
        const types = PRODUCE_TYPES.filter(
          (p) =>
            p.categoryId === c.id &&
            LISTINGS.some(
              (l) => l.produceTypeId === p.id && l.status === "PUBLISHED",
            ),
        );
        if (!types.length) return null;
        return (
          <section
            key={c.id}
            id={`category-${c.id}`}
            className="studio-category-section"
          >
            <div className="studio-category-title">
              <span>
                {(index + 1).toLocaleString("fa-IR", {
                  minimumIntegerDigits: 2,
                })}
              </span>
              <h2>{c.name}</h2>
              <Link href={`/search?cat=${c.id}`}>
                دیدن محصولات
                <ArrowLeft size={15} />
              </Link>
            </div>
            <ul>
              {types.map((pt) => (
                <li key={pt.id}>
                  <Link href={`/p/${pt.id}`}>
                    <Photo
                      kind={pt.id}
                      alt=""
                      sizes="(max-width: 700px) 27vw, 150px"
                      fallback={{ emoji: pt.emoji, hue: pt.hue }}
                      className="studio-category-produce"
                    />
                    <span>{pt.name}</span>
                    <small>
                      {LISTINGS.filter(
                        (l) =>
                          l.produceTypeId === pt.id && l.status === "PUBLISHED",
                      ).length.toLocaleString("fa-IR")}{" "}
                      محصول
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="studio-origin-links">
        <div>
          <span className="studio-eyebrow">سرزمین طعم‌ها</span>
          <h2>دوست داری از کجا خرید کنی؟</h2>
        </div>
        <ul>
          {origins.map((id) => (
            <li key={id}>
              <Link href={`/origin/${id}`}>
                <MapPin size={14} />
                {cityName(id)}
                <ArrowLeft size={14} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
