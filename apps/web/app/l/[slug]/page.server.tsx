// Server build (production): any listing the API knows has a page, including ones created after the build.
// The static demo build uses page.export.tsx.
import { DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import type { Listing, ProduceType, Shop } from "@nobar/demo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/server";
import { serverApiEnabled, serverGet } from "@/lib/server-api";
import DemoPage, { generateMetadata as demoMetadata } from "./page.export";
import { ListingView } from "./view";

type Params = Promise<{ slug: string }>;
type Detail = { listing: Listing; shop: Shop & { rating: number }; type: ProduceType; category: { id: string; name: string } };

const load = (slug: string) => serverGet<Detail>(`listings/${encodeURIComponent(slug)}?dest=${DEFAULT_CITY_ID}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!serverApiEnabled) return demoMetadata({ params });
  const d = await load(decodeSlug((await params).slug));
  return d ? { title: d.listing.title, description: `${d.listing.description.slice(0, 150)} — ${d.shop.name}` } : {};
}

export default async function Page({ params }: { params: Params }) {
  if (!serverApiEnabled) return DemoPage({ params });
  const slug = decodeSlug((await params).slug);
  const d = await load(slug);
  if (d === null) notFound();
  const jsonLd = d && {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: d.listing.title,
        description: d.listing.description,
        brand: { "@type": "Brand", name: d.shop.name },
        offers: d.listing.packages.map((p) => ({ "@type": "Offer", name: p.label, priceCurrency: "IRR", price: String(p.priceRial), availability: "https://schema.org/InStock" })),
        ...(d.shop.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: d.shop.ratingAvg, reviewCount: d.shop.ratingCount } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "نوبر", item: "/" },
          { "@type": "ListItem", position: 2, name: d.category.name, item: `/search?cat=${d.category.id}` },
          { "@type": "ListItem", position: 3, name: d.type.name, item: `/p/${d.type.id}` },
        ],
      },
    ],
  };
  return (
    <>
      {/* "<" escaped so seller text cannot close the script element */}
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /> : null}
      <ListingView id={d?.listing.id ?? slug} />
    </>
  );
}
