"use client";

import { IdentityApiError, IdentityClient, type UserDto } from "@nobar/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "./config";

/** Where the signed-in user stands: staff tools open only for the ADMIN role (the API checks it again on every call). */
export type AdminStage = "loading" | "signed-out" | "forbidden" | "ready";
export interface QueueCounts {
  kyc: number;
  moderation: number;
  disputes: number;
}

interface AdminState {
  client: IdentityClient;
  stage: AdminStage;
  user: UserDto | null;
  counts: QueueCounts | null;
  /** re-read the session (after sign-in) */
  reload: () => Promise<void>;
  /** re-read the queue sizes shown in the menu (after a decision) */
  refreshCounts: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminState | null>(null);
export const errorText = (e: unknown) => (e instanceof IdentityApiError ? e.message : "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
export const newKey = () => crypto.randomUUID();

export function AdminProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new IdentityClient(API_URL));
  const [stage, setStage] = useState<AdminStage>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  const [counts, setCounts] = useState<QueueCounts | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      const kyc = await client.call<unknown[]>("admin/kyc");
      const mod = await client.call<{ pendingListings: unknown[]; cases: unknown[] }>("admin/moderation");
      const reviews = await client.call<{ reviews: unknown[]; flaggedQuestions: unknown[] }>("admin/reviews");
      const disputed = await client.call<Array<{ dispute: { status: string } | null }>>("admin/orders?status=DISPUTED");
      setCounts({
        kyc: kyc.length,
        moderation: mod.pendingListings.length + mod.cases.length + reviews.reviews.length + reviews.flaggedQuestions.length,
        disputes: disputed.filter((o) => o.dispute?.status === "AWAITING_STAFF").length,
      });
    } catch {
      setCounts(null);
    }
  }, [client]);

  const reload = useCallback(async () => {
    try {
      const me = client.user ?? (await client.restore());
      setUser(me);
      if (!me.roles.includes("ADMIN")) return setStage("forbidden");
      setStage("ready");
      void refreshCounts();
    } catch {
      setUser(null);
      setStage("signed-out");
    }
  }, [client, refreshCounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const signOut = useCallback(async () => {
    await client.logout().catch(() => undefined);
    setUser(null);
    setCounts(null);
    setStage("signed-out");
  }, [client]);

  const value = useMemo(() => ({ client, stage, user, counts, reload, refreshCounts, signOut }), [client, stage, user, counts, reload, refreshCounts, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** null in demo mode (no provider). */
export const useAdminOptional = () => useContext(Ctx);
export function useAdmin(): AdminState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AdminProvider is missing");
  return v;
}

/** Reads one API resource; failures are shown, never replaced by demo data. */
export function useAdminData<T>(path: string, opts: { public?: boolean } = {}) {
  const { client } = useAdmin();
  const isPublic = opts.public ?? false;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await (isPublic ? client.get<T>(path) : client.call<T>(path)));
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [client, path, isPublic]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload };
}
