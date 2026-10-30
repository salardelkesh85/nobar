// Demo photos (Wikimedia Commons, free licences — see /about/credits). They stand in for the sellers'
// own photos until the media module exists; listing pages say so.

const PRODUCE_PHOTOS = new Set([
  "apple-red", "apple-yellow", "pomegranate", "grape-white", "grape-black", "quince", "persimmon", "kiwi",
  "tangerine", "orange", "sweet-lime", "dates-mazafati", "walnut", "barberry", "tomato", "cucumber",
  "eggplant", "potato", "onion", "pumpkin", "herbs", "spinach",
]);

export type BannerPhoto = "banner-orchard" | "banner-market" | "banner-pomegranate" | "banner-harvest";

// next/image does not add basePath to string sources, so prefix it here (static hosting under /nobar).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const photoSrc = (kind: string): string | null => (PRODUCE_PHOTOS.has(kind) ? `${BASE}/photos/${kind}.webp` : null);
export const bannerSrc = (name: BannerPhoto): string => `${BASE}/photos/${name}.webp`;
