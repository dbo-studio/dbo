import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  clearActiveAiProfile,
  saveAiSetup,
  setAiMode,
} from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Dropping a table: the review says it cannot be undone, and Execute waits until the table name is typed. */
test.describe("AI Agent drop table confirmation", () => {
  test("Execute stays disabled until the table name is typed", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-drop-${suffix}`;
    const table = `old_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-drop-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    let connectionId = 0;
    const tableCount = async (): Promise<string> =>
      JSON.stringify(
        await (
          await page.request.post("/api/query/raw", {
            data: {
              connectionId,
              query: `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = '${table}'`,
            },
          })
        ).json(),
      );

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

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
        connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        await page.request.post("/api/query/raw", {
          data: {
            connectionId,
            query: `CREATE TABLE ${table} (id INTEGER PRIMARY KEY)`,
          },
        });

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        llm.script = {
          name: "propose_schema_change",
          args: { ops: [{ op: "drop_table", table }] },
        };
        const composer = page.getByTestId("ai-chat-input");
        await composer.fill("drop the old table");
        await composer.press("Enter");
        const dock = page.getByTestId("ai-changeset-dock");
        await expect(dock).toContainText("1 change pending", {
          timeout: 15000,
        });

        await test.step("The review says the drop cannot be undone", async () => {
          await page.getByTestId("ai-changes-tab-diff").click();
          await expect(page.getByTestId("ai-undo-note").first()).toContainText(
            "Can't be undone",
          );
        });

        await test.step("Execute waits for the exact table name", async () => {
          await page.getByTestId("ai-dock-apply-all").click();
          const execute = page.getByTestId("ai-dock-execute");
          const confirm = page.getByTestId("ai-dock-confirm-input");
          await expect(execute).toBeDisabled();
          await confirm.fill("old");
          await expect(execute).toBeDisabled();
          await confirm.fill(table);
          await expect(execute).toBeEnabled();
          await execute.click();
          await expect(dock).toHaveCount(0, { timeout: 20000 });
          expect(await tableCount()).toContain('"n":0');
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
