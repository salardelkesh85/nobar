import { propagationHeaders } from "./context";
import { UpstreamError } from "./errors";
import type { Logger } from "./logger";
import { sleep } from "./util";

export interface CallOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  /** bearer token to forward (calls made on behalf of a user) */
  auth?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Typed service-to-service HTTP client (docs/architecture.md §5): per-call timeout, retries only for
 * idempotent requests (GET or with an Idempotency-Key), and a circuit breaker per downstream service.
 */
export class ServiceClient {
  private failures = 0;
  private openUntil = 0;

  constructor(
    readonly service: string,
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly log: Logger,
    private readonly defaultTimeoutMs = 3000,
  ) {}

  get<T>(path: string, opts?: CallOptions) {
    return this.request<T>("GET", path, undefined, opts);
  }
  post<T>(path: string, body?: unknown, opts?: CallOptions) {
    return this.request<T>("POST", path, body, opts);
  }
  patch<T>(path: string, body?: unknown, opts?: CallOptions) {
    return this.request<T>("PATCH", path, body, opts);
  }
  delete<T>(path: string, opts?: CallOptions) {
    return this.request<T>("DELETE", path, undefined, opts);
  }

  async request<T>(method: string, path: string, body?: unknown, opts: CallOptions = {}): Promise<T> {
    if (Date.now() < this.openUntil) {
      throw new UpstreamError(this.service, 503, "CIRCUIT_OPEN", `سرویس ${this.service} موقتاً در دسترس نیست`);
    }
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-internal-token": this.internalToken,
      ...propagationHeaders(),
      ...opts.headers,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
    if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

    const attempts = method === "GET" || opts.idempotencyKey ? 3 : 1;
    let lastError: UpstreamError | undefined;
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(100 * 2 ** attempt + Math.random() * 100);
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(opts.timeoutMs ?? this.defaultTimeoutMs),
        });
      } catch (e) {
        this.recordFailure();
        lastError = new UpstreamError(this.service, 503, "UPSTREAM_UNAVAILABLE", `ارتباط با سرویس ${this.service} برقرار نشد`, { cause: String(e) });
        continue;
      }
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }
      if (res.status >= 500) {
        this.recordFailure();
        const p = (data ?? {}) as { code?: string; detail?: string };
        lastError = new UpstreamError(this.service, res.status, p.code ?? "UPSTREAM_ERROR", p.detail ?? `خطا در سرویس ${this.service}`);
        continue;
      }
      this.failures = 0;
      if (!res.ok) {
        const p = (data ?? {}) as { code?: string; detail?: string; errors?: unknown };
        throw new UpstreamError(this.service, res.status, p.code ?? `HTTP_${res.status}`, p.detail ?? res.statusText, p.errors);
      }
      return data as T;
    }
    throw lastError!;
  }

  private recordFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.openUntil = Date.now() + 10_000;
      this.failures = 0;
      this.log.warn({ downstream: this.service }, "circuit breaker opened for 10s");
    }
  }
}
