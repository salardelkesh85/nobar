import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "./view";

export const metadata: Metadata = { title: "جستجو" };

export default function Page() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
