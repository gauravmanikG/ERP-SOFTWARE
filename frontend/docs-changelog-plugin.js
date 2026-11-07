// Vite plugin for the Documentation module's "What's new" page.
//
// Exposes `virtual:docs-changelog` = { branch, head, generatedAt, commits: [{ hash, date, author, subject, body }] }
// read from the repository's git history. In `npm run dev` it watches .git/logs/HEAD, so a new commit, merge or
// branch switch refreshes the page immediately. In `npm run build` the history is captured at build time.
// Without git (for example a Docker build without the .git folder) it returns an empty list instead of failing.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const VIRTUAL_ID = "virtual:docs-changelog";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const MAX_COMMITS = 80;
const FIELD = "\x1f";
const RECORD = "\x1e";

function git(repoRoot, args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function readChangelog(repoRoot) {
  try {
    const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const head = git(repoRoot, ["rev-parse", "--short", "HEAD"]);
    const raw = git(repoRoot, [
      "log", `-n${MAX_COMMITS}`, "--date=iso-strict",
      `--pretty=format:%h${FIELD}%ad${FIELD}%an${FIELD}%s${FIELD}%b${RECORD}`
    ]);
    const commits = raw.split(RECORD).map((r) => r.trim()).filter(Boolean).map((r) => {
      const [hash, date, author, subject, body = ""] = r.split(FIELD);
      // Drop trailer lines (Co-Authored-By etc.) from the body shown to users.
      const cleanBody = body.split("\n").filter((l) => !/^[A-Za-z-]+-By:/.test(l.trim())).join("\n").trim();
      return { hash, date, author, subject, body: cleanBody };
    });
    return { branch, head, generatedAt: new Date().toISOString(), commits };
  } catch {
    return { branch: null, head: null, generatedAt: new Date().toISOString(), commits: [] };
  }
}

export default function docsChangelog() {
  let repoRoot = process.cwd();
  return {
    name: "docs-changelog",
    configResolved(config) {
      repoRoot = path.resolve(config.root, "..");
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(readChangelog(repoRoot))};`;
    },
    configureServer(server) {
      const headLog = path.join(repoRoot, ".git", "logs", "HEAD");
      if (!existsSync(headLog)) return;
      server.watcher.add(headLog);
      server.watcher.on("change", (file) => {
        if (path.resolve(file) !== path.resolve(headLog)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      });
    }
  };
}
