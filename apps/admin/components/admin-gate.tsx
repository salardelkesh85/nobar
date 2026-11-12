"use client";

import { toFaDigits } from "@nobar/fa";
import { Button, Card, Field, Input } from "@nobar/ui";
import { ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { errorText, useAdmin } from "@/lib/api";

/** Phone OTP sign-in; the session cookie is shared with the store (same API). */
function SignIn() {
  const { client, reload } = useAdmin();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ devCode?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-extrabold">ورود کارکنان</h1>
      <p className="text-sm text-ink-soft">فقط شماره‌هایی که نقش پشتیبانی دارند به این پنل دسترسی دارند.</p>
      {!sent ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => setSent(await client.requestOtp(phone)));
          }}
        >
          <Field label="شماره‌ی موبایل" htmlFor="admin-phone">
            <Input id="admin-phone" inputMode="tel" dir="ltr" className="text-end" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            دریافت کد
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await client.verify(phone, code);
              await reload();
            });
          }}
        >
          {sent.devCode ? <p className="rounded-control bg-saffron-soft p-2 text-sm">محیط آزمایشی؛ کد: {toFaDigits(sent.devCode)}</p> : null}
          <Field label="کد تأیید" htmlFor="admin-code">
            <Input id="admin-code" inputMode="numeric" dir="ltr" className="text-end" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            ورود
          </Button>
        </form>
      )}
      {error ? (
        <p role="alert" className="rounded-control bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

/** API mode: pages render only for a signed-in ADMIN. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { stage, signOut } = useAdmin();
  if (stage === "loading") return <p className="p-6 text-sm text-ink-soft">در حال بررسی ورود…</p>;
  if (stage === "signed-out") return <SignIn />;
  if (stage === "forbidden")
    return (
      <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
        <ShieldAlert className="mx-auto size-8 text-danger" aria-hidden />
        <h1 className="text-xl font-extrabold">دسترسی ندارید</h1>
        <p className="text-sm text-ink-soft">این حساب نقش پشتیبانی ندارد.</p>
        <Button variant="secondary" onClick={() => void signOut()}>
          ورود با شماره‌ی دیگر
        </Button>
      </Card>
    );
  return <>{children}</>;
}
