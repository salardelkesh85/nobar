import type { NextConfig } from "next";

// NEXT_EXPORT=1 builds a static site (GitHub Pages); NEXT_PUBLIC_BASE_PATH is the sub-path it is served from.
const exportMode = process.env.NEXT_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nobar/ui", "@nobar/fa", "@nobar/demo"],
  poweredByHeader: false,
  ...(basePath ? { basePath } : {}),
  ...(exportMode ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
};

export default config;
