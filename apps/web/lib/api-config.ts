import { resolveApiUrl } from "@nobar/contracts";

/** "" = demo mode; "/" = API on this origin; otherwise the API's base URL (see resolveApiUrl). */
export const API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);
