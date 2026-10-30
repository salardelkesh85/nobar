"use client";

import { freshnessOf, harvestPhrase, packageGrams, PRICE_POSITION_FA, pricePerKg, pricePosition, produceTypeById } from "@nobar/demo";
import { formatFaNumber, formatToman, formatWeight, toEnDigits } from "@nobar/fa";
import { Badge, Button, ButtonLink, Card, cn, FreshnessBadge, Input, Skeleton } from "@nobar/ui";
import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { Photo } from "@/components/photo";
import { useSeller } from "@/lib/state";

export default function ProductsPage() {
  const { ready, listings } = useSeller();
  if (!ready) return <Skeleton className="h-96 w-full" />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black">محصولات</h1>
        <ButtonLink href="/products/new">
          <Plus className="size-5" aria-hidden />
          محصول تازه
        </ButtonLink>
      </div>
      <p className="text-sm text-ink-soft">قیمت و موجودی را همین‌جا عوض کنید. تغییر قیمت بیش از ۳۰٪ در یک روز، دوباره بررسی می‌شود.</p>
      <ul className="space-y-3">
        {listings.map((l) => (
          <li key={l.id}>
            <ProductRow id={l.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductRow({ id }: { id: string }) {
  const { listings, updateListing, showToast } = useSeller();
  const l = listings.find((x) => x.id === id)!;
  const pt = produceTypeById(l.produceTypeId)!;
  const fresh = freshnessOf(l);
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(l.packages.map((p) => [p.id, String(p.priceRial / 10)])));
  const unitGrams = packageGrams(l.packages[0]!);
  const [stock, setStock] = useState(String(Math.round(l.stockBase / 1000)));
  const pos = pricePosition(l);

  const save = () => {
    const parsed: Record<string, number> = {};
    for (const p of l.packages) {
      const toman = Number(toEnDigits(prices[p.id] ?? "").replace(/[^\d]/g, ""));
      if (!toman) return showToast("قیمت را به تومان و فقط با عدد بنویسید.");
      const old = p.priceRial / 10;
      if (Math.abs(toman - old) / old > 0.3) showToast("تغییر قیمت بیش از ۳۰٪ است؛ آگهی برای بررسی می‌رود.");
      parsed[p.id] = toman * 10;
    }
    const kg = Number(toEnDigits(stock).replace(/[^\d]/g, ""));
    updateListing(l.id, { prices: parsed, stockBase: kg * 1000 });
    showToast("ذخیره شد.");
  };

  return (
    <Card className={cn("p-4", l.paused && "opacity-70")}>
      <div className="flex gap-3">
        <Photo kind={pt.id} alt="" className="size-16 shrink-0 rounded-control" />
        <div className="flex-1">
          <p className="font-bold">{l.title}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <FreshnessBadge level={fresh.badge} detail={harvestPhrase(fresh)} />
            <Badge tone={pos === "ABOVE" ? "saffron" : pos === "UNKNOWN" ? "neutral" : "brand"}>{PRICE_POSITION_FA[pos]}</Badge>
            {l.paused ? <Badge tone="danger">متوقف</Badge> : <Badge tone="neutral">فعال</Badge>}
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            موجودی {formatWeight(l.stockBase)} · حدود {formatFaNumber(Math.floor(l.stockBase / unitGrams))} × {l.packages[0]!.label}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {l.packages.map((p) => {
          const v = Number(toEnDigits(prices[p.id] ?? "").replace(/[^\d]/g, "")) * 10;
          return (
            <label key={p.id} className="text-sm font-bold">
              قیمت {p.label} (تومان)
              <Input inputMode="numeric" value={prices[p.id]} onChange={(e) => setPrices((s) => ({ ...s, [p.id]: e.target.value }))} className="mt-1" />
              {p.netGrams && v ? <span className="mt-1 block text-xs font-normal text-ink-soft">هر کیلو {formatToman(pricePerKg(v, p.netGrams))}</span> : null}
            </label>
          );
        })}
        <label className="text-sm font-bold">
          موجودی (کیلو)
          <Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={save}>
          <Save className="size-4" aria-hidden />
          ذخیره
        </Button>
        <Button variant="secondary" onClick={() => { updateListing(l.id, { paused: !l.paused }); showToast(l.paused ? "دوباره فعال شد." : "فروش متوقف شد."); }}>
          {l.paused ? "فعال کردن" : "توقف فروش"}
        </Button>
      </div>
    </Card>
  );
}
