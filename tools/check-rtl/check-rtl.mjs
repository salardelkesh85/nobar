// Bans physical-direction Tailwind classes in the frontends (RTL rule: use ms-/me-/ps-/pe-/start-/end-).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["apps/web", "apps/seller", "apps/admin", "packages/ui/src"];
const BANNED = /(?<![\w-])-?(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|scroll-ml|scroll-mr)-[\w[\]./%-]+|(?<![\w-])text-(?:left|right)(?![\w-])/g;
const root = process.cwd();
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name)) {
      readFileSync(p, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(/className=(?:"([^"]*)"|\{[^}]*\})|cn\(([^)]*)\)/g)) {
            for (const hit of (m[0].match(BANNED) ?? [])) problems.push(`${relative(root, p)}:${i + 1}  ${hit}`);
          }
        });
    }
  }
}

for (const r of ROOTS) walk(join(root, r));
if (problems.length) {
  console.error(`Physical-direction classes found (use logical ones):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("RTL check passed: no physical-direction classes.");
