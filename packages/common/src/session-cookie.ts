export const ACCESS_COOKIE = "nobar_access";
export const REFRESH_COOKIE = "nobar_refresh";

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function sessionCookie(name: string, value: string, options: { maxAgeSec: number; secure: boolean; sameSite: "Strict" | "Lax" | "None"; path?: string }): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSec))}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
    "Priority=High",
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(name: string, options: { secure: boolean; sameSite: "Strict" | "Lax" | "None"; path?: string }): string {
  return sessionCookie(name, "", { ...options, maxAgeSec: 0 });
}
