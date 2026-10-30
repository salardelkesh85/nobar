import { cityById, DEFAULT_DESTINATION } from "@nobar/demo";
import { cookies } from "next/headers";
import { DEST_COOKIE } from "./constants";

/** Buyer's destination city (ارسال به) from the cookie set by the city picker. */
export async function getDestination(): Promise<string> {
  const v = (await cookies()).get(DEST_COOKIE)?.value;
  return v && cityById(v)?.destination ? v : DEFAULT_DESTINATION;
}

/** Route params may arrive percent-encoded for Persian slugs. */
export function decodeSlug(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
