// Next.js static export writes route-segment prefetch files as nested folders
// (e.g. `cart/__next.cart/__PAGE__.txt`) while the client requests the dotted name
// (`cart/__next.cart.__PAGE__.txt`). Static hosts like GitHub Pages cannot rewrite, so copy
// each nested file to its dotted name. Usage: node flatten-segments.mjs <out-dir>
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("usage: flatten-segments.mjs <out-dir>");
let copied = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) flatten(p, dir, name);
    else walk(p);
  }
}

// Copy every file below `segDir` to `<parent>/<segName>.<rest with "/" → ".">`.
function flatten(segDir, parent, prefix) {
  for (const name of readdirSync(segDir)) {
    const p = join(segDir, name);
    if (statSync(p).isDirectory()) flatten(p, parent, `${prefix}.${name}`);
    else {
      copyFileSync(p, join(parent, `${prefix}.${name}`));
      copied++;
    }
  }
}

walk(root);
console.log(`flatten-segments: ${copied} files in ${root}`);
