"use client";

import { IdentityApiError, type IdentityClient } from "@nobar/contracts";
import { API_URL } from "./api-config";

/** POST /v1/assistant/chat (apps/api assistant.service AssistantReply). */
export interface AssistantReply {
  conversationId: string;
  message: string;
  productCards: Array<{ listingId: string; slug: string; title: string; shopName: string; landedPerKgRial: number; arrivesWithinDays: number; freshDaysOnArrival: number }>;
  basketProposal: { id: string; summary: string; items: Array<{ listingId: string; packageId: string; qty: number; title: string; label: string; lineRial: number }>; itemsRial: number; shippingRial: number; totalRial: number } | null;
  compareProduceTypeId: string | null;
  toolsUsed: string[];
}

export const TOOL_FA: Record<string, string> = {
  search_products: "دارم بین غرفه‌ها می‌گردم…",
  get_product: "دارم جزئیات محصول را می‌خوانم…",
  compare_products: "دارم پیشنهادها را مقایسه می‌کنم…",
  get_seasonal_suggestions: "دارم تقویم فصل را نگاه می‌کنم…",
  get_cart: "دارم سبدتان را نگاه می‌کنم…",
  build_basket: "دارم سبد را می‌چینم…",
  propose_basket: "دارم سبد را قیمت‌گذاری می‌کنم…",
};

/**
 * One turn with the assistant. Uses the event stream so the page can show which step is running; if the
 * stream cannot be opened (expired session, older proxy) it falls back to the plain call, which also
 * refreshes the session.
 */
export async function askAssistant(client: IdentityClient, dest: string, body: { message: string; conversationId?: string }, onStep: (tool: string) => void): Promise<AssistantReply> {
  const query = `?dest=${encodeURIComponent(dest)}`;
  try {
    const res = await fetch(`${API_URL}/v1/assistant/chat/stream${query}`, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok && res.body) {
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let end: number;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const event = /^event: (.*)$/m.exec(block)?.[1];
          const data: unknown = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? "null");
          if (event === "step") onStep((data as { tool: string }).tool);
          else if (event === "done") return data as AssistantReply;
          else if (event === "error") {
            const e = data as { status: number; code?: string; detail: string };
            throw new IdentityApiError(e.status, e.detail, e.code);
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof IdentityApiError) throw e;
    // network or parsing trouble with the stream: try the plain call below
  }
  return client.call<AssistantReply>(`assistant/chat${query}`, { method: "POST", body });
}
