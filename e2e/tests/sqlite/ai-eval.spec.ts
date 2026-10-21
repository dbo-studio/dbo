import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/**
 * Real-model evaluation: scripted agent tasks against a real provider, scored
 * from the tools the model called and what changed. Not part of CI; it only
 * runs when a provider is given, for example a local Ollama:
 *
 *   AI_EVAL_URL=http://localhost:11434/v1 AI_EVAL_MODELS=qwen2.5:7b \
 *     npm test -- --project=sqlite tests/sqlite/ai-eval.spec.ts
 *
 * AI_EVAL_KEY is the API key (optional for local models). AI_EVAL_MODELS is a
 * comma-separated list. The report lands in test-results/ai-eval.md.
 */
const url = process.env.AI_EVAL_URL;
const models = (process.env.AI_EVAL_MODELS ?? "")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

type StreamEvent = {
  type: string;
  label?: string;
  content?: string;
  message?: string;
  messages?: Array<{ content: string }>;
};
type Run = {
  tools: string[];
  errors: string[];
  answer: string;
  chatId?: number;
  ms: number;
};
type EvalTask = {
  name: string;
  prompt: string;
  /** Returns why the run failed, or nothing when it passed. */
  check: (run: Run, page: Page) => Promise<string | undefined>;
};

const usedTool = (run: Run, tool: string): string | undefined =>
  run.tools.includes(tool)
    ? undefined
    : `did not call ${tool} (called ${run.tools.join(", ") || "nothing"})${run.errors.length ? `; ${run.errors[0]}` : ""}`;

const tasks: EvalTask[] = [
  {
    name: "query",
    prompt: "Which customer placed the most orders? Answer with the name.",
    check: async (run) =>
      usedTool(run, "execute_sql") ??
      (run.answer.includes("Ana") ? undefined : "answer does not name Ana"),
  },
  {
    name: "report",
    prompt: "Show me a bar chart of order totals per customer.",
    check: async (run) => usedTool(run, "show_chart"),
  },
  {
    name: "save report",
    prompt:
      "Save a report named 'Eval orders per customer' that counts orders per customer.",
    check: async (run, page) => {
      const missing = usedTool(run, "save_report");
      if (missing) return missing;
      const list = (await (
        await page.request.get("/api/questions")
      ).json()) as { data: Array<{ name: string }> };
      return list.data.some((item) => item.name === "Eval orders per customer")
        ? undefined
        : "no saved report with that name";
    },
  },
  {
    name: "design",
    prompt: "Add a nullable phone column (text) to the customers table.",
    check: async (run, page) => {
      const missing = usedTool(run, "propose_schema_change");
      if (missing) return missing;
      const ops = await changesetOps(page, run);
      return ops.some(
        (op) =>
          op.op === "add_column" &&
          op.table === "customers" &&
          op.column?.name === "phone",
      )
        ? undefined
        : `proposed ${JSON.stringify(ops)}`;
    },
  },
  {
    name: "change data",
    prompt: "Mark order 3 as shipped.",
    check: async (run, page) => {
      const missing = usedTool(run, "preview_write");
      if (missing) return missing;
      const ops = await changesetOps(page, run);
      const write = ops.find((op) => op.op === "write");
      return write?.sql &&
        /update\s+"?orders"?/i.test(write.sql) &&
        write.affectedRows === 1
        ? undefined
        : `previewed ${JSON.stringify(write ?? ops)}`;
    },
  },
];

type Op = {
  op: string;
  table?: string;
  sql?: string;
  affectedRows?: number;
  column?: { name: string };
};

async function changesetOps(page: Page, run: Run): Promise<Op[]> {
  if (!run.chatId) return [];
  const list = (await (
    await page.request.get(`/api/ai/chats/${run.chatId}/changesets`)
  ).json()) as {
    data: Array<{ ops: Op[] }>;
  };
  return list.data.flatMap((changeset) => changeset.ops);
}

async function chat(
  page: Page,
  connectionId: number,
  message: string,
): Promise<Run> {
  const started = Date.now();
  const response = await page.request.post("/api/ai/chat/stream", {
    data: { connectionId, message, mode: "agent" },
    timeout: 300_000,
  });
  expect(response.status()).toBe(200);
  const events = (await response.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent & { chatId?: number });
  const done = events.find((event) => event.type === "done");
  return {
    tools: events
      .filter((event) => event.type === "tool_start")
      .map((event) => event.label ?? ""),
    errors: events
      .filter((event) => event.type === "tool_error" || event.type === "error")
      .map(
        (event) =>
          `${event.label ?? "chat"}: ${event.content ?? event.message}`,
      ),
    answer: done?.messages?.map((item) => item.content).join("\n") ?? "",
    chatId: done?.chatId,
    ms: Date.now() - started,
  };
}

test.describe("AI real-model evaluation", () => {
  test.skip(
    !url || models.length === 0,
    "set AI_EVAL_URL and AI_EVAL_MODELS to run",
  );

  test("scripted agent tasks per model", async ({ page }, testInfo) => {
    test.setTimeout(models.length * tasks.length * 300_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-eval-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-eval-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const rows: string[] = [];

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        for (const sql of [
          "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
          "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), total REAL, status TEXT, created_at TEXT)",
          "INSERT INTO customers VALUES (1, 'Ana'), (2, 'Li'), (3, 'Sam')",
          "INSERT INTO orders VALUES (1, 1, 20, 'new', '2026-01-03'), (2, 1, 35, 'new', '2026-02-10'), (3, 2, 12, 'new', '2026-02-11'), (4, 1, 8, 'shipped', '2026-03-01'), (5, 3, 50, 'new', '2026-03-05')",
        ]) {
          const response = await page.request.post("/api/query/raw", {
            data: { connectionId, query: sql },
          });
          expect(response.status(), sql).toBe(200);
        }

        const providers = (await (
          await page.request.get("/api/ai/providers")
        ).json()) as {
          data: Array<{ id: number; type: string }>;
        };
        const provider =
          providers.data.find((item) => item.type === "openai") ??
          providers.data[0];

        for (const model of models) {
          const update = await page.request.patch(
            `/api/ai/providers/${provider.id}`,
            {
              data: {
                url,
                apiKey: process.env.AI_EVAL_KEY ?? "none",
                model,
                models,
                isActive: true,
              },
            },
          );
          expect(update.status()).toBe(200);

          for (const task of tasks) {
            const run = await chat(page, connectionId, task.prompt).catch(
              (error: Error): Run => ({
                tools: [],
                errors: [error.message],
                answer: "",
                ms: 0,
              }),
            );
            const failure = await task.check(run, page);
            rows.push(
              `| ${model} | ${task.name} | ${failure ? "fail" : "pass"} | ${run.tools.join(" → ")} | ${run.errors.length} | ${(run.ms / 1000).toFixed(1)}s | ${(failure ?? "").replace(/\|/g, "/")} |`,
            );
          }
        }
      });
    } finally {
      removeSqliteDbFile(dbPath);
      mkdirSync("test-results", { recursive: true });
      writeFileSync(
        "test-results/ai-eval.md",
        [
          "| Model | Task | Result | Tools | Tool errors | Time | Why |",
          "|---|---|---|---|---|---|---|",
          ...rows,
        ].join("\n") + "\n",
      );
    }
  });
});
