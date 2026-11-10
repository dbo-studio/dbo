import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs one `run-e2e.mjs --project=<engine>` per engine, several at a time. Every run has its own
 * ephemeral backend, frontend, ports and output dir, so engines never share app state; tests inside
 * one engine stay serial because they share that engine's sample database.
 *
 *   npm run test:parallel                          all engines
 *   npm run test:parallel -- --projects=mysql,sqlite
 *   E2E_JOBS=2 npm run test:parallel               concurrency (default 3)
 *   npm run test:parallel -- --shards=sqlite:4,mysql:2   split an engine into N Playwright shards, each with its own stack
 *   npm run test:parallel -- -g "export"           anything else goes to Playwright
 *
 * Shards of one engine share that engine's sample DB, so only shard where tests do not collide.
 * Default: sqlite:3 (every sqlite test uses its own temp file). Use --shards= (empty) for none.
 */
const ALL = ["sqlite", "postgres", "mysql", "mssql", "clickhouse", "redis", "mongo"]; // slowest first
const here = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const pick = args.find((a) => a.startsWith("--projects="));
const shardArg = args.find((a) => a.startsWith("--shards="));
const passthrough = args.filter((a) => a !== pick && a !== shardArg);
const engines = pick ? pick.slice("--projects=".length).split(",").filter(Boolean) : ALL;
const unknown = engines.filter((e) => !ALL.includes(e));
if (unknown.length) {
  console.error(`[parallel] unknown project: ${unknown.join(", ")} (known: ${ALL.join(", ")})`);
  process.exit(2);
}

const shards = Object.fromEntries(
  (shardArg ? shardArg.slice("--shards=".length) : "sqlite:3")
    .split(",")
    .filter(Boolean)
    .map((p) => {
      const [e, n] = p.split(":");
      if (!ALL.includes(e) || !(Number(n) >= 1)) {
        console.error(`[parallel] bad --shards entry "${p}" (use engine:count)`);
        process.exit(2);
      }
      return [e, Number(n)];
    }),
);
// One work item per engine shard, engines kept slowest first.
const items = engines.flatMap((engine) =>
  Array.from({ length: shards[engine] ?? 1 }, (_, i) => {
    const n = shards[engine] ?? 1;
    return { engine, label: n > 1 ? `${engine} ${i + 1}/${n}` : engine, shard: n > 1 ? [`--shard=${i + 1}/${n}`] : [] };
  }),
);

const jobs = Math.max(1, Number(process.env.E2E_JOBS) || 3);
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "dbo-e2e-parallel-"));
const hasReporter = passthrough.some((a) => a.startsWith("--reporter"));
const tally = {}; // engine -> { ok, bad } live test counts
const children = new Set();
const results = [];

function runEngine({ engine, label, shard }) {
  const key = label.replace(/\W+/g, "-");
  return new Promise((resolve) => {
    const started = Date.now();
    const log = fs.createWriteStream(path.join(outDir, `${key}.log`));
    const child = spawn(
      "node",
      [
        path.join(here, "run-e2e.mjs"),
        `--project=${engine}`,
        `--output=${path.join(outDir, `${key}-results`)}`,
        ...shard,
        ...(hasReporter ? [] : ["--reporter=list"]),
        ...passthrough,
      ],
      { env: { ...process.env, PLAYWRIGHT_MAX_FAILURES: process.env.PLAYWRIGHT_MAX_FAILURES ?? "0" } },
    );
    children.add(child);
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    // Live progress: one line per finished test, prefixed with engine and running totals.
    let total = "?";
    try {
      const out = execFileSync("npx", ["playwright", "test", "--list", `--project=${engine}`, ...shard, ...passthrough.filter((a) => !a.startsWith("--reporter"))], { cwd: path.join(here, ".."), encoding: "utf8" });
      total = out.match(/Total: (\d+) tests?/)?.[1] ?? "?";
    } catch {}
    console.log(`[${label}] starting stack, ${total} tests`);
    const t = (tally[label] = { ok: 0, bad: 0 });
    let buf = "";
    child.stdout.on("data", (d) => {
      const lines = (buf + d).split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const m = line.match(/^\s*([✓✘-])\s+\d+\s+(.*)$/);
        if (!m) continue;
        if (m[1] === "✓") t.ok++;
        else if (m[1] === "✘") t.bad++;
        else continue;
        console.log(`[${label} ${t.ok + t.bad}/${total}${t.bad ? ` ${t.bad}✘` : ""}] ${m[1]} ${m[2].replace(/^\[[^\]]*\] › /, "")}`);
      }
    });
    child.on("close", (code) => {
      children.delete(child);
      const text = fs.readFileSync(path.join(outDir, `${key}.log`), "utf8");
      const count = (word) => Number(text.match(new RegExp(`^\\s+(\\d+) ${word}`, "m"))?.[1] ?? 0);
      const r = { engine: label, code: code ?? 1, passed: count("passed"), failed: count("failed"), secs: Math.round((Date.now() - started) / 1000) };
      results.push(r);
      console.log(`[parallel] ${r.code === 0 ? "PASS" : "FAIL"} ${label}: ${r.passed} passed, ${r.failed} failed (${r.secs}s)  ${outDir}/${key}.log`);
      resolve();
    });
  });
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    children.forEach((c) => c.kill(sig));
    setTimeout(() => process.exit(130), 3000).unref();
  });
}

console.log(`[parallel] ${items.map((i) => i.label).join(", ")} — ${jobs} at a time, logs in ${outDir}`);
const queue = [...items];
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length) await runEngine(queue.shift());
  }),
);

const bad = results.filter((r) => r.code !== 0);
console.log(bad.length ? `[parallel] ${bad.length} of ${results.length} failed: ${bad.map((r) => r.engine).join(", ")}` : `[parallel] all ${results.length} passed`);
process.exit(bad.length ? 1 : 0);
