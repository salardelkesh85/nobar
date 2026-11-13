import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { startService } from "@nobar/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiService } from "../src/app";
import { MelipayamakSmsProvider } from "../src/modules/identity/sms";
import { GatewayUnavailableError, ZarinpalPaymentProvider } from "../src/modules/payment/provider";

// The real providers against a local stand-in that answers in each provider's documented shape.

type Hit = { path: string; type: string; body: string };
let server: Server;
let base: string;
let hits: Hit[] = [];
let answer: (hit: Hit) => { status?: number; json: unknown } = () => ({ json: {} });

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const hit = { path: req.url ?? "", type: req.headers["content-type"] ?? "", body };
      hits.push(hit);
      const a = answer(hit);
      res.writeHead(a.status ?? 200, { "content-type": "application/json" }).end(JSON.stringify(a.json));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  hits = [];
});

describe("ZarinPal", () => {
  const zp = () => new ZarinpalPaymentProvider("merchant-0000", { baseUrl: base });

  it("requests a payment in Rial and sends the buyer to StartPay", async () => {
    answer = () => ({ json: { data: { code: 100, message: "Success", authority: "A0000000000000000000000000000001234", fee: 0 }, errors: [] } });
    const started = await zp().start({ amountRial: 6_450_000, description: "نوبر — پرداخت", callbackUrl: "https://api.example.ir/v1/payments/callback" });
    expect(started).toEqual({ authority: "A0000000000000000000000000000001234", redirectUrl: `${base}/pg/StartPay/A0000000000000000000000000000001234` });
    expect(hits[0]!.path).toBe("/pg/v4/payment/request.json");
    expect(JSON.parse(hits[0]!.body)).toEqual({ merchant_id: "merchant-0000", amount: 6_450_000, currency: "IRR", description: "نوبر — پرداخت", callback_url: "https://api.example.ir/v1/payments/callback" });
  });

  it("does not start a payment the gateway refused", async () => {
    answer = () => ({ status: 401, json: { data: [], errors: { code: -9, message: "validation error" } } });
    await expect(zp().start({ amountRial: 100, description: "x", callbackUrl: "https://a.ir/cb" })).rejects.toBeInstanceOf(GatewayUnavailableError);
  });

  it("confirms a paid payment with the expected amount, and a repeated verify (101) too", async () => {
    answer = () => ({ json: { data: { code: 100, ref_id: 201, card_pan: "502229******5995" }, errors: [] } });
    expect(await zp().verify({ authority: "A1", amountRial: 6_450_000, callbackStatus: "OK" })).toEqual({ ok: true, refId: "201" });
    expect(JSON.parse(hits[0]!.body)).toEqual({ merchant_id: "merchant-0000", amount: 6_450_000, authority: "A1" });
    answer = () => ({ json: { data: { code: 101, ref_id: 201 }, errors: [] } });
    expect((await zp().verify({ authority: "A1", amountRial: 6_450_000, callbackStatus: "OK" })).ok).toBe(true);
  });

  it("treats a cancelled or unpaid payment as failed", async () => {
    expect(await zp().verify({ authority: "A1", amountRial: 100, callbackStatus: "NOK" })).toEqual({ ok: false });
    expect(hits).toHaveLength(0);
    answer = () => ({ status: 400, json: { data: [], errors: { code: -51, message: "Session is not valid, session is not active paid try." } } });
    expect(await zp().verify({ authority: "A1", amountRial: 100, callbackStatus: "OK" })).toEqual({ ok: false });
  });

  it("never reports an outage or a merchant error as an unpaid order, and retries first", async () => {
    answer = () => ({ status: 502, json: {} });
    await expect(zp().verify({ authority: "A1", amountRial: 100, callbackStatus: "OK" })).rejects.toBeInstanceOf(GatewayUnavailableError);
    expect(hits).toHaveLength(3);
    hits = [];
    let n = 0;
    answer = () => (++n < 2 ? { status: 503, json: {} } : { json: { data: { code: 100, ref_id: 7 }, errors: [] } });
    expect(await zp().verify({ authority: "A1", amountRial: 100, callbackStatus: "OK" })).toEqual({ ok: true, refId: "7" });
    answer = () => ({ status: 401, json: { data: [], errors: { code: -11, message: "merchant inactive" } } });
    await expect(zp().verify({ authority: "A1", amountRial: 100, callbackStatus: "OK" })).rejects.toBeInstanceOf(GatewayUnavailableError);
  });
});

describe("Melipayamak", () => {
  const form = (h: Hit) => Object.fromEntries(new URLSearchParams(h.body));

  it("sends the sign-in code through the approved pattern when one is configured", async () => {
    answer = () => ({ json: { Value: "5081111111111111111", RetStatus: 1, StrRetStatus: "Ok" } });
    await new MelipayamakSmsProvider({ username: "u", password: "p", from: "50004000", otpBodyId: 12345, baseUrl: base }).sendOtp("+989141234567", "482913");
    expect(hits[0]!.path).toBe("/api/SendSMS/BaseServiceNumber");
    expect(hits[0]!.type).toContain("application/x-www-form-urlencoded");
    expect(form(hits[0]!)).toEqual({ username: "u", password: "p", to: "09141234567", bodyId: "12345", text: "482913" });
  });

  it("sends plain messages from the panel line", async () => {
    answer = () => ({ json: { Value: "123456789", RetStatus: 1, StrRetStatus: "Ok" } });
    const sms = new MelipayamakSmsProvider({ username: "u", password: "p", from: "50004000", baseUrl: base });
    await sms.sendOtp("+989141234567", "482913");
    await sms.send("+989141234567", "نوبر: سفارش ارسال شد.");
    expect(hits.map((h) => h.path)).toEqual(["/api/SendSMS/SendSMS", "/api/SendSMS/SendSMS"]);
    expect(form(hits[0]!)).toMatchObject({ to: "09141234567", from: "50004000", text: "کد ورود نوبر: 482913" });
    expect(form(hits[1]!).text).toBe("نوبر: سفارش ارسال شد.");
  });

  it("fails loudly when the panel refuses the message", async () => {
    answer = () => ({ json: { Value: "0", RetStatus: 0, StrRetStatus: "InvalidUserPass" } });
    await expect(new MelipayamakSmsProvider({ username: "u", password: "bad", from: "5000", baseUrl: base }).send("+989141234567", "x")).rejects.toThrow("InvalidUserPass");
  });
});

describe("general rate limit", () => {
  it("answers 429 with Retry-After once one IP passes the per-minute limit, and never limits health checks", async () => {
    const api = await startService(apiService(), { overrides: { PORT: String(41_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", ORDER_TIMER_SEC: "0", RATE_LIMIT_PER_MIN: "5" } });
    try {
      const get = (path: string, ip = "10.1.1.1") => fetch(`${api.url}${path}`, { headers: { "x-forwarded-for": ip } });
      for (let i = 0; i < 5; i++) expect((await get("/v1/catalog/categories")).status).toBe(200);
      const limited = await get("/v1/catalog/categories");
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(((await limited.json()) as { code: string }).code).toBe("RATE_LIMITED");
      expect((await get("/v1/catalog/categories", "10.1.1.2")).status).toBe(200);
      expect((await get("/healthz")).status).toBe(200);
    } finally {
      await api.stop();
    }
  });
});
