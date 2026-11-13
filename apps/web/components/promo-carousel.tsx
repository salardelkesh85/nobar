"use client";

import { cn } from "@nobar/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface Promo {
  href: string;
  src: string;
  title: string;
  body: string;
  cta: string;
}

/** Home banner slider: swipe, arrows, dots; pauses on hover and when the tab is hidden; respects reduced motion. */
export function PromoCarousel({ slides }: { slides: Promo[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  return (
    <section
      className="nx-promo"
      aria-roledescription="carousel"
      aria-label="پیشنهادهای ویژه"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 40) return;
        // right-to-left page: swiping toward the right shows the next slide
        go(index + (end > start ? 1 : -1));
      }}
    >
      <div className="nx-promo-track" style={{ transform: `translate3d(${index * 100}%,0,0)` }}>
        {slides.map((s, i) => (
          <Link
            key={s.href + i}
            href={s.href}
            className="nx-promo-slide"
            aria-roledescription="slide"
            aria-label={`${i + 1} از ${slides.length}: ${s.title}`}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            <Image src={s.src} alt="" fill priority={i === 0} sizes="(max-width: 768px) 100vw, 1300px" className="nx-promo-image" />
            <span className="nx-promo-shade" />
            <span className="nx-promo-copy">
              {i === 0 ? <h1 className="nx-promo-title">{s.title}</h1> : <span className="nx-promo-title">{s.title}</span>}
              <span className="nx-promo-body">{s.body}</span>
              <span className="nx-promo-cta">{s.cta}</span>
            </span>
          </Link>
        ))}
      </div>
      {slides.length > 1 ? (
        <>
          <button type="button" className="nx-promo-arrow nx-promo-prev" onClick={() => go(index - 1)} aria-label="اسلاید قبلی">
            <ChevronRight className="size-5" />
          </button>
          <button type="button" className="nx-promo-arrow nx-promo-next" onClick={() => go(index + 1)} aria-label="اسلاید بعدی">
            <ChevronLeft className="size-5" />
          </button>
          <div className="nx-promo-dots">
            {slides.map((s, i) => (
              <button key={s.title} type="button" onClick={() => go(i)} className={cn("nx-promo-dot", i === index && "is-active")} aria-label={`اسلاید ${i + 1}`} aria-current={i === index} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
