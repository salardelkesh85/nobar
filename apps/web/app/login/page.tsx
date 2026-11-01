"use client";
import { toEnDigits, toFaDigits } from "@nobar/fa";
import { Button, Field, Input, Logo } from "@nobar/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { read, useStore } from "@/lib/store";
import { identityError } from "@/lib/api-identity";

function LoginView() {
  const router = useRouter();
  const requested = useSearchParams().get("next") ?? "/me";
  const next = requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/me";
  const { user, ready, apiMode, requestOtp, verifyCode, completeSignIn, signIn, showToast } = useStore();
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [devCode, setDevCode] = useState<string | undefined>();
  // Verification may succeed while loading the account fails. Retry account loading, not a spent OTP.
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const digits = toEnDigits(phone).replace(/\D/g, "");
  const match = digits.match(/^(?:0098|98|0)?(9\d{9})$/);
  const normalized = match ? `0${match[1]}` : null;
  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);
  useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  async function sendCode() {
    if (!normalized) throw new Error("phone");
    const result = apiMode ? await requestOtp(normalized) : { resendInSec: 120, devCode: "123456" };
    setDevCode(result.devCode); setSeconds(result.resendInSec); setVerifiedName(null); setStep("code");
  }
  async function finish(displayName: string) {
    if (apiMode) await completeSignIn(displayName);
    else {
      try { localStorage.setItem("nobar_known_user", JSON.stringify({ phone: normalized, name: displayName })); } catch { /* demo storage can be unavailable */ }
      signIn({ phone: normalized!, name: displayName });
    }
    showToast("خوش آمدید!"); router.replace(next);
  }
  async function submit() {
    if (step === "phone") { await sendCode(); return; }
    if (step === "name") { await finish(name.trim()); return; }
    if (apiMode) {
      const knownName = verifiedName ?? (await verifyCode(normalized!, toEnDigits(code))).user.name ?? "";
      setVerifiedName(knownName);
      if (!knownName) { setStep("name"); return; }
      await completeSignIn(); router.replace(next);
    } else {
      if (toEnDigits(code) !== "123456") { setError("کد واردشده درست نیست."); return; }
      const known = read<{ phone: string; name: string } | null>("nobar_known_user", null);
      if (known?.phone === normalized) await finish(known.name); else setStep("name");
    }
  }
  return <div className="studio-login mx-auto max-w-md"><div className="rounded-card border border-line bg-surface p-6 sm:p-8">
    <div className="mb-6 flex items-center justify-between"><Link href="/" aria-label="نوبر"><Logo /></Link>
      {step !== "phone" ? <button type="button" disabled={busy} onClick={() => { setStep("phone"); setError(""); setCode(""); setVerifiedName(null); }}>تغییر شماره</button> : null}
    </div>
    <form className="space-y-5" aria-busy={busy} onSubmit={async e => {
      e.preventDefault(); if (busy) return; setError("");
      if (!normalized) { setError("شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷."); return; }
      if (step === "name" && name.trim().length < 2) { setError("نام را با حداقل دو حرف وارد کنید."); return; }
      setBusy(true); try { await submit(); } catch (failure) { setError(identityError(failure)); } finally { setBusy(false); }
    }}>
      <h1 className="text-xl font-extrabold">{step === "phone" ? "ورود | ثبت‌نام" : step === "code" ? "کد تأیید را وارد کنید" : "به نوبر خوش آمدید"}</h1>
      <fieldset disabled={busy} className="space-y-5">
      {step === "phone" ? <Field label="شماره‌ی موبایل" htmlFor="phone"><Input id="phone" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} autoFocus /></Field> : null}
      {step === "code" ? <>
        <p className="text-sm text-ink-soft">شمارهٔ ورود: <span dir="ltr">{toFaDigits(normalized ?? "")}</span></p>
        {!apiMode || devCode ? <p className="rounded-control bg-saffron-soft p-3 text-xs text-warn">{apiMode ? "محیط آزمایشی API؛ کد تست:" : "نسخهٔ نمایشی؛ پیامکی ارسال نمی‌شود. کد ورود:"} <span dir="ltr">{toFaDigits(devCode ?? "123456")}</span></p> : null}
        <Field label="کد تأیید" htmlFor="code"><Input id="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={e => setCode(e.target.value)} autoFocus /></Field>
        <button type="button" disabled={busy || seconds > 0} className="text-sm text-brand disabled:text-ink-soft" onClick={async () => {
          if (busy) return; setBusy(true); setError("");
          try { await sendCode(); setCode(""); } catch (failure) { setError(identityError(failure)); } finally { setBusy(false); }
        }}>{seconds > 0 ? `ارسال دوباره تا ${toFaDigits(seconds)} ثانیه` : "ارسال دوبارهٔ کد"}</button>
      </> : null}
      {step === "name" ? <Field label="نام و نام خانوادگی" htmlFor="name"><Input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} autoFocus /></Field> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "لطفاً صبر کنید…" : step === "phone" ? "دریافت کد ورود" : step === "code" ? "تأیید و ادامه" : "ورود به نوبر"}</Button>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </form>
    <p className="mt-5 text-xs leading-6 text-ink-soft">ورود به معنی پذیرش <Link href="/terms" className="text-brand">قوانین نوبر</Link> و <Link href="/privacy" className="text-brand">حریم خصوصی</Link> است.</p>
  </div></div>;
}
export default function LoginPage() { return <Suspense><LoginView /></Suspense>; }
