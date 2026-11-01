"use client";

import { Button, EmptyState, Skeleton } from "@nobar/ui";

export function CatalogLoading({ label = "اطلاعات بازار" }: { label?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={`در حال دریافت ${label}`}>
      <Skeleton className="h-36 w-full rounded-card" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export function CatalogFailure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-card border border-danger/25 bg-danger-soft p-5">
      <EmptyState title="دریافت اطلاعات انجام نشد" body={message} action={<Button onClick={retry}>تلاش دوباره</Button>} />
    </div>
  );
}
