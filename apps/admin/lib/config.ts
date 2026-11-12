/** Set at build/start time; unset (GitHub Pages) keeps the demo data. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
