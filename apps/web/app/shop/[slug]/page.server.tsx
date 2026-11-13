// Server build (production): every active shop has a page, including shops approved after the build.
// The static demo build uses page.export.tsx.
import type { Shop } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { serverApiEnabled, serverGet } from "@/lib/server-api";
import DemoPage, { generateMetadata as demoMetadata } from "./page.export";
import { ShopView } from "./view";

type Params = Promise<{ slug: string }>;
const load = (slug: string) => serverGet<{ shop: Shop }>(`shops/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!serverApiEnabled) return demoMetadata({ params });
  const d = await load(decodeSlug((await params).slug));
  return d ? { title: `${d.shop.name} — باغ‌نامه`, description: d.shop.story.title } : {};
}

export default async function Page({ params }: { params: Params }) {
  if (!serverApiEnabled) return DemoPage({ params });
  const slug = decodeSlug((await params).slug);
  const d = await load(slug);
  if (d === null) notFound();
  return <ShopView id={d?.shop.id ?? slug} />;
}
