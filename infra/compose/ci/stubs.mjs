// Stand-ins for ZarinPal and Melipayamak used by the stack test (CI only). They speak the same HTTP shapes as the
// real services, so the API runs its real adapters in production mode. No dependencies: node stubs.mjs
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8080);
const payments = new Map(); // authority → { amount, callback }
const messages = []; // { to, text, at }
let seq = 0;

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

async function body(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if ((req.headers["content-type"] ?? "").includes("application/json")) return raw ? JSON.parse(raw) : {};
  return Object.fromEntries(new URLSearchParams(raw));
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://stubs");
  try {
    // --- ZarinPal REST v4
    if (req.method === "POST" && url.pathname === "/pg/v4/payment/request.json") {
      const b = await body(req);
      if (!b.merchant_id || !b.amount || !b.callback_url) return json(res, 400, { data: [], errors: { code: -9, message: "validation error" } });
      const authority = `A${String(++seq).padStart(35, "0")}`;
      payments.set(authority, { amount: Number(b.amount), callback: String(b.callback_url) });
      return json(res, 200, { data: { code: 100, message: "Success", authority, fee: 0 }, errors: [] });
    }
    if (req.method === "GET" && url.pathname.startsWith("/pg/StartPay/")) {
      const authority = decodeURIComponent(url.pathname.slice("/pg/StartPay/".length));
      const p = payments.get(authority);
      if (!p) return json(res, 404, { error: "unknown authority" });
      // ?cancel=1 simulates the buyer cancelling on the gateway page
      const status = url.searchParams.get("cancel") ? "NOK" : "OK";
      res.writeHead(302, { location: `${p.callback}?Authority=${encodeURIComponent(authority)}&Status=${status}` });
      return res.end();
    }
    if (req.method === "POST" && url.pathname === "/pg/v4/payment/verify.json") {
      const b = await body(req);
      const p = payments.get(String(b.authority));
      if (!p || p.amount !== Number(b.amount)) return json(res, 400, { data: [], errors: { code: -51, message: "not paid" } });
      if (p.verified) return json(res, 200, { data: { code: 101, ref_id: p.ref }, errors: [] });
      p.verified = true;
      p.ref = 1000 + seq;
      return json(res, 200, { data: { code: 100, ref_id: p.ref, card_pan: "502229******5995" }, errors: [] });
    }
    // --- Melipayamak REST
    if (req.method === "POST" && (url.pathname === "/api/SendSMS/SendSMS" || url.pathname === "/api/SendSMS/BaseServiceNumber")) {
      const b = await body(req);
      if (!b.username || !b.password) return json(res, 200, { Value: "0", RetStatus: 0, StrRetStatus: "InvalidUserPass" });
      messages.push({ to: String(b.to), text: String(b.text), at: new Date().toISOString() });
      return json(res, 200, { Value: String(Date.now()), RetStatus: 1, StrRetStatus: "Ok" });
    }
    // --- for the test: messages sent to a number
    if (req.method === "GET" && url.pathname === "/messages") {
      const to = url.searchParams.get("to");
      return json(res, 200, messages.filter((m) => !to || m.to === to));
    }
    if (url.pathname === "/healthz") return json(res, 200, { ok: true });
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String(e) });
  }
}).listen(PORT, () => console.log(`stubs listening on ${PORT}`));
