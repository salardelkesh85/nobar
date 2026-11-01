import { describe, expect, it, vi } from "vitest";
import { IdentityClient } from "../src/identity-client";

const user = { id: "u", phone: "+989121234567", name: "سالار", roles: ["BUYER" as const], cityId: null, createdAt: "2026-01-01T00:00:00Z" };
const session = { expiresIn: 60, user };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("identity client cookie sessions", () => {
  it("uses browser credentials without binding fetch to the client", async () => {
    const transport = async function (this: unknown, _url: RequestInfo | URL, init?: RequestInit) {
      expect(this).toBeUndefined();
      expect(init?.credentials).toBe("include");
      return json({ expiresInSec: 120, resendInSec: 60 });
    };
    const client = new IdentityClient("http://localhost:4000", transport);
    await expect(client.requestOtp("09121234567")).resolves.toMatchObject({ resendInSec: 60 });
  });

  it("restores a durable session from the HttpOnly cookie", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(json(session));
    const client = new IdentityClient("http://localhost:4000", transport);
    await expect(client.restore()).resolves.toEqual(user);
    expect(client.user).toEqual(user);
    expect(String(transport.mock.calls[0]![0]).endsWith("/v1/auth/refresh")).toBe(true);
  });

  it("shares refresh across concurrent unauthorized requests and retries", async () => {
    let refreshes = 0;
    let renewed = false;
    const transport = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/verify")) return json({ ...session, isNew: false });
      if (String(url).endsWith("/refresh")) {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        renewed = true;
        return json(session);
      }
      return renewed ? json([]) : json({}, 401);
    });
    const client = new IdentityClient("http://localhost:4000", transport);
    await client.verify("09121234567", "123456");
    await Promise.all([client.addresses(), client.addresses()]);
    expect(refreshes).toBe(1);
  });

  it("retries a refresh collision once for another browser tab", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(json({}, 409)).mockResolvedValueOnce(json(session));
    const client = new IdentityClient("http://localhost:4000", transport);
    await expect(client.restore()).resolves.toEqual(user);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not restore a session after logout while refresh is pending", async () => {
    let release!: (response: Response) => void;
    const transport = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/verify")) return json({ ...session, isNew: false });
      if (String(url).endsWith("/refresh")) return new Promise<Response>((resolve) => { release = resolve; });
      if (String(url).endsWith("/logout")) return new Response(null, { status: 204 });
      return json({}, 401);
    });
    const client = new IdentityClient("http://localhost:4000", transport);
    await client.verify("09121234567", "123456");
    const request = client.me();
    const failed = expect(request).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(release).toBeDefined());
    await client.logout();
    release(json(session));
    await failed;
    expect(client.user).toBeNull();
  });

  it("does not refresh forbidden requests", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ ...session, isNew: false })).mockResolvedValueOnce(json({}, 403));
    const client = new IdentityClient("http://localhost:4000", transport);
    await client.verify("x", "x");
    await expect(client.me()).rejects.toMatchObject({ status: 403 });
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
