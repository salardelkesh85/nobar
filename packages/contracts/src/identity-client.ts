import type { AddressDto, AuthSessionDto, UserDto } from "./domain";

export class IdentityApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** stable Problem Details code from the API, e.g. INSUFFICIENT_STOCK */
    public readonly code?: string,
  ) {
    super(message);
  }
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  /** sent as Idempotency-Key (checkout, payment) so a retried click is safe */
  idempotencyKey?: string;
}

/** Browser session client. Authentication material stays in HttpOnly cookies. */
export class IdentityClient {
  private session: AuthSessionDto | null = null;
  private refreshing: Promise<void> | null = null;
  private generation = 0;
  private readonly base: string;

  constructor(baseUrl: string, private readonly transport: typeof fetch = fetch) {
    this.base = baseUrl.replace(/\/$/, "");
  }

  get user(): UserDto | null {
    return this.session?.user ?? null;
  }

  private async request<T>(path: string, method = "GET", body?: unknown, idempotencyKey?: string): Promise<T> {
    const transport = this.transport;
    const headers: Record<string, string> = body === undefined ? {} : { "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const response = await transport(`${this.base}/v1/${path}`, {
      method,
      cache: "no-store",
      credentials: "include",
      redirect: "error",
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      // the API answers with Problem Details whose `detail` is already a Persian message for the user
      const problem = (await response.json().catch(() => null)) as { detail?: unknown; code?: unknown } | null;
      const detail = typeof problem?.detail === "string" && response.status < 500 ? problem.detail : "درخواست انجام نشد؛ دوباره تلاش کنید.";
      throw new IdentityApiError(response.status, detail, typeof problem?.code === "string" ? problem.code : undefined);
    }
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  }

  requestOtp(phone: string) {
    return this.request<{ expiresInSec: number; resendInSec: number; devCode?: string }>("auth/otp", "POST", { phone });
  }

  async verify(phone: string, code: string) {
    const generation = ++this.generation;
    const result = await this.request<AuthSessionDto & { isNew: boolean }>("auth/verify", "POST", { phone, code });
    if (generation === this.generation) this.session = result;
    return result;
  }

  private async renew() {
    if (this.refreshing) return this.refreshing;
    const generation = this.generation;
    const pending = (async () => {
      let result: AuthSessionDto;
      try {
        result = await this.request<AuthSessionDto>("auth/refresh", "POST");
      } catch (error) {
        if (!(error instanceof IdentityApiError) || error.status !== 409) throw error;
        await new Promise((resolve) => setTimeout(resolve, 80));
        result = await this.request<AuthSessionDto>("auth/refresh", "POST");
      }
      if (generation === this.generation) this.session = result;
    })().catch((error: unknown) => {
      if (generation === this.generation && error instanceof IdentityApiError && error.status === 401) this.session = null;
      throw error;
    });
    this.refreshing = pending;
    try {
      await pending;
    } finally {
      if (this.refreshing === pending) this.refreshing = null;
    }
  }

  async restore(): Promise<UserDto> {
    await this.renew();
    if (!this.session) throw new IdentityApiError(401, "دوباره وارد شوید.");
    return this.session.user;
  }

  private async authenticated<T>(path: string, method = "GET", body?: unknown, idempotencyKey?: string): Promise<T> {
    const generation = this.generation;
    if (!this.session) throw new IdentityApiError(401, "ابتدا وارد شوید.");
    try {
      return await this.request<T>(path, method, body, idempotencyKey);
    } catch (error) {
      if (!(error instanceof IdentityApiError) || error.status !== 401 || generation !== this.generation) throw error;
      await this.renew();
      if (!this.session || generation !== this.generation) throw error;
      return this.request<T>(path, method, body, idempotencyKey);
    }
  }

  /** Any signed-in API call (cart, checkout, orders, seller and staff panels), refreshing the session on 401. */
  call<T>(path: string, options: CallOptions = {}): Promise<T> {
    return this.authenticated<T>(path, options.method ?? "GET", options.body, options.idempotencyKey);
  }

  /** Public API call (no session needed). */
  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  me() {
    return this.authenticated<UserDto>("me");
  }
  updateMe(patch: { name?: string; cityId?: string }) {
    return this.authenticated<UserDto>("me", "PATCH", patch);
  }
  addresses() {
    return this.authenticated<AddressDto[]>("me/addresses");
  }
  addAddress(address: Omit<AddressDto, "id">) {
    return this.authenticated<AddressDto>("me/addresses", "POST", address);
  }
  updateAddress(id: string, patch: Partial<Omit<AddressDto, "id">>) {
    return this.authenticated<AddressDto>(`me/addresses/${encodeURIComponent(id)}`, "PATCH", patch);
  }
  removeAddress(id: string) {
    return this.authenticated<void>(`me/addresses/${encodeURIComponent(id)}`, "DELETE");
  }

  async logout() {
    this.session = null;
    this.generation++;
    this.refreshing = null;
    await this.request<void>("auth/logout", "POST");
  }
}
