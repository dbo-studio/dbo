import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, previewWrite, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The connection's agent level caps what the assistant may offer and what can be applied, whatever the client asks. */

async function setTier(page: Page, connectionId: number, agentTier: string): Promise<void> {
  const response = await page.request.patch(`/api/connections/${connectionId}`, { data: { agentTier } });
  expect(response.status()).toBe(200);
}

async function agentTurn(page: Page, llm: FakeLlm, connectionId: number): Promise<string[]> {
  const created = await page.request.post("/api/ai/chats", { data: { connectionId, title: "tier" } });
  const chatId = ((await created.json()) as { data: { id: number } }).data.id;
  llm.offeredTools.length = 0;
  llm.script = null;
  await page.request.post("/api/ai/chat/stream", { data: { connectionId, chatId, message: "hi", mode: "agent" } });
  return llm.offeredTools[0] ?? [];
}

test.describe("AI agent level per connection", () => {
  test("read only, change data, change data and schema", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-tier-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-tier-${suffix}.db`;
    const items = `items_${suffix}`;
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
          data: Array<{ id: number; name: string; agentTier: string }>;
        };
        const connection = connections.data.find((item) => item.name === connectionName);
        const connectionId = connection?.id as number;
        expect(connection?.agentTier).toBe("schema_change");

        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table: items, columns: [{ name: "id", type: "INTEGER", primary: true }, { name: "label", type: "TEXT" }] },
          ]),
        );
        const schemaProposal = await proposeChangeset(page, llm, connectionId, [
          { op: "add_column", table: items, column: { name: "note", type: "TEXT" } },
        ]);
        const dataProposal = await previewWrite(page, llm, connectionId, `INSERT INTO ${items} (id, label) VALUES (1, 'a')`);

        await test.step("Read only: no change tools are offered and nothing applies", async () => {
          await setTier(page, connectionId, "read_only");
          const tools = await agentTurn(page, llm, connectionId);
          expect(tools).toContain("execute_sql");
          expect(tools).not.toContain("propose_schema_change");
          expect(tools).not.toContain("preview_write");
          expect((await applyChangeset(page, dataProposal)).status()).toBe(403);
        });

        await test.step("Change data: data changes apply, schema changes do not", async () => {
          await setTier(page, connectionId, "data_write");
          const tools = await agentTurn(page, llm, connectionId);
          expect(tools).toContain("preview_write");
          expect(tools).not.toContain("propose_schema_change");
          expect((await applyChangeset(page, schemaProposal)).status()).toBe(403);
          expect((await applyChangeset(page, dataProposal)).status()).toBe(200);
        });

        await test.step("Change data and schema: today's behavior", async () => {
          await setTier(page, connectionId, "schema_change");
          const tools = await agentTurn(page, llm, connectionId);
          expect(tools).toEqual(expect.arrayContaining(["preview_write", "propose_schema_change"]));
          expect((await applyChangeset(page, schemaProposal)).status()).toBe(200);
        });

        await test.step("The lock menu sets the level and Agent mode is unavailable on read only", async () => {
          await page.reload();
          await page.getByTestId("safe-mode-menu").click();
          await page.getByTestId("ai-agent-tier-read_only").click();
          await expect(page.getByText("AI permissions updated")).toBeVisible();
          await new SettingsPage(page).openRightSidebar();
          const toggle = page.getByTestId("ai-mode-toggle");
          await expect(toggle).toHaveAttribute("data-mode", "ask");
          await toggle.click();
          await expect(page.getByTestId("ai-mode-agent")).toHaveAttribute("aria-disabled", "true");
          await page.keyboard.press("Escape");
          await setTier(page, connectionId, "schema_change");
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
