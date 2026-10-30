"use client";

import { useEffect, useState } from "react";

/** Staff decisions kept in the browser for the demo (the real ones are audited use cases). */
export function useDecisions<T>(key: string): [Record<string, T>, (id: string, v: T) => void] {
  const [map, setMap] = useState<Record<string, T>>({});
  useEffect(() => {
    try {
      setMap(JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, T>);
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = (id: string, v: T) =>
    setMap((m) => {
      const next = { ...m, [id]: v };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return [map, set];
}
