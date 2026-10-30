/** Route params may arrive percent-encoded. */
export function decodeSlug(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
