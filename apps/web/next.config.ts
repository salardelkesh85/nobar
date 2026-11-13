import type { NextConfig } from "next";

// NEXT_EXPORT=1 builds a static site (GitHub Pages); NEXT_PUBLIC_BASE_PATH is the sub-path it is served from.
const exportMode = process.env.NEXT_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  // the product and shop pages have two versions: `page.export.tsx` (one page per demo item, static build)
  // and `page.server.tsx` (any item the API knows, server build). Only the build's own version is a page.
  pageExtensions: exportMode ? ["export.tsx", "tsx", "ts"] : ["server.tsx", "tsx", "ts"],
  // production server image (apps/web/Dockerfile)
  ...(exportMode ? {} : { output: "standalone" as const, outputFileTracingRoot: new URL("../..", import.meta.url).pathname }),
  transpilePackages: ["@nobar/ui", "@nobar/fa", "@nobar/demo", "@nobar/domain", "@nobar/contracts"],
  poweredByHeader: false,
  ...(basePath ? { basePath } : {}),
  // trailing slashes in both builds: the API links to /order/?…, /orders/?… (payment return, notices)
  trailingSlash: true,
  ...(exportMode ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default config;
