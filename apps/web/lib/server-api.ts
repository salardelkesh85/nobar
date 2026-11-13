
/**
 * Server-side reads from the API for page metadata (store running as a Next.js server).
 * `API_INTERNAL_URL` lets the server reach the API inside the network; the public URL is the fallback.
 */
const publicUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
// "/" (same origin) is not reachable from the server by itself: then API_INTERNAL_URL is required
const base = (process.env.API_INTERNAL_URL ?? (publicUrl === "/" ? "" : publicUrl)).trim().replace(/\/$/, "");

export const serverApiEnabled = Boolean(base);

/** `null` for 404; `undefined` when the API could not be reached (the page still renders and the client retries). */
export async function serverGet<T>(path: string): Promise<T | null | undefined> {
  if (!base) return undefined;
  try {
    const res = await fetch(`${base}/v1/${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}
