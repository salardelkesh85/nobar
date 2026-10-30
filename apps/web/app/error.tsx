"use client";

import { Button, EmptyState } from "@nobar/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={<span aria-hidden>🌧️</span>}
      title="مشکلی پیش آمد"
      body="لطفاً دوباره امتحان کنید. اگر تکرار شد، چند دقیقه بعد سر بزنید."
      action={<Button onClick={reset}>دوباره امتحان کن</Button>}
    />
  );
}
