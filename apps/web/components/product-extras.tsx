"use client";

import type { Listing, Review } from "@nobar/demo";
import { formatToman, toFaDigits } from "@nobar/fa";
import {
  Button,
  buttonClass,
  cn,
  Field,
  RelativeDay,
  Textarea,
} from "@nobar/ui";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  MessageCircleQuestion,
  Share2,
  ShoppingBasket,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Photo } from "./photo";
import { bannerSrc, photoSrc, type BannerPhoto } from "@/lib/photos";
import { read, useStore, write } from "@/lib/store";

// ---------- gallery with thumbnails and a full-screen viewer

interface Shot {
  src: string;
  alt: string;
  zoom?: { scale: number; origin: string };
}

export function Gallery({
  kind,
  title,
  cover,
}: {
  kind: string;
  title: string;
  cover: BannerPhoto;
}) {
  const main = photoSrc(kind);
  const shots: Shot[] = main
    ? [
        { src: main, alt: title },
        {
          src: main,
          alt: `${title} — نمای نزدیک`,
          zoom: { scale: 1.8, origin: "35% 40%" },
        },
        {
          src: main,
          alt: `${title} — بافت و رنگ`,
          zoom: { scale: 2.4, origin: "65% 60%" },
        },
        { src: bannerSrc(cover), alt: "باغ و محل برداشت" },
      ]
    : [];
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) viewer.current?.showModal();
    else viewer.current?.close();
  }, [open]);
  if (!shots.length)
    return (
      <Photo
        kind={kind}
        alt={title}
        className="aspect-square w-full rounded-card"
      />
    );
  const s = shots[i]!;

  const img = (shot: Shot, sizes: string, priority?: boolean) => (
    <Image
      src={shot.src}
      alt={shot.alt}
      fill
      priority={priority}
      sizes={sizes}
      className="object-cover"
      style={
        shot.zoom
          ? {
              transform: `scale(${shot.zoom.scale})`,
              transformOrigin: shot.zoom.origin,
            }
          : undefined
      }
    />
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-card bg-surface-2"
        aria-label="نمایش بزرگ عکس"
      >
        {img(s, "(max-width: 1024px) 100vw, 420px", true)}
      </button>
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {shots.map((shot, k) => (
          <li key={shot.alt}>
            <button
              type="button"
              onClick={() => setI(k)}
              aria-label={shot.alt}
              aria-current={k === i}
              className={cn(
                "relative block aspect-square w-full overflow-hidden rounded-control bg-surface-2 ring-offset-2 ring-offset-surface",
                k === i ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100",
              )}
            >
              {img(shot, "96px")}
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={viewer}
        onClose={() => setOpen(false)}
        aria-label="گالری عکس"
        className="studio-gallery-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="flex justify-end p-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-11 place-items-center rounded-full bg-white/10 text-white"
            aria-label="بستن"
          >
            <X className="size-6" />
          </button>
        </div>
        <div
          className="relative mx-auto w-full max-w-3xl flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-full overflow-hidden">
            {img(s, "100vw")}
          </div>
          <button
            type="button"
            onClick={() => setI((i + 1) % shots.length)}
            className="absolute start-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#1d2620]"
            aria-label="عکس بعدی"
          >
            <ChevronRight className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => setI((i - 1 + shots.length) % shots.length)}
            className="absolute end-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#1d2620]"
            aria-label="عکس قبلی"
          >
            <ChevronLeft className="size-6" />
          </button>
        </div>
        <p className="p-4 text-center text-sm text-white/80">
          {toFaDigits(i + 1)} از {toFaDigits(shots.length)} · {s.alt}
        </p>
      </dialog>
      <p className="mt-2 flex items-start gap-1 text-[0.7rem] leading-5 text-ink-soft">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        عکس نمونه است؛ در نسخه‌ی واقعی عکس‌های خود غرفه‌دار از همین محصول نمایش
        داده می‌شود.
      </p>
    </div>
  );
}

// ---------- share

export function ShareButton({ title }: { title: string }) {
  const { showToast } = useStore();
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            showToast("نشانی محصول کپی شد.");
          }
        } catch {
          /* share sheet dismissed */
        }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink-soft hover:border-brand hover:text-brand"
    >
      <Share2 className="size-4" aria-hidden />
      اشتراک‌گذاری
    </button>
  );
}

// ---------- section tabs (Digikala-style anchored sub-navigation)

export function SectionTabs({ items }: { items: Array<[string, string]> }) {
  return (
    <nav
      aria-label="بخش‌های صفحه"
      className="studio-product-tabs sticky top-[7.5rem] z-20 -mx-3 border-b border-line bg-bg/95 px-3 backdrop-blur sm:mx-0 sm:rounded-t-card sm:border sm:bg-surface sm:px-2 lg:top-[8.25rem]"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-none">
        {items.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm text-ink-soft hover:border-brand hover:text-ink"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------- rating summary

export function RatingSummary({
  reviews,
  fallback,
}: {
  reviews: Review[];
  fallback: number;
}) {
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : fallback;
  const fresh = reviews.length
    ? reviews.reduce((s, r) => s + r.freshnessRating, 0) / reviews.length
    : fallback;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="text-center sm:w-36">
        <p className="text-4xl font-black">
          {toFaDigits(avg.toFixed(1)).replace(".", "٫")}
        </p>
        <p
          className="mt-1 flex justify-center gap-0.5"
          aria-label={`${toFaDigits(avg.toFixed(1)).replace(".", "٫")} از ۵`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-4",
                n <= Math.round(avg)
                  ? "fill-saffron text-saffron"
                  : "text-line-strong",
              )}
              aria-hidden
            />
          ))}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          از {toFaDigits(reviews.length)} دیدگاه
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = reviews.filter((r) => r.rating === n).length;
          const pct = reviews.length ? (c / reviews.length) * 100 : 0;
          return (
            <div key={n} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-ink-soft">{toFaDigits(n)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-saffron"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-end text-ink-soft">
                {toFaDigits(c)}
              </span>
            </div>
          );
        })}
        <p className="pt-1 text-xs text-ink-soft">
          امتیاز تازگی هنگام تحویل:{" "}
          {toFaDigits(fresh.toFixed(1)).replace(".", "٫")} از ۵
        </p>
      </div>
    </div>
  );
}

// ---------- write a review (only after delivery)

interface LocalReview {
  rating: number;
  fresh: number;
  text: string;
  at: string;
  name: string;
}

export function ReviewForm({ listingId }: { listingId: string }) {
  const { orders, user, showToast, ready } = useStore();
  const key = `nobar_reviews_${listingId}`;
  const [mine, setMine] = useState<LocalReview[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(5);
  const [fresh, setFresh] = useState(5);
  const [text, setText] = useState("");
  useEffect(() => {
    setMine(read(key, []));
    setStatusMap(read("nobar_order_status", {}));
  }, [key]);
  if (!ready) return null;

  const bought = orders.some((o) =>
    o.shops.some(
      (s) =>
        s.items.some((it) => it.listingId === listingId) &&
        ["DELIVERED", "COMPLETED"].includes(
          statusMap[`${o.code}:${s.shopId}`] ?? "",
        ),
    ),
  );

  return (
    <div className="space-y-3">
      {mine.map((r) => (
        <div
          key={r.at}
          className="rounded-control border border-dashed border-line-strong p-3 text-sm"
        >
          <p className="flex items-center gap-2">
            <span className="font-bold">{r.name}</span>
            <span className="text-xs text-warn">در انتظار تأیید</span>
            <RelativeDay
              date={r.at}
              className="ms-auto text-xs text-ink-soft"
            />
          </p>
          <p className="mt-1 leading-7">{r.text}</p>
        </div>
      ))}
      {bought ? (
        <form
          className="space-y-3 rounded-control bg-surface-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length < 10)
              return showToast("دیدگاه را کمی کامل‌تر بنویسید.");
            const next = [
              {
                rating,
                fresh,
                text: text.trim(),
                at: new Date().toISOString(),
                name: user?.name || "خریدار نوبر",
              },
              ...mine,
            ];
            write(key, next);
            setMine(next);
            setText("");
            showToast("دیدگاه شما ثبت شد و پس از بررسی نمایش داده می‌شود.");
          }}
        >
          <p className="font-bold">دیدگاه خود را بنویسید</p>
          {(
            [
              ["امتیاز کلی", rating, setRating],
              ["تازگی هنگام تحویل", fresh, setFresh],
            ] as const
          ).map(([label, v, set]) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="w-32">{label}</span>
              <span
                role="radiogroup"
                aria-label={label}
                className="flex gap-0.5"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={v === n}
                    aria-label={`${toFaDigits(n)} ستاره`}
                    onClick={() => set(n)}
                  >
                    <Star
                      className={cn(
                        "size-6",
                        n <= v
                          ? "fill-saffron text-saffron"
                          : "text-line-strong",
                      )}
                    />
                  </button>
                ))}
              </span>
            </div>
          ))}
          <Field label="متن دیدگاه" htmlFor={`rv-${listingId}`}>
            <Textarea
              id={`rv-${listingId}`}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="طعم، تازگی، بسته‌بندی و زمان رسیدن چطور بود؟"
            />
          </Field>
          <Button type="submit">ثبت دیدگاه</Button>
        </form>
      ) : (
        <p className="rounded-control bg-surface-2 p-3 text-sm text-ink-soft">
          بعد از اینکه این محصول را خریدید و تحویل گرفتید، می‌توانید دیدگاه و
          امتیاز تازگی ثبت کنید. فقط دیدگاه خریدارهای واقعی نمایش داده می‌شود.
        </p>
      )}
    </div>
  );
}

// ---------- questions & answers

const SEED_QA = (l: Listing): Array<{ q: string; a: string; days: number }> => [
  {
    q: "وزن بسته‌ها خالص است یا با کارتن؟",
    a: "وزن نوشته‌شده وزن خالص محصول است؛ کارتن جدا حساب می‌شود.",
    days: 6,
  },
  {
    q: "برای ارسال به شهرهای دور خراب نمی‌شود؟",
    a: "فقط به شهرهایی ارسال داریم که محصول تازه برسد؛ بسته‌بندی هم لایه‌ی محافظ دارد.",
    days: 11,
  },
  ...(l.isPreorder
    ? [
        {
          q: "پیش‌فروش یعنی کی می‌رسد؟",
          a: "از تاریخ ارسالی که روی صفحه نوشته شده، به ترتیب ثبت سفارش ارسال می‌کنیم.",
          days: 2,
        },
      ]
    : []),
];

export function QandA({
  listing,
  shopName,
}: {
  listing: Listing;
  shopName: string;
}) {
  const { showToast } = useStore();
  const key = `nobar_questions_${listing.id}`;
  const [mine, setMine] = useState<Array<{ q: string; at: string }>>([]);
  const [q, setQ] = useState("");
  useEffect(() => setMine(read(key, [])), [key]);
  const seed = SEED_QA(listing);
  const ago = (d: number) =>
    new Date(Date.now() - d * 86_400_000).toISOString();

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {mine.map((m) => (
          <li key={m.at} className="py-3 text-sm">
            <p className="flex items-start gap-2 font-bold">
              <MessageCircleQuestion
                className="mt-0.5 size-4 shrink-0 text-brand"
                aria-hidden
              />
              {m.q}
            </p>
            <p className="ms-6 mt-1 text-xs text-warn">
              در انتظار پاسخ {shopName}
            </p>
          </li>
        ))}
        {seed.map((x) => (
          <li key={x.q} className="py-3 text-sm">
            <p className="flex items-start gap-2 font-bold">
              <MessageCircleQuestion
                className="mt-0.5 size-4 shrink-0 text-brand"
                aria-hidden
              />
              {x.q}
            </p>
            <p className="ms-6 mt-1 leading-7 text-ink">
              <span className="text-xs font-bold text-brand">
                پاسخ {shopName}:{" "}
              </span>
              {x.a}
            </p>
            <RelativeDay
              date={ago(x.days)}
              className="ms-6 text-xs text-ink-soft"
            />
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length < 8) return showToast("پرسش را کامل‌تر بنویسید.");
          const next = [{ q: q.trim(), at: new Date().toISOString() }, ...mine];
          write(key, next);
          setMine(next);
          setQ("");
          showToast("پرسش شما برای غرفه‌دار فرستاده شد.");
        }}
      >
        <label htmlFor={`qa-${listing.id}`} className="sr-only">
          پرسش شما
        </label>
        <input
          id={`qa-${listing.id}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="پرسشی درباره‌ی این محصول دارید؟"
          className="min-h-11 flex-1 rounded-control border border-line-strong bg-surface px-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
        <Button type="submit">ثبت پرسش</Button>
      </form>
    </div>
  );
}

// ---------- mobile sticky buy bar

export function StickyBuyBar({
  listing,
  disabled,
}: {
  listing: Listing;
  disabled: boolean;
}) {
  const { addToCart, showToast } = useStore();
  const p = listing.packages[0]!;
  return (
    <div className="fixed inset-x-0 bottom-15 z-30 border-t border-line bg-surface px-3 py-2 shadow-lift md:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            addToCart({ listingId: listing.id, packageId: p.id, qty: 1 });
            showToast(`${p.label} به سبد اضافه شد.`);
          }}
          className={buttonClass("primary", "md", "flex-1")}
        >
          <ShoppingBasket className="size-5" aria-hidden />
          {disabled ? "تا شهر شما تازه نمی‌رسد" : "افزودن به سبد"}
        </button>
        <div className="text-end">
          <p className="text-base font-extrabold">{formatToman(p.priceRial)}</p>
          <p className="text-[0.7rem] text-ink-soft">{p.label}</p>
        </div>
      </div>
    </div>
  );
}
