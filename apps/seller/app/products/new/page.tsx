"use client";

import { marketStat, PRODUCE_TYPES, pricePerKg } from "@nobar/demo";
import { formatToman, toEnDigits } from "@nobar/fa";
import { Button, Card, Field, Input, Select, Textarea } from "@nobar/ui";
import { Camera, CircleCheck, ImagePlus, Mic, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSeller } from "@/lib/state";

interface Draft {
  produceTypeId: string;
  title: string;
  variety: string;
  grade: string;
  harvestedAt: string;
  description: string;
  organic: boolean;
  packages: Array<{ label: string; kg: string; price: string }>;
}

const EMPTY: Draft = {
  produceTypeId: "apple-red",
  title: "",
  variety: "",
  grade: "GRADE_1",
  harvestedAt: "",
  description: "",
  organic: false,
  packages: [{ label: "کارتن ۵ کیلویی", kg: "5", price: "" }],
};
const num = (s: string) => Number(toEnDigits(s).replace(/[^\d.]/g, ""));

export default function NewProductPage() {
  const { showToast } = useSeller();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // drafts are saved automatically (seller works one-handed in the orchard)
  useEffect(() => {
    try {
      const d = localStorage.getItem("seller_draft");
      if (d) setDraft(JSON.parse(d) as Draft);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("seller_draft", JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const stat = marketStat(draft.produceTypeId);

  if (sent)
    return (
      <Card className="mx-auto max-w-lg space-y-3 p-8 text-center">
        <CircleCheck className="mx-auto size-14 text-brand" aria-hidden />
        <h1 className="text-xl font-black">برای بررسی فرستاده شد</h1>
        <p className="text-ink-soft">کارشناس نوبر معمولاً تا چند ساعت آگهی را بررسی می‌کند. بعد از تأیید، محصول در فروشگاه دیده می‌شود.</p>
        <Button onClick={() => { setSent(false); setDraft(EMPTY); setPhotos([]); }}>ثبت محصول دیگر</Button>
      </Card>
    );

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (photos.length < 2) return showToast("دست‌کم دو عکس واقعی از محصول لازم است.");
        if (!draft.title.trim() || !draft.harvestedAt) return showToast("عنوان و تاریخ برداشت را بنویسید.");
        if (draft.packages.some((p) => !num(p.price) || !num(p.kg))) return showToast("وزن و قیمت هر بسته را کامل کنید.");
        localStorage.removeItem("seller_draft");
        setSent(true);
      }}
    >
      <div>
        <h1 className="text-2xl font-black">محصول تازه</h1>
        <p className="text-sm text-ink-soft">پیش‌نویس خودکار ذخیره می‌شود؛ هر وقت برگردید، همین‌جاست.</p>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="font-extrabold">۱. عکس بگیرید</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 8 - photos.length);
            setPhotos((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-control bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`عکس ${i + 1}`} className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== src))} className="absolute end-1 top-1 grid size-8 place-items-center rounded-full bg-ink/70 text-bg" aria-label={`حذف عکس ${i + 1}`}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-brand/50 text-brand hover:bg-brand-soft">
            {photos.length ? <ImagePlus className="size-8" aria-hidden /> : <Camera className="size-8" aria-hidden />}
            <span className="text-xs font-bold">{photos.length ? "عکس دیگر" : "گرفتن عکس"}</span>
          </button>
        </div>
        <p className="text-xs text-ink-soft">دست‌کم دو عکس واقعی در نور طبیعی؛ عکس اینترنتی پذیرفته نمی‌شود. موقعیت مکانی از عکس پاک می‌شود.</p>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-soft">
          <Mic className="size-6" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="font-bold">بگویید، باغبون می‌نویسد</p>
          <p className="text-sm text-ink-soft">ثبت محصول با پیام صوتی در نسخه‌ی بعدی فعال می‌شود. فعلاً فرم زیر را پر کنید.</p>
        </div>
        <Button variant="secondary" disabled>
          به‌زودی
        </Button>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-extrabold">۲. درباره‌ی محصول</h2>
        <Field label="نوع محصول" htmlFor="pt">
          <Select id="pt" value={draft.produceTypeId} onChange={(e) => set("produceTypeId", e.target.value)}>
            {PRODUCE_TYPES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="عنوان" htmlFor="title" hint="مثلاً: سیب قرمز رد دلیشز میاندوآب">
          <Input id="title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="رقم" htmlFor="variety">
            <Input id="variety" value={draft.variety} onChange={(e) => set("variety", e.target.value)} />
          </Field>
          <Field label="درجه" htmlFor="grade">
            <Select id="grade" value={draft.grade} onChange={(e) => set("grade", e.target.value)}>
              <option value="PREMIUM">ممتاز</option>
              <option value="GRADE_1">درجه‌یک</option>
              <option value="GRADE_2">درجه‌دو</option>
              <option value="PROCESSING">آبمیوه‌ای / صنعتی</option>
            </Select>
          </Field>
          <Field label="تاریخ برداشت" htmlFor="harvest" hint="تازه‌سنج از همین حساب می‌شود">
            <Input id="harvest" type="date" value={draft.harvestedAt} onChange={(e) => set("harvestedAt", e.target.value)} />
          </Field>
        </div>
        <Field label="توضیح کوتاه" htmlFor="desc">
          <Textarea id="desc" rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.organic} onChange={(e) => set("organic", e.target.checked)} className="size-5 accent-[var(--brand)]" />
          ادعای ارگانیک دارم (گواهی لازم است و بررسی می‌شود)
        </label>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-extrabold">۳. بسته‌ها و قیمت</h2>
        {stat ? (
          <p className="rounded-control bg-brand-soft p-3 text-sm">
            قیمت رایج هر کیلو در نوبر: {formatToman(stat.p25)} تا {formatToman(stat.p75)} (میانه {formatToman(stat.median)})
          </p>
        ) : null}
        {draft.packages.map((p, i) => {
          const perKg = num(p.price) && num(p.kg) ? pricePerKg(num(p.price) * 10, Math.round(num(p.kg) * 1000)) : null;
          const upd = (k: "label" | "kg" | "price", v: string) => set("packages", draft.packages.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
          return (
            <div key={i} className="grid gap-3 rounded-control border border-line p-3 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-end">
              <Field label="نام بسته" htmlFor={`pl-${i}`}>
                <Input id={`pl-${i}`} value={p.label} onChange={(e) => upd("label", e.target.value)} />
              </Field>
              <Field label="وزن (کیلو)" htmlFor={`pk-${i}`}>
                <Input id={`pk-${i}`} inputMode="decimal" value={p.kg} onChange={(e) => upd("kg", e.target.value)} />
              </Field>
              <Field label="قیمت (تومان)" htmlFor={`pp-${i}`} hint={perKg ? `هر کیلو ${formatToman(perKg)}` : undefined}>
                <Input id={`pp-${i}`} inputMode="numeric" value={p.price} onChange={(e) => upd("price", e.target.value)} />
              </Field>
              {draft.packages.length > 1 ? (
                <button type="button" onClick={() => set("packages", draft.packages.filter((_, j) => j !== i))} className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-danger-soft hover:text-danger" aria-label="حذف بسته">
                  <Trash2 className="size-5" />
                </button>
              ) : null}
            </div>
          );
        })}
        {draft.packages.length < 5 ? (
          <Button variant="ghost" onClick={() => set("packages", [...draft.packages, { label: "یک کیلو", kg: "1", price: "" }])}>
            <Plus className="size-4" aria-hidden />
            بسته‌ی دیگر
          </Button>
        ) : null}
      </Card>

      <Button type="submit" size="lg" className="w-full">
        فرستادن برای بررسی
      </Button>
    </form>
  );
}
