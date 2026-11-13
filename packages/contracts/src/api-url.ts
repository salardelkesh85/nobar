/**
 * Resolves `NEXT_PUBLIC_API_URL` for the browser apps.
 * - unset or empty: demo mode (no API), returns "".
 * - "/": the API is on the page's own origin (one domain serving the apps and `/v1`), so one image works on any
 *   domain. In the browser this is `location.origin`; during server rendering it stays "/", which only signals
 *   API mode (requests are made in the browser).
 * - an absolute URL: used as is, without a trailing slash.
 */
export function resolveApiUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (value === "/") return typeof window === "undefined" ? "/" : window.location.origin;
  return value.replace(/\/$/, "");
}
