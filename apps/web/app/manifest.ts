import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نوبر — میوه و سبزی تازه، مستقیم از باغ",
    short_name: "نوبر",
    description: "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار.",
    lang: "fa",
    dir: "rtl",
    start_url: `${BASE}/`,
    display: "standalone",
    background_color: "#f3faf5",
    theme_color: "#14532d",
    icons: [{ src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
