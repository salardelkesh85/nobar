import { SHOPS, shopBySlug } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { ShopView } from "./view";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return SHOPS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = shopBySlug(decodeSlug((await params).slug));
  return s ? { title: `${s.name} — باغ‌نامه`, description: s.story.title } : {};
}

export default async function Page({ params }: { params: Params }) {
  const x = shopBySlug(decodeSlug((await params).slug));
  if (!x) notFound();
  return <ShopView id={x.id} />;
}
