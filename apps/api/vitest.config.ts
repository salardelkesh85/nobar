import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC keeps Nest's decorator metadata, which esbuild (vitest's default) drops.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: { testTimeout: 30_000, hookTimeout: 60_000 },
});
