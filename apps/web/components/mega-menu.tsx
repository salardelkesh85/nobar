"use client";

import { CATEGORIES, cityName, LISTINGS, PRODUCE_TYPES, SHOPS } from "@nobar/demo";
import { ArrowLeft, ChevronDown, ChevronLeft, LayoutGrid, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Photo } from "./photo";

const AVAILABLE_TYPES = PRODUCE_TYPES.filter((type) =>
  LISTINGS.some((listing) => listing.produceTypeId === type.id && listing.status === "PUBLISHED"),
);

export function MegaMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id ?? "");
  const [typeId, setTypeId] = useState("");

  const activeCategory = CATEGORIES.find((category) => category.id === categoryId) ?? CATEGORIES[0];
  const categoryTypes = AVAILABLE_TYPES.filter((type) => type.categoryId === activeCategory?.id);
  const activeType = categoryTypes.find((type) => type.id === typeId) ?? categoryTypes[0];
  const products = activeType
    ? LISTINGS.filter((listing) => listing.produceTypeId === activeType.id && listing.status === "PUBLISHED").slice(0, 3)
    : [];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const chooseCategory = (id: string) => {
    setCategoryId(id);
    setTypeId(AVAILABLE_TYPES.find((type) => type.categoryId === id)?.id ?? "");
  };

  return (
    <div ref={rootRef} className={"nobar-mega-wrap" + (open ? " is-open" : "")}>
      <button
        type="button"
        className="nobar-mega-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutGrid className="size-4" />
        <span>دسته‌بندی کالاها</span>
        <ChevronDown className={"nobar-mega-trigger-chevron" + (open ? " is-open" : "")} />
      </button>

      {open ? (
        <>
          <button type="button" className="nobar-mega-backdrop" aria-label="بستن منوی دسته‌بندی" onClick={() => setOpen(false)} />
          <div className="nobar-mega-panel" role="dialog" aria-label="منوی چندسطحی محصولات">
            <div className="nobar-mega-panel-head">
              <div>
                <span className="nobar-mega-kicker">بازار نوبر</span>
                <strong>از دسته تا محصول، راحت انتخاب کن</strong>
              </div>
              <button type="button" className="nobar-mega-close" onClick={() => setOpen(false)} aria-label="بستن">×</button>
            </div>

            <div className="nobar-mega-columns">
              <section className="nobar-mega-column nobar-mega-categories" aria-label="دسته‌های اصلی">
                <span className="nobar-mega-column-title">۱. دسته‌ی اصلی</span>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={"nobar-mega-category" + (activeCategory?.id === category.id ? " is-active" : "")}
                    onMouseEnter={() => chooseCategory(category.id)}
                    onFocus={() => chooseCategory(category.id)}
                    onClick={() => chooseCategory(category.id)}
                    aria-pressed={activeCategory?.id === category.id}
                  >
                    <Photo kind={category.art} alt="" sizes="34px" className="nobar-mega-category-photo" />
                    <span>{category.name}</span>
                    <ChevronLeft className="size-4" />
                  </button>
                ))}
                <Link href="/categories" className="nobar-mega-all-link" onClick={() => setOpen(false)}>
                  همه‌ی دسته‌ها <ArrowLeft className="size-3.5" />
                </Link>
              </section>

              <section className="nobar-mega-column nobar-mega-types" aria-label="زیر دسته‌ها">
                <span className="nobar-mega-column-title">۲. نوع محصول</span>
                <h3 className="nobar-mega-selected-title">{activeCategory?.name}</h3>
                <div className="nobar-mega-type-list">
                  {categoryTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={"nobar-mega-type" + (activeType?.id === type.id ? " is-active" : "")}
                      onMouseEnter={() => setTypeId(type.id)}
                      onFocus={() => setTypeId(type.id)}
                      onClick={() => setTypeId(type.id)}
                      aria-pressed={activeType?.id === type.id}
                    >
                      <span>{type.name}</span>
                      <ChevronLeft className="size-3.5" />
                    </button>
                  ))}
                </div>
                {activeCategory ? (
                  <Link href={"/search?cat=" + activeCategory.id} className="nobar-mega-all-link" onClick={() => setOpen(false)}>
                    همه‌ی {activeCategory.name} <ArrowLeft className="size-3.5" />
                  </Link>
                ) : null}
              </section>

              <section className="nobar-mega-column nobar-mega-products" aria-label="محصولات پیشنهادی">
                <div className="nobar-mega-products-head">
                  <div>
                    <span className="nobar-mega-column-title">۳. محصولات موجود</span>
                    <h3 className="nobar-mega-selected-title">{activeType?.name ?? "انتخاب محصول"}</h3>
                  </div>
                  {activeType ? (
                    <Link href={"/p/" + activeType.id} className="nobar-mega-see-all" onClick={() => setOpen(false)}>
                      همه <ArrowLeft className="size-3.5" />
                    </Link>
                  ) : null}
                </div>

                {products.length ? (
                  <div className="nobar-mega-product-list">
                    {products.map((listing) => {
                      const shop = SHOPS.find((item) => item.id === listing.shopId);
                      return (
                        <Link key={listing.id} href={"/l/" + listing.id} className="nobar-mega-product" onClick={() => setOpen(false)}>
                          <Photo kind={activeType?.id ?? ""} alt="" sizes="58px" className="nobar-mega-product-photo" fallback={{ emoji: activeType?.emoji ?? "🍏", hue: activeType?.hue ?? 90 }} />
                          <span className="min-w-0 flex-1">
                            <strong>{listing.title}</strong>
                            <small><MapPin className="size-3" /> {cityName(listing.originCityId)}{shop ? " · " + shop.name : ""}</small>
                          </span>
                          <ChevronLeft className="size-4 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="nobar-mega-empty">برای این دسته هنوز محصولی ثبت نشده است.</p>
                )}
                <Link href="/search" className="nobar-mega-market-link" onClick={() => setOpen(false)}>
                  گشت‌وگذار در کل بازار <ArrowLeft className="size-4" />
                </Link>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
