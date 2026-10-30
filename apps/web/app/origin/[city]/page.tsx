import { CITIES, cityById } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { OriginView } from "./view";

type Params = Promise<{ city: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = cityById(decodeSlug((await params).city));
  return c ? { title: `محصولات ${c.name}، مستقیم از باغ` } : {};
}

export default async function Page({ params }: { params: Params }) {
  const x = cityById(decodeSlug((await params).city));
  if (!x) notFound();
  return <OriginView id={x.id} />;
}
