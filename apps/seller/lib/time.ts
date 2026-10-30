"use client";

import { formatFaNumber } from "@nobar/fa";
import { useEffect, useState } from "react";

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** «۲ ساعت و ۱۵ دقیقه» until the acceptance deadline. */
export function timeLeft(deadline: string, now: number): string {
  const mins = Math.max(0, Math.round((new Date(deadline).getTime() - now) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${formatFaNumber(h)} ساعت و ${formatFaNumber(m)} دقیقه` : `${formatFaNumber(m)} دقیقه`;
}
