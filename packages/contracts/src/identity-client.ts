import type { AddressDto, AuthTokensDto, UserDto } from './domain';

export class IdentityApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Per-session client. Tokens stay in memory; callers own persistence policy. */
export class IdentityClient {
  private tokens: AuthTokensDto | null = null;
  private refreshing: Promise<void> | null = null;
  private generation = 0;
  private readonly base: string;
  constructor(baseUrl: string, private readonly transport: typeof fetch = fetch) {
    this.base = baseUrl.replace(/\/$/, '');
  }
  get user(): UserDto | null { return this.tokens?.user ?? null; }
  private async request<T>(path: string, method = 'GET', body?: unknown, token?: string): Promise<T> {
    const response = await this.transport(`${this.base}/v1/${path}`, {
      method, cache: 'no-store', redirect: 'error',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new IdentityApiError(response.status, 'درخواست انجام نشد؛ دوباره تلاش کنید.');
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  }
  requestOtp(phone: string) {
    return this.request<{ expiresInSec: number; resendInSec: number; devCode?: string }>('auth/otp', 'POST', { phone });
  }
  async verify(phone: string, code: string) {
    const generation = ++this.generation;
    const result = await this.request<AuthTokensDto & { isNew: boolean }>('auth/verify', 'POST', { phone, code });
    if (generation === this.generation) this.tokens = result;
    return result;
  }
  private async renew() {
    if (this.refreshing) return this.refreshing;
    const tokens = this.tokens;
    if (!tokens) throw new IdentityApiError(401, 'دوباره وارد شوید.');
    const generation = this.generation;
    const pending = this.request<AuthTokensDto>('auth/refresh', 'POST', { refreshToken: tokens.refreshToken })
      .then(result => { if (generation === this.generation) this.tokens = result; })
      .catch((error: unknown) => {
        if (generation === this.generation && error instanceof IdentityApiError && error.status === 401) this.tokens = null;
        throw error;
      });
    this.refreshing = pending;
    try { await pending; } finally { if (this.refreshing === pending) this.refreshing = null; }
  }
  private async authenticated<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const tokens = this.tokens, generation = this.generation;
    if (!tokens) throw new IdentityApiError(401, 'ابتدا وارد شوید.');
    try { return await this.request<T>(path, method, body, tokens.accessToken); }
    catch (error) {
      if (!(error instanceof IdentityApiError) || error.status !== 401 || generation !== this.generation) throw error;
      if (this.tokens?.accessToken === tokens.accessToken) await this.renew();
      if (!this.tokens || generation !== this.generation) throw error;
      return this.request<T>(path, method, body, this.tokens.accessToken);
    }
  }
  me() { return this.authenticated<UserDto>('me'); }
  updateMe(patch: { name?: string; cityId?: string }) { return this.authenticated<UserDto>('me', 'PATCH', patch); }
  addresses() { return this.authenticated<AddressDto[]>('me/addresses'); }
  addAddress(address: Omit<AddressDto, 'id'>) { return this.authenticated<AddressDto>('me/addresses', 'POST', address); }
  updateAddress(id: string, patch: Partial<Omit<AddressDto, 'id'>>) { return this.authenticated<AddressDto>(`me/addresses/${encodeURIComponent(id)}`, 'PATCH', patch); }
  removeAddress(id: string) { return this.authenticated<void>(`me/addresses/${encodeURIComponent(id)}`, 'DELETE'); }
  async logout() {
    const tokens = this.tokens;
    this.tokens = null;
    this.generation++;
    this.refreshing = null;
    if (tokens) await this.request<void>('auth/logout', 'POST', { refreshToken: tokens.refreshToken });
  }
}
