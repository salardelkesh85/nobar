"use client";

import { toEnDigits, toFaDigits } from "@nobar/fa";
import { Button, Field, Input, Logo } from "@nobar/ui";
import { ArrowRight, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { read } from "@/lib/store";
import { useStore } from "@/lib/store";

const DEMO_CODE = "123456";

/** «0912…», «+98912…», «98912…», Persian digits → 09xxxxxxxxx, or null. */
function normalizeMobile(input: string): string | null {
  const d = toEnDigits(input).replace(/\D/g, "");
  const m = d.match(/^(?:0098|98|0)?(9\d{9})$/);
  return m ? `0${m[1]}` : null;
}

function LoginView() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/me";
  const { signIn, user, ready, showToast } = useStore();
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  const normalized = normalizeMobile(phone);

  const finish = (displayName: string) => {
    signIn({ phone: normalized!, name: displayName });
    showToast(`خوش آمدید${displayName ? `، ${displayName}` : ""}!`);
    router.replace(next);
  };

  return (
    <div className="studio-login mx-auto max-w-md">
      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          {step !== "phone" ? (
            <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="بازگشت">
              <ArrowRight className="size-5" />
            </button>
          ) : (
            <span />
          )}
          <Link href="/" aria-label="نوبر">
            <Logo />
          </Link>
          <span className="size-10" />
        </div>

        {step === "phone" ? (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!normalized) return setError("شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.");
              setError("");
              setStep("code");
              setSeconds(120);
            }}
          >
            <div>
              <h1 className="text-xl font-extrabold">ورود | ثبت‌نام</h1>
              <p className="mt-1 text-sm text-ink-soft">سلام! لطفاً شماره‌ی موبایل خود را وارد کنید.</p>
            </div>
            <Field label="شماره‌ی موبایل" htmlFor="phone" error={error}>
              <Input id="phone" inputMode="tel" autoComplete="tel" dir="ltr" className="text-center text-lg tracking-widest" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              دریافت کد ورود
            </Button>
            <p className="text-center text-xs leading-6 text-ink-soft">
              ورود شما به معنای پذیرش{" "}
              <Link href="/terms" className="text-brand hover:underline">قوانین نوبر</Link> و{" "}
              <Link href="/privacy" className="text-brand hover:underline">حریم خصوصی</Link> است.
            </p>
          </form>
        ) : null}

        {step === "code" ? (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (toEnDigits(code).replace(/\D/g, "") !== DEMO_CODE) return setError("کد واردشده درست نیست.");
              setError("");
              const known = read<{ phone: string; name: string } | null>("nobar_known_user", null);
              if (known && known.phone === normalized) finish(known.name);
              else setStep("name");
            }}
          >
            <div>
              <h1 className="text-xl font-extrabold">کد تأیید را وارد کنید</h1>
              <p className="mt-1 text-sm text-ink-soft">
                کد ۶ رقمی به شماره‌ی <span dir="ltr" className="font-bold text-ink">{toFaDigits(normalized ?? "")}</span> فرستاده شد.
              </p>
            </div>
            <p className="flex items-start gap-2 rounded-control bg-saffron-soft p-3 text-xs leading-6 text-warn">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              نسخه‌ی نمایشی است و پیامکی فرستاده نمی‌شود. کد ورود: <span className="font-bold" dir="ltr">{toFaDigits(DEMO_CODE)}</span>
            </p>
            <Field label="کد تأیید" htmlFor="code" error={error}>
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="text-center text-2xl tracking-[0.6em]" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </Field>
            <div className="text-center text-sm">
              {seconds > 0 ? (
                <span className="text-ink-soft">
                  ارسال دوباره‌ی کد تا {toFaDigits(Math.floor(seconds / 60))}:{toFaDigits(String(seconds % 60).padStart(2, "0"))}
                </span>
              ) : (
                <button type="button" className="font-bold text-brand" onClick={() => { setSeconds(120); showToast("کد دوباره فرستاده شد."); }}>
                  ارسال دوباره‌ی کد
                </button>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full">
              تأیید و ادامه
            </Button>
          </form>
        ) : null}

        {step === "name" ? (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim();
              try {
                localStorage.setItem("nobar_known_user", JSON.stringify({ phone: normalized, name: n }));
              } catch {
                /* ignore */
              }
              finish(n);
            }}
          >
            <div>
              <h1 className="text-xl font-extrabold">به نوبر خوش آمدید</h1>
              <p className="mt-1 text-sm text-ink-soft">نام شما برای تحویل سفارش‌ها لازم است.</p>
            </div>
            <Field label="نام و نام خانوادگی" htmlFor="name">
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              ورود به نوبر
            </Button>
          </form>
        ) : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
          <ShieldCheck className="size-4 text-brand" aria-hidden />
          شماره‌ی شما فقط برای ورود و هماهنگی تحویل استفاده می‌شود.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
