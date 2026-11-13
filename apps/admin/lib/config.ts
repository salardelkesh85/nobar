import { resolveApiUrl } from "@nobar/contracts";

/** "" = demo mode (GitHub Pages); "/" = API on this origin; otherwise the API's base URL. */
export const API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
