"use client";

import { cityName, etaPhrase, isNobar } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Button, ButtonLink, Card, cn, FreshnessBadge, LogoMark, NobarBadge, Toman } from "@nobar/ui";
import { Check, Info, Mic, Scale, Send, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { answer, type BotReply } from "@/lib/baghboon";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/photo";

type Msg = { id: number; from: "user" | "bot"; text?: string; reply?: BotReply; proposalState?: "pending" | "confirmed" | "declined" };

const EXAMPLES = ["سیب ترش برای کمپوت که تا کرج تازه برسه", "سبد میوه برای ۶ نفر با ۸۰۰ هزار تومن", "انار رو مقایسه کن", "الان چی فصلشه؟"];

function Chat() {
  const params = useSearchParams();
  const { dest, addToCart, showToast } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const asked = useRef(false);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setMsgs((m) => [...m, { id: ++idRef.current, from: "user", text: t }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const reply = answer(t, dest);
      setMsgs((m) => [...m, { id: ++idRef.current, from: "bot", reply, proposalState: reply.proposal ? "pending" : undefined }]);
      setThinking(false);
    }, 450);
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && !asked.current) {
      asked.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  const setProposal = (id: number, state: "confirmed" | "declined") => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, proposalState: state } : x)));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-brand-soft">
          <LogoMark className="size-9" />
        </span>
        <div>
          <h1 className="text-2xl font-black">باغبون</h1>
          <p className="text-sm text-ink-soft">دستیار خرید نوبر · ارسال به {cityName(dest)}</p>
        </div>
      </header>
      <p className="flex gap-2 rounded-control border border-dashed border-line bg-surface p-3 text-xs leading-6 text-ink-soft">
        <Info className="size-4 shrink-0 text-brand" aria-hidden />
        نسخه‌ی نمایشی: پاسخ‌ها با قاعده‌های ساده ساخته می‌شود، نه مدل زبانی. قیمت، موجودی و زمان رسیدن فقط از داده‌ی غرفه‌ها خوانده می‌شود و هر تغییر در سبد با تأیید شماست.
      </p>

      <div className="min-h-[40vh] space-y-4" aria-live="polite">
        {msgs.length === 0 ? (
          <div className="space-y-3">
            <p className="font-bold">سلام! چه میوه یا سبزی‌ای لازم دارید؟ می‌توانید عادی بنویسید، مثلاً:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" onClick={() => ask(e)} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm hover:border-brand">
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {msgs.map((m) =>
          m.from === "user" ? (
            <div key={m.id} className="flex justify-start">
              <p className="max-w-[85%] rounded-card rounded-ss-sm bg-brand px-4 py-2.5 text-on-brand">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="w-full max-w-[95%] space-y-3 rounded-card rounded-se-sm border border-line bg-surface p-4">
                {m.reply!.text.map((t) => (
                  <p key={t} className="leading-8">
                    {t}
                  </p>
                ))}
                {m.reply!.hits ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {m.reply!.hits.map((h) => (
                      <li key={h.listing.id}>
                        <Link href={`/l/${h.listing.slug}`} className="flex gap-3 rounded-control border border-line p-2 hover:border-brand">
                          <Photo kind={h.type.id} alt="" className="size-16 shrink-0 rounded-control" fallback={{ emoji: h.type.emoji, hue: h.type.hue }} />
                          <div className="min-w-0 text-sm">
                            <p className="line-clamp-1 font-bold">{h.listing.title}</p>
                            <p className="text-xs text-ink-soft">{h.shop.name}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {isNobar(h.listing) ? <NobarBadge /> : null}
                              <FreshnessBadge level={h.freshness.badge} />
                            </div>
                            <p className="mt-1 text-xs">
                              هر کیلو تا درِ خانه <Toman rial={h.offer.landedPerKgRial} className="font-bold" /> · {etaPhrase(h.offer.delivery)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {m.reply!.compareHref ? (
                  <ButtonLink href={m.reply!.compareHref} variant="secondary" size="sm">
                    <Scale className="size-4" aria-hidden />
                    دیدن جدول مقایسه
                  </ButtonLink>
                ) : null}
                {m.reply!.proposal ? (
                  <Card className="border-2 border-brand/40 p-3">
                    <p className="mb-2 font-extrabold">پیشنهاد: {m.reply!.proposal.summary}</p>
                    <ul className="space-y-1 text-sm">
                      {m.reply!.proposal.items.map((it) => (
                        <li key={it.packageId} className="flex justify-between gap-2">
                          <span>
                            {toFaDigits(it.qty)} × {it.label} — {it.title}
                          </span>
                          <Toman rial={it.priceRial} />
                        </li>
                      ))}
                      <li className="flex justify-between gap-2 border-t border-line pt-1 text-ink-soft">
                        <span>ارسال</span>
                        <Toman rial={m.reply!.proposal.shippingRial} />
                      </li>
                      <li className="flex justify-between gap-2 font-bold">
                        <span>جمع</span>
                        <Toman rial={m.reply!.proposal.itemsRial + m.reply!.proposal.shippingRial} />
                      </li>
                    </ul>
                    {m.proposalState === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => {
                            for (const it of m.reply!.proposal!.items) addToCart({ listingId: it.listingId, packageId: it.packageId, qty: it.qty });
                            setProposal(m.id, "confirmed");
                            showToast("سبد پیشنهادی به سبد خرید اضافه شد.");
                          }}
                        >
                          <Check className="size-4" aria-hidden />
                          تأیید و افزودن به سبد
                        </Button>
                        <Button variant="secondary" onClick={() => setProposal(m.id, "declined")}>
                          <X className="size-4" aria-hidden />
                          نه، ممنون
                        </Button>
                      </div>
                    ) : (
                      <p className={cn("mt-3 text-sm font-bold", m.proposalState === "confirmed" ? "text-brand" : "text-ink-soft")}>
                        {m.proposalState === "confirmed" ? (
                          <>
                            به سبد اضافه شد. <Link href="/cart" className="underline">دیدن سبد</Link>
                          </>
                        ) : (
                          "باشد، چیزی اضافه نشد."
                        )}
                      </p>
                    )}
                  </Card>
                ) : null}
              </div>
            </div>
          ),
        )}
        {thinking ? <p className="text-end text-sm text-ink-soft">باغبون دارد می‌گردد…</p> : null}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-16 flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 shadow-lg md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="bb-input" className="sr-only">
          پیام به باغبون
        </label>
        <input
          id="bb-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="بنویسید چه می‌خواهید…"
          className="min-h-11 flex-1 bg-transparent px-3 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          aria-label="ورودی صوتی (به‌زودی)"
          title="ورودی صوتی در نسخه‌ی بعدی فعال می‌شود"
          onClick={() => showToast("ورودی صوتی در نسخه‌ی بعدی فعال می‌شود.")}
        >
          <Mic className="size-5" />
        </button>
        <button type="submit" className="grid size-11 place-items-center rounded-full bg-brand text-on-brand disabled:opacity-50" aria-label="فرستادن" disabled={!input.trim() || thinking}>
          <Send className="size-5 -scale-x-100" />
        </button>
      </form>
      <p className="text-center text-xs text-ink-soft">نوبر بدون باغبون هم کامل کار می‌کند؛ از جستجو و فیلترها هم می‌توانید خرید کنید.</p>
    </div>
  );
}

export default function BaghboonPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}

