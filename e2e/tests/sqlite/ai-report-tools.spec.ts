import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

type Event = { type: string; label?: string; content?: string };

/** Agent tools that change saved reports and boards: filters on save, update, unpin, rename, delete. */
test.describe("AI report tools", () => {
  test("the agent saves with filter defaults, edits, and removes reports and boards", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-report-tools-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-report-tools-${suffix}.db`;
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
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const chatId = (
          (await (await page.request.post("/api/ai/chats", { data: { connectionId, title: "report tools" } })).json()) as {
            data: { id: number };
          }
        ).data.id;

        const call = async (
          name: string,
          args: Record<string, unknown>,
          mode: "ask" | "agent" = "agent",
        ): Promise<Event[]> => {
          llm.script = { name, args };
          const sent = await page.request.post("/api/ai/chat/stream", {
            data: { connectionId, chatId, message: name, mode },
          });
          return (await sent.text())
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Event);
        };
        const reports = async (): Promise<Array<{ id: number; name: string; sql: string; chart: { type: string; y: string[] }; params: Record<string, string> }>> =>
          ((await (await page.request.get(`/api/questions?connectionId=${connectionId}`)).json()) as { data: never }).data;
        const boards = async (): Promise<Array<{ name: string; cards: unknown[] }>> =>
          ((await (await page.request.get(`/api/dashboards?connectionId=${connectionId}`)).json()) as { data: never }).data;
        const failed = (events: Event[]): string | undefined => events.find((event) => event.type === "tool_error")?.content;

        const title = `Pick ${suffix}`;
        await test.step("A chart with filters runs with its values and saves them as defaults", async () => {
          const sql = "SELECT {{n:number}} * 2 AS doubled";
          const shown = await call("show_chart", { sql, title, type: "number", y: ["doubled"], params: { n: "21" } });
          expect(failed(shown)).toBeUndefined();
          expect(shown.find((event) => event.type === "tool_result")?.content).toContain("42");

          expect(failed(await call("save_report", { title, sql, type: "number", y: ["doubled"], params: { n: "21" } }))).toBeUndefined();
          const saved = (await reports()).find((item) => item.name === title);
          expect(saved?.params).toEqual({ n: "21" });
        });

        const id = (await reports()).find((item) => item.name === title)?.id as number;

        await test.step("Update changes only the fields given", async () => {
          const sql = "SELECT {{n:number}} * 3 AS tripled";
          expect(failed(await call("update_report", { reportId: id, sql, title: `${title} x3`, params: { n: "5" } }))).toBeUndefined();
          const updated = (await reports()).find((item) => item.id === id);
          expect(updated).toMatchObject({ name: `${title} x3`, sql, params: { n: "5" }, chart: { type: "number", y: ["doubled"] } });
        });

        await test.step("Ask mode cannot change or remove what is saved", async () => {
          const refused = await call("delete_report", { reportId: id }, "ask");
          expect(failed(refused)).toBeDefined();
          expect((await reports()).some((item) => item.id === id)).toBe(true);
        });

        await test.step("Another connection's report is out of reach", async () => {
          expect(failed(await call("delete_report", { reportId: 987654 }))).toContain("not found");
        });

        await test.step("Pin, rename, unpin and delete a board; the report survives", async () => {
          expect(failed(await call("pin_report", { reportId: id, board: "Tools" }))).toBeUndefined();
          expect(failed(await call("rename_board", { board: "Tools", newName: "Tools 2" }))).toBeUndefined();
          expect((await boards()).map((item) => item.name)).toContain("Tools 2");

          expect(failed(await call("unpin_report", { reportId: id, board: "Tools 2" }))).toBeUndefined();
          expect((await boards()).find((item) => item.name === "Tools 2")?.cards).toHaveLength(0);

          expect(failed(await call("delete_board", { board: "Tools 2" }))).toBeUndefined();
          expect((await boards()).some((item) => item.name === "Tools 2")).toBe(false);
          expect((await reports()).some((item) => item.id === id)).toBe(true);
        });

        await test.step("Delete removes the report", async () => {
          expect(failed(await call("delete_report", { reportId: id }))).toBeUndefined();
          expect((await reports()).some((item) => item.id === id)).toBe(false);
        });
      });
    } finally {
      await llm.stop();
      removeSqliteDbFile(dbPath);
    }
  });
});
