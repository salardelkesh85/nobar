"use client";

import { cn } from "@nobar/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  green: "from-[#0f3d22]/90 via-[#14532d]/60",
  red: "from-[#5c0f0b]/90 via-[#8e1b16]/55",
  dark: "from-black/80 via-black/45",
};

/** Auto-advancing photo banner (scroll-snap, swipeable, pauses on hover). */
export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const n = (i + slides.length) % slides.length;
    el.scrollTo({ left: -n * el.clientWidth * (getComputedStyle(el).direction === "rtl" ? 1 : -1), behavior: "smooth" });
    setIndex(n);
  };

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => go(index + 1), 5500);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  return (
    <div className="relative h-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={ref}
        className="flex h-full snap-x snap-mandatory overflow-x-auto rounded-card scrollbar-none"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        }}
        aria-roledescription="carousel"
      >
        {slides.map((s, i) => (
          <Link key={s.href + i} href={s.href} className="relative block h-full min-h-56 w-full shrink-0 snap-start sm:min-h-72" aria-roledescription="slide" aria-label={`${i + 1} از ${slides.length}: ${s.title}`}>
            <Image src={s.src} alt="" fill priority={i === 0} sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" />
            <div className={cn("absolute inset-0 bg-linear-to-l to-transparent", TONE[s.tone])} />
            <div className="relative flex h-full max-w-md flex-col justify-center p-6 text-white sm:p-10">
              <span className="text-xs font-bold text-white/80 sm:text-sm">{s.eyebrow}</span>
              <span className="mt-2 text-2xl font-black leading-snug sm:text-4xl">{s.title}</span>
              <span className="mt-2 text-sm leading-7 text-white/85 sm:text-base">{s.body}</span>
              <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-control bg-white px-4 py-2 text-sm font-bold text-ink">
                {s.cta}
                <ChevronLeft className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 [&>button]:pointer-events-auto">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => go(i)}
            className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-2 bg-white/50")}
            aria-label={`اسلاید ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
      <div className="absolute bottom-3 end-3 hidden gap-1 sm:flex">
        <button type="button" onClick={() => go(index - 1)} className="grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-soft" aria-label="اسلاید قبلی">
          <ChevronRight className="size-5" />
        </button>
        <button type="button" onClick={() => go(index + 1)} className="grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-soft" aria-label="اسلاید بعدی">
          <ChevronLeft className="size-5" />
        </button>
      </div>
    </div>
  );
}
