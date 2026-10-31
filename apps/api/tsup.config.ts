import { defineConfig } from "tsup";

// Single-file production bundle (workspace packages inlined); tsup switches to SWC for decorator metadata.
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: [/^@nobar\//],
});
