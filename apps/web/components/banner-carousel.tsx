"use client";

import { cn } from "@nobar/ui";
import { ArrowLeft, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface Slide {
  href: string;
  src: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  tone: "green" | "red" | "dark";
}

const TONE = {
  green: "nobar-slide-green",
  red: "nobar-slide-red",
  dark: "nobar-slide-dark",
};

/** Editorial, swipeable storefront hero. Keeps the original slide data and navigation contract. */
export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = (i: number) => {
    const el = ref.current;
    if (!el || slides.length === 0) return;
    const n = (i + slides.length) % slides.length;
    const direction = getComputedStyle(el).direction === "rtl" ? 1 : -1;
    el.scrollTo({ left: -n * el.clientWidth * direction, behavior: "smooth" });
    setIndex(n);
  };

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => go(index + 1), 6200);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, slides.length]);

  return (
    <div className="nobar-hero-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={ref}
        className="nobar-hero-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setIndex(Math.min(slides.length - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)));
        }}
        aria-roledescription="carousel"
        aria-label="پیشنهادهای ویژه‌ی نوبر"
      >
        {slides.map((slide, i) => (
          <Link key={slide.href + i} href={slide.href} className={cn("nobar-hero-slide", TONE[slide.tone])} aria-roledescription="slide" aria-label={`${i + 1} از ${slides.length}: ${slide.title}`}>
            <Image src={slide.src} alt="" fill priority={i === 0} sizes="(max-width: 1024px) 100vw, 68vw" className="nobar-hero-image" />
            <span className="nobar-hero-overlay" />
            <span className="nobar-hero-text">
              <span className="nobar-hero-eyebrow"><span className="nobar-hero-eyebrow-dot" />{slide.eyebrow}</span>
              {i === 0 ? <h1 className="nobar-hero-title">{slide.title}</h1> : <h2 className="nobar-hero-title">{slide.title}</h2>}
              <span className="nobar-hero-copy">{slide.body}</span>
              <span className="nobar-hero-cta">{slide.cta}<ArrowLeft className="size-4" /></span>
              <span className="nobar-hero-footnote"><Leaf className="size-4" /> از مبدأ تا مقصد، انتخابی آگاهانه</span>
            </span>
            <span className="nobar-hero-index">{String(i + 1).padStart(2, "0")} <span>/</span> {String(slides.length).padStart(2, "0")}</span>
          </Link>
        ))}
      </div>
      <div className="nobar-hero-pagination">
        {slides.map((slide, i) => (
          <button key={slide.title} type="button" onClick={() => go(i)} className={cn("nobar-hero-dot", i === index && "is-active")} aria-label={`اسلاید ${i + 1}`} aria-current={i === index} />
        ))}
      </div>
      <div className="nobar-hero-controls">
        <button type="button" onClick={() => go(index - 1)} className="nobar-hero-control" aria-label="اسلاید قبلی"><ChevronRight className="size-5" /></button>
        <button type="button" onClick={() => go(index + 1)} className="nobar-hero-control" aria-label="اسلاید بعدی"><ChevronLeft className="size-5" /></button>
      </div>
    </div>
  );
}
