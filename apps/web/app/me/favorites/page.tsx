"use client";

import { LISTINGS, search } from "@nobar/demo";
import { ButtonLink, EmptyState, Skeleton } from "@nobar/ui";
import { Heart } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { ListingGrid } from "@/components/listing-card";
import { useStore } from "@/lib/store";

export default function FavoritesPage() {
  const { ready, favorites, dest } = useStore();
  if (!ready) return <Skeleton className="h-96 w-full" />;
  const hits = search({ dest }).hits.filter((h) => favorites.includes(h.listing.id));
  const unavailable = favorites.filter((id) => !hits.some((h) => h.listing.id === id)).map((id) => LISTINGS.find((l) => l.id === id)).filter(Boolean);

  return (
    <AccountShell title="علاقه‌مندی‌ها">
      {hits.length ? (
        <ListingGrid hits={hits} />
      ) : (
        <EmptyState
          icon={<Heart className="size-10" />}
          title="هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌اید"
          body="روی قلبِ کنار هر محصول بزنید تا اینجا نگهش داریم."
          action={<ButtonLink href="/search">دیدن محصولات</ButtonLink>}
        />
      )}
      {unavailable.length ? (
        <p className="text-xs text-ink-soft">
          {unavailable.length.toLocaleString("fa-IR")} محصول دیگر در علاقه‌مندی‌های شماست که الان تا شهر مقصد تازه نمی‌رسد یا موجود نیست.
        </p>
      ) : null}
    </AccountShell>
  );
}
