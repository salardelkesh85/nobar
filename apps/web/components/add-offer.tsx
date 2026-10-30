"use client";

import { Button } from "@nobar/ui";
import { ShoppingBasket } from "lucide-react";
import { useStore } from "@/lib/store";

export function AddOfferButton({ listingId, packageId, qty, label }: { listingId: string; packageId: string; qty: number; label: string }) {
  const { addToCart, showToast } = useStore();
  return (
    <Button
      className="mt-auto w-full"
      onClick={() => {
        addToCart({ listingId, packageId, qty });
        showToast(`${label} به سبد اضافه شد.`);
      }}
    >
      <ShoppingBasket className="size-4" aria-hidden />
      افزودن به سبد
    </Button>
  );
}
