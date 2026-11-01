"use client";
import { IdentityApiError, IdentityClient, type UserDto } from "@nobar/contracts";
import { useRef, useState } from "react";
import type { Address, User } from "./store";
import { API_URL } from "./api-config";

export const identityError = (error: unknown) => error instanceof IdentityApiError
  ? error.status === 401 ? "نشست پایان یافته یا کد ورود معتبر نیست؛ دوباره وارد شوید."
    : error.status === 429 ? "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید."
    : error.status === 400 ? "اطلاعات واردشده معتبر نیست؛ دوباره بررسی کنید."
    : "ذخیره یا دریافت اطلاعات انجام نشد؛ دوباره تلاش کنید."
  : "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.";
const asUser = (u: UserDto): User => ({ phone: u.phone, name: u.name ?? "" });

/** One in-memory session per provider. Never hydrate API identities from demo storage. */
export function useApiIdentity() {
  const [client] = useState(() => new IdentityClient(API_URL));
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const epoch = useRef(0);
  async function authenticated<T>(action: () => Promise<T>): Promise<T> {
    const current = epoch.current;
    try {
      const result = await action();
      if (current !== epoch.current) throw new IdentityApiError(401, "نشست تغییر کرد.");
      return result;
    } catch (error) {
      if (current === epoch.current && error instanceof IdentityApiError && error.status === 401) {
        epoch.current++; setUser(null); setAddresses([]);
      }
      throw error;
    }
  }
  return {
    apiMode: Boolean(API_URL), user, addresses,
    requestOtp: (phone: string) => client.requestOtp(phone),
    verifyCode: async (phone: string, code: string) => {
      epoch.current++; setUser(null); setAddresses([]);
      return client.verify(phone, code);
    },
    completeSignIn: async (name?: string) => {
      const result = await authenticated(async () => {
        const profile = name === undefined ? await client.me() : await client.updateMe({ name });
        return { profile, addresses: await client.addresses() };
      });
      setUser(asUser(result.profile)); setAddresses(result.addresses);
    },
    updateUser: async (patch: Partial<User>) => {
      const profile = await authenticated(() => client.updateMe({ name: patch.name }));
      setUser(asUser(profile));
    },
    signOut: async () => {
      epoch.current++; setUser(null); setAddresses([]);
      await client.logout();
    },
    saveAddress: async (a: Address) => {
      const { id, ...body } = a;
      const saved = await authenticated(() => addresses.some(x => x.id === id)
        ? client.updateAddress(id, body) : client.addAddress(body));
      setAddresses(previous => [...previous.filter(x => x.id !== saved.id), saved]);
      return saved;
    },
    removeAddress: async (id: string) => {
      await authenticated(() => client.removeAddress(id));
      setAddresses(previous => previous.filter(x => x.id !== id));
    },
  };
}
