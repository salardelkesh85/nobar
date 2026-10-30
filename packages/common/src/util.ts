import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Postgres int8/numeric come back as strings or bigints; money and counters must stay exact. */
export function toSafeNumber(value: unknown): number {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(n) || (Number.isInteger(n) && !Number.isSafeInteger(n))) {
    throw new RangeError(`Number out of safe range: ${String(value)}`);
  }
  return n;
}

/** Date | string from a driver → ISO-8601 UTC string. */
export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  throw new TypeError(`Not a date: ${String(value)}`);
}
export const isoOrNull = (value: unknown): string | null => (value == null ? null : iso(value));

export const sha256 = (input: string) => createHash("sha256").update(input).digest("hex");
export const hmac = (secret: string, input: string) => createHmac("sha256", secret).update(input).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Stable JSON for hashing request bodies (sorted keys). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Runs `fn` every `ms` without overlapping runs; returns a stop function. */
export function every(ms: number, fn: () => Promise<void>, onError: (e: unknown) => void): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const tick = async () => {
    if (stopped) return;
    try {
      await fn();
    } catch (e) {
      onError(e);
    }
    if (!stopped) timer = setTimeout(tick, ms);
  };
  timer = setTimeout(tick, ms);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
