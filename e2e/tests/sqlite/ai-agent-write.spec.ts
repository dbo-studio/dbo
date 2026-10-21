import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup, setAiMode } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/**
 * Data changes in the Agent Workspace: the agent previews them (row count and a
 * sample, nothing changes), they join one changeset, and the user applies it.
 */

async function rows(
  page: Page,
  connectionId: number,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await page.request.post("/api/query/raw", {
    data: { connectionId, query },
  });
  expect(response.status(), query).toBe(200);
  return (
    (await response.json()) as {
      data: { data: Array<Record<string, unknown>> };
    }
  ).data.data;
}

test.describe("AI Agent Workspace data changes", () => {
  test("preview rows, collect two changes, apply once", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-write-${suffix}`;
    const items = `e2e_items_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-write-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const dock = page.getByTestId("ai-changeset-dock");
        const composer = page.getByTestId("ai-chat-input");
        const send = async (message: string): Promise<void> => {
          await composer.fill(message);
          await composer.press("Enter");
        };

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await sqlEditor.open();
        await sqlEditor.typeAndRun(
          `CREATE TABLE ${items} (id INTEGER PRIMARY KEY, category TEXT, price INTEGER); INSERT INTO ${items} VALUES (1,'books',10),(2,'books',20),(3,'books',30),(4,'games',40);`,
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        const prices = async (): Promise<unknown[]> =>
          (
            await rows(
              page,
              connectionId,
              `SELECT price FROM ${items} ORDER BY id`,
            )
          ).map((row) => row.price);

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        await test.step("A previewed update shows its row count and sample, and changes nothing", async () => {
          llm.script = {
            name: "preview_write",
            args: {
              sql: `UPDATE ${items} SET price = price + 10 WHERE category = 'books'`,
            },
          };
          await send("raise book prices");

          await expect(dock).toContainText("1 change pending", {
            timeout: 15000,
          });
          await expect(page.getByTestId("ai-write-count")).toContainText(
            "3 rows",
          );
          await expect(
            page
              .getByTestId("ai-write-sample")
              .getByTestId("ai-table-row-count"),
          ).toContainText("3 rows");
          await expect(
            page
              .getByTestId("ai-write-sample")
              .getByTestId("ai-table-open-grid"),
          ).toBeVisible();
          expect(await prices()).toEqual([10, 20, 30, 40]);
        });

        await test.step("A second change joins the same changeset", async () => {
          llm.script = {
            name: "preview_write",
            args: { sql: `DELETE FROM ${items} WHERE category = 'games'` },
          };
          await send("remove games");

          await expect(dock).toContainText("2 changes pending", {
            timeout: 15000,
          });
          expect(await prices()).toEqual([10, 20, 30, 40]);
        });

        await test.step("The SQL tab lists both statements", async () => {
          await page.getByTestId("ai-changes-tab-sql").click();
          await expect(page.getByTestId("ai-sql")).toContainText("price + 10");
          await expect(page.getByTestId("ai-sql")).toContainText("DELETE FROM");
          await page.getByTestId("ai-changes-tab-diff").click();
        });

        await test.step("Apply all runs both in one go", async () => {
          await page.getByTestId("ai-dock-apply-all").click();
          await expect(page.getByTestId("ai-dock-preview-modal")).toContainText(
            "DELETE FROM",
          );
          await page.getByTestId("ai-dock-execute").click();

          await expect(dock).toHaveCount(0, { timeout: 15000 });
          expect(await prices()).toEqual([20, 30, 40]);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
