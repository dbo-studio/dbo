import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Chat perf (docs/development/frontend-performance.md B8, B9). Opt-in: PERF=1. See perf-baseline.spec.ts for how to run. */
test.skip(process.env.PERF !== "1", "perf only");

const OUT = process.env.PERF_OUT ?? path.resolve(__dirname, "../../perf-results.jsonl");

function record(id: string, metrics: Record<string, number | string>) {
  fs.appendFileSync(OUT, JSON.stringify({ id, ...metrics, at: new Date().toISOString() }) + "\n");
  console.log(`[perf] ${id} ${JSON.stringify(metrics)}`);
}

const sql = Array.from({ length: 120 }, (_, i) => `SELECT col_${i}, other_${i} FROM table_${i} WHERE id = ${i};`).join("\n");
const table = ["| id | name | value |", "| --- | --- | --- |", ...Array.from({ length: 25 }, (_, i) => `| ${i} | name_${i} | ${i * 7} |`)].join("\n");
const streamText = `## Streaming answer\n\n${Array.from({ length: 12 }, (_, i) => `Paragraph ${i} with **bold** text and \`inline code\` and enough words to wrap across the panel width a couple of times.`).join("\n\n")}\n\n\`\`\`sql\n${sql}\n\`\`\`\n\n${table}\n\nDone.`;

async function observers(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __long: number; __frames: number[]; __mut: number };
    w.__long = 0;
    w.__frames = [];
    w.__mut = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__long += e.duration))).observe({ type: "longtask" });
    new MutationObserver((r) => (w.__mut += r.length)).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    let last = performance.now();
    const tick = (n: number) => {
      w.__frames.push(n - last);
      last = n;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const read = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __long: number; __frames: number[]; __mut: number };
    const s = [...w.__frames].sort((a, b) => a - b);
    return {
      longTaskMs: Math.round(w.__long),
      frameP95: Math.round(s[Math.floor(s.length * 0.95)] ?? 0),
      framesOver50: s.filter((f) => f > 50).length,
      mutations: w.__mut,
    };
  });

async function heapMb(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  await cdp.detach();
  return Math.round((metrics.find((m) => m.name === "JSHeapUsedSize")!.value / 1048576) * 10) / 10;
}

test("B8 B9 chat streaming and long conversation", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `perf-chat-${suffix}`;
  const dbPath = `/tmp/dbo-e2e-perf-chat-${suffix}.db`;
  ensureSqliteDbFile(dbPath);
  const llm = new FakeLlm();
  const llmUrl = await llm.start();

  try {
    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const settingsPage = new SettingsPage(page);
      const composer = page.getByTestId("ai-chat-input");
      const send = async (text: string) => {
        await composer.fill(text);
        await composer.press("Enter");
      };

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await settingsPage.openRightSidebar();
      await page.getByTestId("ai-empty-quick-setup").click();
      await expect(settingsPage.aiSetupForm()).toBeVisible({ timeout: 15000 });
      await saveAiSetup(page, "sk-e2e-fake-key");
      await pointProviderAtFakeLlm(page, llmUrl);
      await page.getByTestId("ai-expand-to-agent").click();
      await observers(page);
      const cpu = Number(process.env.PERF_CPU ?? 1);
      if (cpu > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
      }

      // B9: one long streamed answer
      llm.reply = { text: streamText, wordDelayMs: 8 };
      const s0 = Date.now();
      await send("stream");
      await expect(page.getByTestId("ai-message").filter({ hasText: "Done." })).toHaveCount(1, { timeout: 120000 });
      const streamMs = Date.now() - s0;
      await page.waitForTimeout(500);
      record("B9", { cpuSlowdown: Number(process.env.PERF_CPU ?? 1), words: (streamText.match(/\S+\s*/g) ?? []).length, streamMs, ...(await read(page)) });

      // B8: long conversation, 40 more turns
      llm.reply = { text: "Short reply with a little text.\n\n```sql\nSELECT 1;\n```", wordDelayMs: 0 };
      for (let i = 0; i < 40; i++) {
        await send(`question ${i}`);
        await expect(page.getByTestId("ai-message").filter({ hasText: "Short reply" })).toHaveCount(i + 1, { timeout: 60000 });
      }
      await page.waitForTimeout(1000);
      const dom = await page.evaluate(() => document.getElementsByTagName("*").length);
      const scroller = page.locator("[data-density]");
      const j0 = Date.now();
      await scroller.evaluate((el) => (el.scrollTop = 0));
      await page.waitForTimeout(100);
      await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
      await page.waitForTimeout(100);
      record("B8", { cpuSlowdown: Number(process.env.PERF_CPU ?? 1), turns: 41, dom, heapMb: await heapMb(page), scrollRoundTripMs: Date.now() - j0 - 200 });
    });
  } finally {
    await llm.stop();
    removeSqliteDbFile(dbPath);
  }
});
