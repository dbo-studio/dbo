import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { SAFE_MODE_PASSWORD } from "../../fixtures/safeMode";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/**
 * Server-side Agent Mode policy against the real backend. A tiny
 * OpenAI-compatible server stands in for the model so the real agent loop,
 * tool gating, SQL guards and Safe Mode run: the model asks for a tool, the
 * test checks what the backend allowed.
 */

type StreamEvent = {
  type: string;
  id?: string;
  label?: string;
  content?: string;
  data?: Record<string, unknown>;
};

const WRITE_TOOL = "execute_write";
const PROPOSE_TOOL = "propose_schema_change";

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

        await test.step("A chat cannot run against another connection", async () => {
          const otherPath = `${dbPath}.other`;
          ensureSqliteDbFile(otherPath);
          const created = await page.request.post("/api/connections", {
            data: { name: `${connectionName}-other`, type: "sqlite", options: { path: otherPath } },
          });
          expect(created.ok()).toBeTruthy();
          const otherId = await connectionIdByName(page, `${connectionName}-other`);

          try {
            const chatRes = await page.request.post("/api/ai/chats", { data: { connectionId, title: "scoped" } });
            const chatId = ((await chatRes.json()) as { data: { id: number } }).data.id;

            const send = async (targetId: number): Promise<string[]> => {
              const response = await page.request.post("/api/ai/chat/stream", {
                data: { connectionId: targetId, chatId, message: "hi", mode: "ask" },
              });
              expect(response.status()).toBe(200);
              return types(
                (await response.text())
                  .split("\n")
                  .filter((line) => line.trim() !== "")
                  .map((line) => JSON.parse(line) as StreamEvent),
              );
            };

            expect(await send(connectionId)).toContain("done");
            const rejected = await send(otherId);
            expect(rejected).toContain("error");
            expect(rejected).not.toContain("done");
          } finally {
            await page.request.delete(`/api/connections/${otherId}`);
          }
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
