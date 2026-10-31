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
  green: "nobar-v3-slide-green",
  red: "nobar-v3-slide-red",
  dark: "nobar-v3-slide-dark",
};

export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const go = (next: number) => {
    if (!slides.length) return;
    setIndex((next + slides.length) % slides.length);
  };

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => go(index + 1), 5600);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, slides.length]);

  return (
    <div
      className="nobar-v3-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const endX = event.changedTouches[0]?.clientX;
        if (endX === undefined) return;
        const delta = endX - touchStart.current;
        if (Math.abs(delta) > 42) go(index + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <div
        className="nobar-v3-hero-track"
        style={{ transform: "translate3d(-" + index * 100 + "%,0,0)" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {slides.map((slide, i) => (
          <Link
            key={slide.href + i}
            href={slide.href}
            className={cn("nobar-v3-hero-slide", TONE[slide.tone])}
            aria-roledescription="slide"
            aria-label={"اسلاید " + (i + 1) + " از " + slides.length + ": " + slide.title}
            tabIndex={i === index ? 0 : -1}
          >
            <Image src={slide.src} alt="" fill priority={i === 0} sizes="(max-width: 760px) 100vw, (max-width: 1100px) 68vw, 70vw" className="nobar-v3-hero-image" />
            <span className="nobar-v3-hero-overlay" />
            <span className="nobar-v3-hero-content">
              <span className="nobar-v3-hero-eyebrow"><span />{slide.eyebrow}</span>
              {i === 0 ? <h1 className="nobar-v3-hero-title">{slide.title}</h1> : <h2 className="nobar-v3-hero-title">{slide.title}</h2>}
              <span className="nobar-v3-hero-copy">{slide.body}</span>
              <span className="nobar-v3-hero-cta">{slide.cta}<ArrowLeft className="size-4" /></span>
              <span className="nobar-v3-hero-footnote"><Leaf className="size-4" /> از مبدأ تا مقصد، انتخابی آگاهانه</span>
            </span>
            <span className="nobar-v3-hero-count">{String(i + 1).padStart(2, "0")} <i>/</i> {String(slides.length).padStart(2, "0")}</span>
          </Link>
        ))}
      </div>

      <div className="nobar-v3-hero-pagination">
        {slides.map((slide, i) => (
          <button key={slide.title} type="button" onClick={() => go(i)} className={"nobar-v3-hero-dot" + (i === index ? " is-active" : "")} aria-label={"رفتن به اسلاید " + (i + 1)} aria-current={i === index} />
        ))}
      </div>
      <div className="nobar-v3-hero-controls">
        <button type="button" onClick={() => go(index - 1)} className="nobar-v3-hero-control" aria-label="اسلاید قبلی"><ChevronRight className="size-5" /></button>
        <button type="button" onClick={() => go(index + 1)} className="nobar-v3-hero-control" aria-label="اسلاید بعدی"><ChevronLeft className="size-5" /></button>
      </div>
    </div>
  );
}
