import { defineConfig } from "tsup";

// Single-file production bundle (workspace packages inlined); tsup switches to SWC for decorator metadata.
// PGlite stays external: it loads its WebAssembly files from its own package folder.
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: [/^@nobar\//],
  external: ["@electric-sql/pglite"],
});
