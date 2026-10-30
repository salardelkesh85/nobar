"use client";

import { cityName } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { Button, EmptyState, Skeleton } from "@nobar/ui";
import { MapPin, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { AddressForm, emptyAddress } from "@/components/address-form";
import { useStore, type Address } from "@/lib/store";

export default function AddressesPage() {
  const { ready, addresses, saveAddress, removeAddress, dest, user, showToast } = useStore();
  const [editing, setEditing] = useState<Address | null>(null);
  if (!ready) return <Skeleton className="h-96 w-full" />;

  return (
    <AccountShell
      title="آدرس‌ها"
      action={
        !editing ? (
          <Button size="sm" onClick={() => setEditing(emptyAddress(dest, user?.name ?? "", user?.phone ?? ""))}>
            <Plus className="size-4" aria-hidden />
            آدرس جدید
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="rounded-card border border-brand/40 bg-surface p-5">
          <h2 className="mb-4 font-extrabold">{addresses.some((a) => a.id === editing.id) ? "ویرایش آدرس" : "آدرس جدید"}</h2>
          <AddressForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(a) => {
              saveAddress(a);
              setEditing(null);
              showToast("آدرس ذخیره شد.");
            }}
          />
        </div>
      ) : null}

      {addresses.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {addresses.map((a) => (
            <li key={a.id} className="flex gap-3 p-4">
              <MapPin className="mt-1 size-5 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-bold">
                  {a.title} · {cityName(a.cityId)}
                </p>
                <p className="leading-7">{a.line}</p>
                <p className="flex flex-wrap gap-x-4 text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <User className="size-4" aria-hidden />
                    {a.name}
                  </span>
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Phone className="size-4" aria-hidden />
                    {toFaDigits(a.phone)}
                  </span>
                  <span>کد پستی {toFaDigits(a.postalCode)}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => setEditing(a)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label={`ویرایش ${a.title}`}>
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeAddress(a.id);
                    showToast("آدرس حذف شد.");
                  }}
                  className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger-soft"
                  aria-label={`حذف ${a.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : !editing ? (
        <EmptyState icon={<MapPin className="size-10" />} title="هنوز آدرسی ثبت نکرده‌اید" body="آدرس‌های ذخیره‌شده موقع تکمیل خرید با یک کلیک انتخاب می‌شوند." />
      ) : null}
    </AccountShell>
  );
}
