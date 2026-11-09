import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED, EXEMPT } from "../coverage/capabilities.mjs";

/**
 * Guard: every shared suite (helpers/*Suite define*Tests) must run on every engine that
 * requires it, or be listed in EXEMPT with a reason. Fails on a silent gap, a stale exemption
 * (pair is covered now) or a suite missing from REQUIRED.
 *
 *   node scripts/check-coverage.mjs           check
 *   node scripts/check-coverage.mjs --print   print the current engine -> suites map
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// tests/shared runs under the postgres project, so its suites count for pg.
const DIRS = { pg: ["pg", "shared"], mysql: ["mysql"], sqlite: ["sqlite"], mssql: ["mssql"], clickhouse: ["clickhouse"] };

const used = {};
for (const [engine, dirs] of Object.entries(DIRS)) {
  used[engine] = new Set();
  for (const d of dirs) {
    const dir = path.join(root, "tests", d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".spec.ts"))) {
      for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/\b(define\w+Tests?)\(/g)) used[engine].add(m[1]);
    }
  }
}

if (process.argv.includes("--print")) {
  for (const [e, s] of Object.entries(used)) console.log(e, [...s].sort().join(" "));
  process.exit(0);
}

const defined = new Set();
for (const f of fs.readdirSync(path.join(root, "helpers"))) {
  for (const m of fs.readFileSync(path.join(root, "helpers", f), "utf8").matchAll(/^export (?:async )?function (define\w+Tests?)\b/gm)) defined.add(m[1]);
}

const errors = [];
for (const s of defined) if (!REQUIRED[s]) errors.push(`suite ${s} is not in REQUIRED (coverage/capabilities.mjs)`);
for (const [suite, engines] of Object.entries(REQUIRED)) {
  if (!defined.has(suite)) errors.push(`REQUIRED lists unknown suite ${suite}`);
  for (const e of engines) {
    const covered = used[e]?.has(suite);
    const exempt = EXEMPT[suite]?.[e];
    if (!covered && !exempt) errors.push(`GAP: ${suite} not run on ${e}`);
    if (covered && exempt) errors.push(`STALE exemption: ${suite} on ${e} is covered, remove it from EXEMPT`);
  }
  for (const e of Object.keys(EXEMPT[suite] ?? {})) if (!engines.includes(e)) errors.push(`EXEMPT ${suite}/${e} is not a required pair`);
}

// NoSQL drivers: every capability and tool the backend driver declares must be tagged by a spec in tests/<driver>/
// with a header line such as `// @cap: Insert Edit @tool: CLI`. Source of truth is the Go driver, not a list here.
const NOSQL = { redis: "redis/redis.go", mongo: "mongo/mongo.go" };
const repoRoot = path.resolve(root, "..");
for (const [driver, rel] of Object.entries(NOSQL)) {
  const src = fs.readFileSync(path.join(repoRoot, "backend/internal/database", rel), "utf8");
  const declared = (re) => new Set([...(src.match(re)?.[0].split("{")[1] ?? "").matchAll(/contract\.(?:Cap|Tool)(\w+)/g)].map((m) => m[1]));
  const caps = declared(/Capabilities:\s*\[\]contract\.Capability\{[^}]*\}/);
  const tools = declared(/Tools:\s*\[\]contract\.ToolID\{[^}]*\}/);
  if (!caps.size) errors.push(`${driver}: could not read Capabilities from ${rel}`);
  const tagged = { cap: new Set(), tool: new Set() };
  const dir = path.join(root, "tests", driver);
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".spec.ts"))) {
    const head = fs.readFileSync(path.join(dir, f), "utf8").split("\n").find((l) => l.includes("@cap:")) ?? "";
    const [capPart, toolPart = ""] = head.split("@tool:");
    capPart.replace(/.*@cap:/, "").trim().split(/\s+/).filter(Boolean).forEach((c) => tagged.cap.add(c));
    toolPart.trim().split(/\s+/).filter(Boolean).forEach((t) => tagged.tool.add(t));
  }
  for (const c of caps) if (!tagged.cap.has(c)) errors.push(`GAP: ${driver} declares capability ${c} but no spec is tagged @cap: ${c}`);
  for (const t of tools) if (!tagged.tool.has(t)) errors.push(`GAP: ${driver} declares tool ${t} but no spec is tagged @tool: ${t}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const todo = Object.values(EXEMPT).flatMap((m) => Object.values(m)).filter((r) => r.startsWith("TODO")).length;
console.log(`coverage ok: ${Object.keys(REQUIRED).length} suites, ${todo} TODO exemptions`);
