import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nobar/ui", "@nobar/fa", "@nobar/demo"],
  poweredByHeader: false,
};

export default config;
