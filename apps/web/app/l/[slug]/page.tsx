import { categoryById, cityName, LISTINGS, listingBySlug, produceTypeById, shopById } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { ListingView } from "./view";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return LISTINGS.map((l) => ({ slug: l.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = listingBySlug(decodeSlug((await params).slug));
  if (!l) return {};
  const shop = shopById(l.shopId);
  return { title: l.title, description: `${l.description} از ${shop?.name}، ${cityName(l.originCityId)}.` };
}

export default async function Page({ params }: { params: Params }) {
  const l = listingBySlug(decodeSlug((await params).slug));
  if (!l) notFound();
  const shop = shopById(l.shopId)!;
  const pt = produceTypeById(l.produceTypeId)!;
  const cat = categoryById(pt.categoryId);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: l.title,
        description: l.description,
        brand: { "@type": "Brand", name: shop.name },
        offers: l.packages.map((p) => ({ "@type": "Offer", name: p.label, priceCurrency: "IRR", price: String(p.priceRial), availability: "https://schema.org/InStock" })),
        aggregateRating: { "@type": "AggregateRating", ratingValue: shop.ratingAvg, reviewCount: shop.ratingCount },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "نوبر", item: "/" },
          { "@type": "ListItem", position: 2, name: cat?.name, item: `/search?cat=${cat?.id}` },
          { "@type": "ListItem", position: 3, name: pt.name, item: `/p/${pt.id}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingView id={l.id} />
    </>
  );
}
