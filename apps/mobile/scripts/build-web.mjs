// Builds the store as a static site for the app: no base path, app mode on, then flattens the route-segment
// files the same way the GitHub Pages build does (tools/static-export/flatten-segments.mjs).
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const env = { ...process.env, NEXT_EXPORT: "1", NEXT_PUBLIC_APP: "1", NEXT_PUBLIC_BASE_PATH: "", NEXT_TELEMETRY_DISABLED: "1" };
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, env, stdio: "inherit", shell: process.platform === "win32" });

run("pnpm", ["--filter", "@nobar/web", "build"]);
run("node", ["tools/static-export/flatten-segments.mjs", "apps/web/out"]);
