import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "./view";

export const metadata: Metadata = { title: "مقایسه‌گر" };

export default function Page() {
  return (
    <Suspense>
      <CompareView />
    </Suspense>
  );
}
