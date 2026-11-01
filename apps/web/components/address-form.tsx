"use client";

import { destinationCities } from "@nobar/demo";
import { toEnDigits } from "@nobar/fa";
import { Button, Field, Input, Select, Textarea } from "@nobar/ui";
import { useState } from "react";
import { identityError } from "@/lib/api-identity";
import type { Address } from "@/lib/store";

export const emptyAddress = (cityId: string, name = "", phone = ""): Address => ({
  id: `a${Date.now().toString(36)}`,
  title: "خانه",
  cityId,
  name,
  phone,
  line: "",
  postalCode: "",
});

/** Validates and returns the error map (empty = valid). Accepts Persian and Arabic digits. */
export function validateAddress(a: Address): Record<string, string> {
  const e: Record<string, string> = {};
  if (a.name.trim().length < 3) e.name = "نام و نام خانوادگی تحویل‌گیرنده را بنویسید.";
  if (!/^(0?9\d{9}|989\d{9})$/.test(toEnDigits(a.phone).replace(/\D/g, ""))) e.phone = "شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.";
  if (a.line.trim().length < 10) e.line = "آدرس را کامل‌تر بنویسید (خیابان، کوچه، پلاک، واحد).";
  if (!/^\d{10}$/.test(toEnDigits(a.postalCode).replace(/\D/g, ""))) e.postalCode = "کد پستی ۱۰ رقم است.";
  return e;
}

export function AddressForm({ initial, onSave, onCancel, submitLabel = "ذخیره‌ی آدرس" }: { initial: Address; onSave: (a: Address) => void | Promise<void>; onCancel?: () => void; submitLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [a, setA] = useState<Address>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const upd = (k: keyof Address) => (e: { target: { value: string } }) => setA((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setFailure("");
        const errs = validateAddress(a);
        setErrors(errs);
        if (Object.keys(errs).length === 0) {
          setBusy(true);
          try { await onSave({ ...a, phone: toEnDigits(a.phone), postalCode: toEnDigits(a.postalCode) }); }
          catch (error) { setFailure(identityError(error)); }
          finally { setBusy(false); }
        }
      }}
    >
      <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عنوان آدرس" htmlFor={`${a.id}-title`} hint="مثلاً خانه، محل کار">
          <Input id={`${a.id}-title`} value={a.title} onChange={upd("title")} />
        </Field>
        <Field label="شهر" htmlFor={`${a.id}-city`} hint="نوبر فعلاً به این شهرها ارسال دارد">
          <Select id={`${a.id}-city`} value={a.cityId} onChange={upd("cityId")}>
            {destinationCities().map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="نام تحویل‌گیرنده" htmlFor={`${a.id}-name`} error={errors.name}>
          <Input id={`${a.id}-name`} autoComplete="name" value={a.name} onChange={upd("name")} />
        </Field>
        <Field label="شماره‌ی موبایل" htmlFor={`${a.id}-phone`} error={errors.phone}>
          <Input id={`${a.id}-phone`} inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" value={a.phone} onChange={upd("phone")} />
        </Field>
      </div>
      <Field label="نشانی کامل" htmlFor={`${a.id}-line`} error={errors.line}>
        <Textarea id={`${a.id}-line`} rows={2} autoComplete="street-address" value={a.line} onChange={upd("line")} />
      </Field>
      <Field label="کد پستی" htmlFor={`${a.id}-postal`} error={errors.postalCode}>
        <Input id={`${a.id}-postal`} inputMode="numeric" dir="ltr" className="text-end sm:max-w-56" value={a.postalCode} onChange={upd("postalCode")} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : submitLabel}</Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            انصراف
          </Button>
        ) : null}
      </div>
      </fieldset>
      {failure ? <p role="alert" className="text-sm text-danger">{failure}</p> : null}
    </form>
  );
}
