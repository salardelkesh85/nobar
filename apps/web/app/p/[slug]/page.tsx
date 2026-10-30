import { PRODUCE_TYPES, produceTypeBySlug } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { ProduceTypeView } from "./view";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return PRODUCE_TYPES.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pt = produceTypeBySlug(decodeSlug((await params).slug));
  return pt ? { title: `خرید ${pt.name} از باغ`, description: `همه‌ی پیشنهادهای ${pt.name} با قیمت هر کیلو و هزینه‌ی ارسال تا شهر شما.` } : {};
}

export default async function Page({ params }: { params: Params }) {
  const x = produceTypeBySlug(decodeSlug((await params).slug));
  if (!x) notFound();
  return <ProduceTypeView id={x.id} />;
}
