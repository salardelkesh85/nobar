"use client";

import { CITIES } from "@nobar/contracts/cities";
import { METHOD_FA, type ShippingMethodCode } from "@nobar/demo";
import { toEnDigits, toFaDigits } from "@nobar/fa";
import { Button, Card, Field, Input, Select, Textarea } from "@nobar/ui";
import { Clock, ShieldAlert, Store } from "lucide-react";
import { useState } from "react";
import { errorText, useSeller } from "@/lib/state";

const num = (v: string) => Number(toEnDigits(v).replace(/[^\d]/g, "")) || 0;

/** Phone OTP sign-in; the session cookie is shared with the store (same API). */
function SignIn() {
  const { client, reload, showToast } = useSeller();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ devCode?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      showToast(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-extrabold">ورود غرفه‌دار</h1>
      <p className="text-sm text-ink-soft">با همان شماره‌ای وارد شوید که غرفه را با آن ثبت کرده‌اید یا می‌خواهید ثبت کنید.</p>
      {!sent ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => setSent(await client.requestOtp(phone)));
          }}
        >
          <Field label="شماره‌ی موبایل" htmlFor="seller-phone">
            <Input id="seller-phone" inputMode="tel" dir="ltr" className="text-end" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
          <Field label="کد تأیید" htmlFor="seller-code">
            <Input id="seller-code" inputMode="numeric" dir="ltr" className="text-end" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            ورود
          </Button>
        </form>
      )}
    </Card>
  );
}

type RateDraft = { on: boolean; base: string; perKg: string; maxKg: string };
const METHODS: ShippingMethodCode[] = ["SELLER_LOCAL", "POST", "TIPAX", "FREIGHT"];

/** Shop details and KYC (kit: phone OTP → shop details and KYC → staff approval → first listing). */
function Application() {
  const { client, reload, showToast, reviewNote, stage } = useSeller();
  const [f, setF] = useState({
    name: "",
    type: "GROWER",
    cityId: "miandoab",
    ownerName: "",
    handlingDays: "1",
    sla: "6",
    storyTitle: "",
    story: "",
    practices: "",
    sinceYear: "1390",
    nationalId: "",
    sheba: "",
  });
  const [rates, setRates] = useState<Record<ShippingMethodCode, RateDraft>>({
    SELLER_LOCAL: { on: true, base: "30000", perKg: "0", maxKg: "60" },
    POST: { on: false, base: "", perKg: "", maxKg: "20" },
    TIPAX: { on: true, base: "", perKg: "", maxKg: "30" },
    FREIGHT: { on: false, base: "", perKg: "", maxKg: "200" },
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Card className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Store className="size-6 text-brand" aria-hidden />
        <h1 className="text-xl font-extrabold">{stage === "rejected" ? "اصلاح درخواست غرفه" : "ثبت غرفه در نوبر"}</h1>
      </div>
      {stage === "rejected" && reviewNote ? <p className="rounded-control bg-danger-soft p-3 text-sm text-danger">علت رد درخواست: {reviewNote}</p> : null}
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const shipping = METHODS.filter((m) => rates[m].on).map((m) => ({
            method: m,
            baseRial: num(rates[m].base) * 10,
            perKgRial: num(rates[m].perKg) * 10,
            maxWeightGrams: num(rates[m].maxKg) * 1000,
          }));
          setBusy(true);
          try {
            await client.call("seller/shop", {
              method: "POST",
              body: {
                name: f.name,
                type: f.type,
                cityId: f.cityId,
                ownerName: f.ownerName,
                handlingDays: num(f.handlingDays),
                acceptanceSlaHours: num(f.sla),
                story: {
                  title: f.storyTitle,
                  body: f.story.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
                  practices: f.practices.split(/[،,]/).map((p) => p.trim()).filter(Boolean),
                  sinceYear: num(f.sinceYear),
                },
                shipping,
                kyc: { nationalId: f.nationalId, sheba: f.sheba },
              },
            });
            showToast("درخواست شما ثبت شد؛ کارشناس نوبر آن را بررسی می‌کند.");
            await reload();
          } catch (err) {
            showToast(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام غرفه" htmlFor="a-name">
            <Input id="a-name" value={f.name} onChange={set("name")} />
          </Field>
          <Field label="نام صاحب غرفه" htmlFor="a-owner">
            <Input id="a-owner" value={f.ownerName} onChange={set("ownerName")} />
          </Field>
          <Field label="نوع" htmlFor="a-type">
            <Select id="a-type" value={f.type} onChange={set("type")}>
              <option value="GROWER">باغدار</option>
              <option value="SHOP">میوه‌فروشی</option>
              <option value="COOPERATIVE">تعاونی</option>
            </Select>
          </Field>
          <Field label="شهر" htmlFor="a-city">
            <Select id="a-city" value={f.cityId} onChange={set("cityId")}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="آماده‌سازی (روز)" htmlFor="a-handling" hint="از ثبت سفارش تا تحویل به پست">
            <Input id="a-handling" inputMode="numeric" value={f.handlingDays} onChange={set("handlingDays")} />
          </Field>
          <Field label="مهلت تأیید سفارش (ساعت)" htmlFor="a-sla">
            <Input id="a-sla" inputMode="numeric" value={f.sla} onChange={set("sla")} />
          </Field>
        </div>

        <fieldset className="space-y-3">
          <legend className="font-bold">باغ‌نامه</legend>
          <Field label="عنوان" htmlFor="a-story-title">
            <Input id="a-story-title" value={f.storyTitle} onChange={set("storyTitle")} placeholder="مثلاً باغی کنار زرینه‌رود" />
          </Field>
          <Field label="داستان باغ" htmlFor="a-story" hint="هر بند را با یک خط خالی جدا کنید">
            <Textarea id="a-story" rows={4} value={f.story} onChange={set("story")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="روش‌های کار" htmlFor="a-practices" hint="با ویرگول جدا کنید">
              <Input id="a-practices" value={f.practices} onChange={set("practices")} />
            </Field>
            <Field label="سال شروع (شمسی)" htmlFor="a-since">
              <Input id="a-since" inputMode="numeric" value={f.sinceYear} onChange={set("sinceYear")} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-bold">روش‌های ارسال (تومان)</legend>
          {METHODS.map((m) => (
            <div key={m} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[10rem_repeat(3,minmax(0,1fr))]">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rates[m].on} onChange={(e) => setRates((r) => ({ ...r, [m]: { ...r[m], on: e.target.checked } }))} className="size-4 accent-[var(--brand)]" />
                {METHOD_FA[m]}
              </label>
              {(
                [
                  ["base", "پایه"],
                  ["perKg", "هر کیلو"],
                  ["maxKg", "حداکثر کیلو"],
                ] as const
              ).map(([k, label]) => (
                <Input key={k} aria-label={`${METHOD_FA[m]} — ${label}`} placeholder={label} inputMode="numeric" disabled={!rates[m].on} value={rates[m][k]} onChange={(e) => setRates((r) => ({ ...r, [m]: { ...r[m], [k]: e.target.value } }))} />
              ))}
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-bold">احراز هویت</legend>
          <p className="text-xs text-ink-soft">کد ملی و شبا رمزنگاری‌شده نگه داشته می‌شوند و فقط چهار رقم آخرشان به کارشناس نشان داده می‌شود.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="کد ملی" htmlFor="a-nid">
              <Input id="a-nid" inputMode="numeric" dir="ltr" className="text-end" value={f.nationalId} onChange={set("nationalId")} />
            </Field>
            <Field label="شماره‌ی شبا" htmlFor="a-sheba">
              <Input id="a-sheba" dir="ltr" className="text-end" placeholder="IR…" value={f.sheba} onChange={set("sheba")} />
            </Field>
          </div>
        </fieldset>

        <Button type="submit" size="lg" disabled={busy}>
          فرستادن برای بررسی
        </Button>
      </form>
    </Card>
  );
}

/** API mode: what to show instead of the panel until the user has an approved shop. */
export function SellerGate() {
  const { stage, shop } = useSeller();
  if (stage === "signed-out") return <SignIn />;
  if (stage === "no-shop" || stage === "rejected") return <Application />;
  if (stage === "pending")
    return (
      <Card className="mx-auto max-w-md space-y-2 p-6 text-center">
        <Clock className="mx-auto size-10 text-brand" aria-hidden />
        <h1 className="text-lg font-extrabold">درخواست «{shop.name}» در حال بررسی است</h1>
        <p className="text-sm text-ink-soft">کارشناس نوبر مدارک را بررسی می‌کند. بعد از تأیید، می‌توانید محصول ثبت کنید.</p>
      </Card>
    );
  return (
    <Card className="mx-auto max-w-md space-y-2 p-6 text-center">
      <ShieldAlert className="mx-auto size-10 text-danger" aria-hidden />
      <h1 className="text-lg font-extrabold">غرفه‌ی شما موقتاً تعلیق شده است</h1>
      <p className="text-sm text-ink-soft">برای پیگیری با پشتیبانی نوبر تماس بگیرید.</p>
    </Card>
  );
}
