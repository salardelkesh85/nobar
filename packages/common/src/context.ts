import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
export const currentContext = (): RequestContext | undefined => requestContext.getStore();

const hex = (bytes: number) => randomBytes(bytes).toString("hex");

/** Parses or starts a W3C trace context (`traceparent: 00-<trace>-<span>-01`). */
export function contextFromHeaders(headers: Record<string, string | string[] | undefined>): RequestContext {
  const h = (k: string) => {
    const v = headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const tp = h("traceparent")?.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/);
  const requestId = h("x-request-id")?.slice(0, 64) || hex(8);
  return { requestId, traceId: tp?.[1] ?? hex(16), spanId: hex(8) };
}

/** Headers that carry the current context to a downstream call. */
export function propagationHeaders(): Record<string, string> {
  const ctx = currentContext();
  if (!ctx) return {};
  return { "x-request-id": ctx.requestId, traceparent: `00-${ctx.traceId}-${hex(8)}-01` };
}

export const currentTraceparent = (): string | undefined => {
  const ctx = currentContext();
  return ctx ? `00-${ctx.traceId}-${ctx.spanId}-01` : undefined;
};
