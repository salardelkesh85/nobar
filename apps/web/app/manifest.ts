import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نوبر — میوه و سبزی تازه، مستقیم از باغ",
    short_name: "نوبر",
    description: "بازار آنلاین میوه و سبزی تازه، مستقیم از باغدار.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f3faf5",
    theme_color: "#14532d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
