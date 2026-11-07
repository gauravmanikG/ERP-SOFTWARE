// npm run docs:check — keeps the Documentation module in step with the software.
//
// Fails (exit code 1) when:
//   1. a screen in the navigation (targetPage in shared/layout/modulesData.jsx) has no User Guide entry,
//   2. a guide entry points at a screen that is no longer in the navigation (stale entry),
//   3. a guide block links to a flowchart id that does not exist,
//   4. two flowcharts share an id, or a flowchart names an unknown group.
// Run it before every commit (CLAUDE.md "Documentation rule"); it needs no backend and no browser.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "src");
const { SCREEN_GUIDE, START_HERE } = await import(pathToUrl(path.join(src, "modules/documentation/content/guide.js")));
const { FLOWCHARTS, FLOW_GROUPS } = await import(pathToUrl(path.join(src, "modules/documentation/content/flowcharts.js")));

function pathToUrl(p) {
  return new URL(`file:///${p.replace(/\\/g, "/")}`).href;
}

const nav = readFileSync(path.join(src, "shared/layout/modulesData.jsx"), "utf8");
const navPages = new Set([...nav.matchAll(/targetPage:\s*"([^"]+)"/g)].map((m) => m[1]).filter((p) => !p.startsWith("docs-")));

const problems = [];
for (const page of navPages) {
  if (!SCREEN_GUIDE[page]) problems.push(`Screen "${page}" is in the navigation but has no entry in content/guide.js SCREEN_GUIDE.`);
}
for (const page of Object.keys(SCREEN_GUIDE)) {
  if (!navPages.has(page)) problems.push(`Guide entry "${page}" has no screen in the navigation any more (remove or rename it).`);
}

const flowIds = new Set();
const groupIds = new Set(FLOW_GROUPS.map((g) => g.id));
for (const f of FLOWCHARTS) {
  if (flowIds.has(f.id)) problems.push(`Flowchart id "${f.id}" is used twice.`);
  flowIds.add(f.id);
  if (!groupIds.has(f.group)) problems.push(`Flowchart "${f.id}" names unknown group "${f.group}".`);
  if (!f.code || !f.code.trim()) problems.push(`Flowchart "${f.id}" has no chart code.`);
}

const checkBlocks = (where, blocks = []) => {
  for (const b of blocks) if (b.flow && !flowIds.has(b.flow)) problems.push(`${where} links to missing flowchart "${b.flow}".`);
};
for (const [page, e] of Object.entries(SCREEN_GUIDE)) checkBlocks(`Guide "${page}"`, e.blocks);
for (const s of START_HERE) checkBlocks(`Getting Started "${s.id}"`, s.blocks);

if (problems.length) {
  console.error(`Documentation is out of date (${problems.length} problem${problems.length === 1 ? "" : "s"}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Documentation OK: ${navPages.size} screens documented, ${FLOWCHARTS.length} flowcharts, all links valid.`);
