import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type RunningService, startService } from "@nobar/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { apiService } from "../src/app";
import type { ApiConfig } from "../src/config";
import { ungroundedNumbers } from "../src/modules/assistant/guardrails";

// Runs every case under services/ai/evals against the demo catalog (see the README there).

interface Expect {
  tools?: string[];
  contains?: string[];
  notContains?: string[];
  minCards?: number;
  maxCards?: number;
  proposal?: boolean;
  maxProposalTotalRial?: number;
  compare?: boolean;
  auditNotContains?: string[];
}
interface EvalCase {
  name: string;
  dest?: string;
  turns: Array<{ user: string; expect?: Expect }>;
}

const DIR = path.resolve(__dirname, "../../../services/ai/evals");
const files = readdirSync(DIR).filter((f) => f.endsWith(".yaml")).sort();
const ADMIN = "09180000000";
let api: RunningService<ApiConfig>;
let n = 0;
let admin: string;

type Res = { status: number; body: any; cookie: string }; // eslint-disable-line @typescript-eslint/no-explicit-any -- assertions check the shape
async function call(method: string, url: string, body?: unknown, cookie?: string): Promise<Res> {
  const res = await fetch(`${api.url}${url}`, {
    method,
    headers: { "x-forwarded-for": `10.70.${Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 200)}`, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const cookies = (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { status: res.status, body: await res.json(), cookie: cookies.map((c) => c.split(";", 1)[0]).join("; ") };
}
async function signIn(phone = `0918${String(++n).padStart(7, "0")}`): Promise<string> {
  const sent = await call("POST", "/v1/auth/otp", { phone });
  return (await call("POST", "/v1/auth/verify", { phone, code: sent.body.devCode })).cookie;
}

beforeAll(async () => {
  api = await startService(apiService(), {
    overrides: { PORT: String(45_000 + Math.floor(Math.random() * 900)), DATA_DIR: "memory", LOG_LEVEL: "silent", NODE_ENV: "test", OTP_ECHO: "true", ADMIN_PHONES: ADMIN, ORDER_TIMER_SEC: "0" },
  });
  admin = await signIn(ADMIN);
});
afterAll(async () => {
  await api?.stop();
});

for (const file of files) {
  describe(`evals/${file}`, () => {
    for (const c of parse(readFileSync(path.join(DIR, file), "utf8")) as EvalCase[]) {
      it(c.name, async () => {
        const buyer = await signIn();
        const dest = c.dest ?? "tehran";
        let conversationId: string | undefined;
        for (const turn of c.turns) {
          const r = await call("POST", `/v1/assistant/chat?dest=${dest}`, { message: turn.user, ...(conversationId ? { conversationId } : {}) }, buyer);
          expect(r.status, JSON.stringify(r.body)).toBe(201);
          conversationId = r.body.conversationId;
          const e = turn.expect ?? {};
          const answer: string = r.body.message;

          if (e.tools) expect(r.body.toolsUsed).toEqual(e.tools);
          for (const s of e.contains ?? []) expect(answer).toContain(s);
          for (const s of e.notContains ?? []) expect(answer).not.toContain(s);
          if (e.minCards !== undefined) expect(r.body.productCards.length).toBeGreaterThanOrEqual(e.minCards);
          if (e.maxCards !== undefined) expect(r.body.productCards.length).toBeLessThanOrEqual(e.maxCards);
          if (e.proposal !== undefined) expect(r.body.basketProposal !== null).toBe(e.proposal);
          if (e.maxProposalTotalRial !== undefined) expect(r.body.basketProposal.totalRial).toBeLessThanOrEqual(e.maxProposalTotalRial);
          if (e.compare !== undefined) expect(r.body.compareProduceTypeId !== null).toBe(e.compare);

          // checks that hold for any model
          const audit: Array<{ kind: string; name: string; input: unknown; output: unknown; ok: boolean }> = (await call("GET", `/v1/admin/assistant/conversations/${conversationId}/audit`, undefined, admin)).body;
          const toolRows = audit.filter((a) => a.kind === "TOOL");
          for (const used of r.body.toolsUsed as string[]) expect(toolRows.map((t) => t.name)).toContain(used);
          expect(ungroundedNumbers(answer, toolRows.map((t) => t.output), turn.user)).toEqual([]);
          expect(audit.filter((a) => a.kind === "GUARD")).toEqual([]);
          for (const s of e.auditNotContains ?? []) expect(JSON.stringify(audit)).not.toContain(s);
          // talking never changes the cart
          expect((await call("GET", `/v1/cart?dest=${dest}`, undefined, buyer)).body.itemCount).toBe(0);
        }
      });
    }
  });
}
