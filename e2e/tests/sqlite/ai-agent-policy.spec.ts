import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { SAFE_MODE_PASSWORD } from "../../fixtures/safeMode";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/**
 * Server-side Agent Mode policy against the real backend. A tiny
 * OpenAI-compatible server stands in for the model so the real agent loop,
 * tool gating, SQL guards and Safe Mode run: the model asks for a tool, the
 * test checks what the backend allowed.
 */

type ToolCallScript = { name: string; args: Record<string, unknown> };
type StreamEvent = {
  type: string;
  id?: string;
  label?: string;
  content?: string;
  data?: Record<string, unknown>;
};

const WRITE_TOOL = "execute_write";
const PROPOSE_TOOL = "propose_schema_change";

class FakeLlm {
  /** Tool names offered to the model, one entry per completion request. */
  readonly offeredTools: string[][] = [];
  script: ToolCallScript | null = null;
  private server: Server | null = null;

  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => this.handle(Buffer.concat(chunks).toString("utf8"), res));
    });
    await new Promise<void>((resolve) => this.server?.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(this.server?.address() as AddressInfo).port}/v1`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }

  private handle(rawBody: string, res: import("node:http").ServerResponse): void {
    const body = JSON.parse(rawBody || "{}") as {
      tools?: Array<{ function?: { name?: string } }>;
      messages?: Array<{ role: string }>;
    };
    const tools = (body.tools ?? []).map((tool) => tool.function?.name ?? "");
    if (tools.length > 0) {
      this.offeredTools.push(tools);
    }

    const afterToolResult = body.messages?.at(-1)?.role === "tool";
    const call = !afterToolResult && tools.length > 0 ? this.script : null;

    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (delta: Record<string, unknown>, finish: string | null): void => {
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-e2e",
          object: "chat.completion.chunk",
          created: 1,
          model: "fake-model",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    };

    if (call) {
      send(
        {
          role: "assistant",
          tool_calls: [
            {
              index: 0,
              id: "call_e2e",
              type: "function",
              function: { name: call.name, arguments: JSON.stringify(call.args) },
            },
          ],
        },
        null,
      );
      send({}, "tool_calls");
    } else {
      send({ role: "assistant", content: "ok" }, null);
      send({}, "stop");
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

async function pointProviderAtFakeLlm(page: Page, url: string): Promise<void> {
  const list = await page.request.get("/api/ai/providers");
  const body = (await list.json()) as { data?: Array<{ id: number; type: string }> };
  const provider = body.data?.find((item) => item.type === "openai") ?? body.data?.[0];
  expect(provider, "an AI provider row exists").toBeDefined();

  const update = await page.request.patch(`/api/ai/providers/${provider?.id}`, {
    data: { url, apiKey: "sk-e2e-fake-key", model: "fake-model", models: ["fake-model"], isActive: true },
  });
  expect(update.status()).toBe(200);
}

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  const connection = body.data.find((item) => item.name === name);
  expect(connection, `connection ${name} exists`).toBeDefined();
  return connection?.id as number;
}

async function chat(page: Page, connectionId: number, mode: "ask" | "agent"): Promise<StreamEvent[]> {
  const response = await page.request.post("/api/ai/chat/stream", {
    data: { connectionId, message: "do it", mode },
  });
  expect(response.status()).toBe(200);
  return (await response.text())
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as StreamEvent);
}

async function rawQuery(
  page: Page,
  connectionId: number,
  query: string,
  confirmed = false,
): Promise<APIResponse> {
  return page.request.post("/api/query/raw", { data: { connectionId, query, confirmed } });
}

async function scalar(page: Page, connectionId: number, query: string): Promise<unknown> {
  const response = await rawQuery(page, connectionId, query);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { data: Array<Record<string, unknown>> } };
  return body.data.data[0]?.v;
}

const types = (events: StreamEvent[]): string[] => events.map((event) => event.type);
const blocked = (events: StreamEvent[]): StreamEvent | undefined =>
  events.find((event) => event.type === "tool_error" && event.data?.code === "blocked");

test.describe("AI Agent Mode policy (server side)", () => {
  test("Ask hides and rejects write tools; Agent only proposes, guards destructive SQL", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-policy-${suffix}`;
    const usersTable = `e2e_policy_users_${suffix}`;
    const newTable = `e2e_policy_new_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-policy-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connectionId = await connectionIdByName(page, connectionName);
        await pointProviderAtFakeLlm(page, llmUrl);

        expect((await rawQuery(page, connectionId, `CREATE TABLE ${usersTable} (id INTEGER PRIMARY KEY, email TEXT)`)).status()).toBe(200);
        expect((await rawQuery(page, connectionId, `INSERT INTO ${usersTable} (id, email) VALUES (1, 'a@x.io')`)).status()).toBe(200);

        const updateSql = `UPDATE ${usersTable} SET email = 'hacked' WHERE id = 1`;
        const ops = [{ op: "create_table", table: newTable, columns: [{ name: "id", type: "INTEGER", primary: true }] }];

        await test.step("Ask: write tools are not offered to the model", async () => {
          llm.offeredTools.length = 0;
          llm.script = null;
          await chat(page, connectionId, "ask");
          expect(llm.offeredTools.length).toBeGreaterThan(0);
          for (const offered of llm.offeredTools) {
            expect(offered).toContain("execute_sql");
            expect(offered).not.toContain(WRITE_TOOL);
            expect(offered).not.toContain(PROPOSE_TOOL);
          }
        });

        await test.step("Ask: a write tool call is blocked even if the model forces it", async () => {
          llm.script = { name: WRITE_TOOL, args: { sql: updateSql } };
          const events = await chat(page, connectionId, "ask");
          expect(blocked(events)?.label).toBe(WRITE_TOOL);
          expect(types(events)).not.toContain("permission_request");

          llm.script = { name: PROPOSE_TOOL, args: { ops } };
          const proposeEvents = await chat(page, connectionId, "ask");
          expect(blocked(proposeEvents)?.label).toBe(PROPOSE_TOOL);
          expect(types(proposeEvents)).not.toContain("diagram_diff");

          expect(await scalar(page, connectionId, `SELECT email AS v FROM ${usersTable} WHERE id = 1`)).toBe("a@x.io");
        });

        await test.step("Ask: an empty or unknown mode falls back to Ask", async () => {
          llm.script = { name: WRITE_TOOL, args: { sql: updateSql } };
          const response = await page.request.post("/api/ai/chat/stream", {
            data: { connectionId, message: "do it" },
          });
          const events = (await response.text())
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => JSON.parse(line) as StreamEvent);
          expect(blocked(events)?.label).toBe(WRITE_TOOL);
        });

        await test.step("Agent: write tools are offered", async () => {
          llm.offeredTools.length = 0;
          llm.script = null;
          await chat(page, connectionId, "agent");
          expect(llm.offeredTools[0]).toEqual(expect.arrayContaining([WRITE_TOOL, PROPOSE_TOOL]));
        });

        await test.step("Agent: execute_write only requests permission, never runs", async () => {
          llm.script = { name: WRITE_TOOL, args: { sql: updateSql } };
          const events = await chat(page, connectionId, "agent");
          const permission = events.find((event) => event.type === "permission_request");
          expect(permission?.data?.sql).toBe(updateSql);
          expect(await scalar(page, connectionId, `SELECT email AS v FROM ${usersTable} WHERE id = 1`)).toBe("a@x.io");
        });

        await test.step("Agent: destructive and unbounded SQL is blocked", async () => {
          for (const sql of [
            `DROP TABLE ${usersTable}`,
            `UPDATE ${usersTable} SET email = 'x'`,
            `DELETE FROM ${usersTable}`,
            `UPDATE ${usersTable} SET email = 'x' WHERE id = 1; DROP TABLE ${usersTable}`,
          ]) {
            llm.script = { name: WRITE_TOOL, args: { sql } };
            const events = await chat(page, connectionId, "agent");
            expect(blocked(events), sql).toBeDefined();
            expect(types(events), sql).not.toContain("permission_request");
          }
          expect(await scalar(page, connectionId, `SELECT COUNT(*) AS v FROM ${usersTable}`)).toBe(1);
        });

        await test.step("Agent: propose_schema_change stages a diff without touching the DB", async () => {
          llm.script = { name: PROPOSE_TOOL, args: { ops } };
          const events = await chat(page, connectionId, "agent");
          expect(types(events)).toContain("diagram_diff");
          expect(
            await scalar(page, connectionId, `SELECT COUNT(*) AS v FROM sqlite_master WHERE name = '${newTable}'`),
          ).toBe(0);
        });
      });
    } finally {
      await llm.stop();
    }
  });

  test("Safe Mode blocks an agent-confirmed write and schema apply until confirmed", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-safe-${suffix}`;
    const usersTable = `e2e_safe_users_${suffix}`;
    const newTable = `e2e_safe_new_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-safe-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      const connectionId = await connectionIdByName(page, connectionName);

      expect((await rawQuery(page, connectionId, `CREATE TABLE ${usersTable} (id INTEGER PRIMARY KEY, email TEXT)`)).status()).toBe(200);
      expect((await rawQuery(page, connectionId, `INSERT INTO ${usersTable} (id, email) VALUES (1, 'a@x.io')`)).status()).toBe(200);

      // Enabling Safe Mode needs the app-wide password; it may exist from another spec.
      await page.request.post("/api/safe-mode/password", {
        data: { password: SAFE_MODE_PASSWORD, confirm: SAFE_MODE_PASSWORD },
      });

      const safeMode = await page.request.patch(`/api/connections/${connectionId}`, {
        data: { safeMode: "alert_write" },
      });
      expect(safeMode.status()).toBe(200);

      const updateSql = `UPDATE ${usersTable} SET email = 'changed' WHERE id = 1`;
      const ops = [{ op: "create_table", table: newTable, columns: [{ name: "id", type: "INTEGER", primary: true }] }];

      await test.step("Reads still run", async () => {
        expect(await scalar(page, connectionId, `SELECT email AS v FROM ${usersTable} WHERE id = 1`)).toBe("a@x.io");
      });

      await test.step("Unconfirmed write is refused and changes nothing", async () => {
        const response = await rawQuery(page, connectionId, updateSql);
        expect(response.status()).toBe(403);
        expect(await scalar(page, connectionId, `SELECT email AS v FROM ${usersTable} WHERE id = 1`)).toBe("a@x.io");
      });

      await test.step("Unconfirmed schema apply is refused and changes nothing", async () => {
        const response = await page.request.post("/api/schema/changes/apply", {
          data: { connectionId, ops },
        });
        expect(response.status()).toBe(403);
        expect(
          await scalar(page, connectionId, `SELECT COUNT(*) AS v FROM sqlite_master WHERE name = '${newTable}'`),
        ).toBe(0);
      });

      await test.step("Explicit confirmation lets the same write and apply through", async () => {
        expect((await rawQuery(page, connectionId, updateSql, true)).status()).toBe(200);
        expect(await scalar(page, connectionId, `SELECT email AS v FROM ${usersTable} WHERE id = 1`)).toBe("changed");

        const apply = await page.request.post("/api/schema/changes/apply", {
          data: { connectionId, ops, confirmed: true },
        });
        expect(apply.status()).toBe(200);
        expect(
          await scalar(page, connectionId, `SELECT COUNT(*) AS v FROM sqlite_master WHERE name = '${newTable}'`),
        ).toBe(1);
      });
    });
  });
});
