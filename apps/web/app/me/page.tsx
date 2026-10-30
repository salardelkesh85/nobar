"use client";

import { cityName, listingById, produceTypeById, search, shopById } from "@nobar/demo";
import { toFaDigits } from "@nobar/fa";
import { JalaliDate, Skeleton, Toman } from "@nobar/ui";
import { Bell, ChevronLeft, Heart, MapPin, Receipt, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { useStore } from "@/lib/store";

export default function MePage() {
  const { ready, orders, favorites, addresses, dest } = useStore();
  if (!ready) return <Skeleton className="h-96 w-full" />;
  const last = orders[0];
  const favHits = search({ dest }).hits.filter((h) => favorites.includes(h.listing.id));
  const tiles = [
    { href: "/orders", icon: Receipt, label: "سفارش‌ها", value: toFaDigits(orders.length) },
    { href: "/me/favorites", icon: Heart, label: "علاقه‌مندی‌ها", value: toFaDigits(favorites.length) },
    { href: "/me/addresses", icon: MapPin, label: "آدرس‌ها", value: toFaDigits(addresses.length) },
    { href: "/me", icon: Wallet, label: "کیف پول", value: <Toman rial={0} /> },
  ];

  return (
    <AccountShell title="خلاصه‌ی حساب">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ href, icon: Icon, label, value }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
              <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-xs text-ink-soft">{label}</span>
                <span className="block text-lg font-extrabold">{value}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-card border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">آخرین سفارش</h2>
          <Link href="/orders" className="inline-flex items-center text-sm font-bold text-brand hover:underline">
            همه
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </div>
        {last ? (
          <Link href={`/order?code=${last.code}`} className="flex flex-wrap items-center gap-3 rounded-control border border-line p-3 hover:border-brand">
            <div className="flex -space-x-3 space-x-reverse">
              {last.shops.flatMap((s) => s.items).slice(0, 4).map((it) => {
                const pt = produceTypeById(listingById(it.listingId)?.produceTypeId ?? "");
                return pt ? <Photo key={it.packageId} kind={pt.id} alt="" sizes="48px" className="size-12 rounded-full border-2 border-surface" fallback={{ emoji: pt.emoji, hue: pt.hue }} /> : null;
              })}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold" dir="ltr">
                {last.code}
              </p>
              <p className="text-ink-soft">
                <JalaliDate date={last.placedAt} format="datetime" /> · {cityName(last.destCityId)} · {last.shops.map((s) => shopById(s.shopId)?.name).join("، ")}
              </p>
            </div>
            <Toman rial={last.payableRial} className="font-bold" />
          </Link>
        ) : (
          <p className="text-sm text-ink-soft">هنوز سفارشی ثبت نکرده‌اید.</p>
        )}
      </section>

      {favHits.length ? (
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <h2 className="px-4 pt-4 font-extrabold">از علاقه‌مندی‌های شما</h2>
          <ListingRail hits={favHits} />
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/me/alerts" className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
          <Bell className="size-6 text-nobar" aria-hidden />
          <span className="flex-1">
            <span className="block font-bold">خبرهای «نوبر شد!»</span>
            <span className="block text-xs text-ink-soft">اولین محصول هر فصل را خبرتان می‌کنیم</span>
          </span>
          <ChevronLeft className="size-5 text-ink-soft" aria-hidden />
        </Link>
        <Link href="/about/sell" className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
          <Store className="size-6 text-brand" aria-hidden />
          <span className="flex-1">
            <span className="block font-bold">در نوبر غرفه باز کنید</span>
            <span className="block text-xs text-ink-soft">محصول باغتان را به همه‌ی ایران بفروشید</span>
          </span>
          <ChevronLeft className="size-5 text-ink-soft" aria-hidden />
        </Link>
      </div>
    </AccountShell>
  );
}
