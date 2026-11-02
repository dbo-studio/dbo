import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, setAiMode } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The workstation canvas follows the agent (Data, Changes, SQL), goes full screen with a floating prompt, and the conversation width is a setting. */
test.describe("AI workstation canvas", () => {
  test("follows the agent's work and goes full screen", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-canvas-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-canvas-${suffix}.db`;
    const table = `canvas_${suffix}`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const canvas = page.getByTestId("ai-changeset-surface");

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            {
              op: "create_table",
              table,
              columns: [
                { name: "id", type: "INTEGER", primary: true },
                { name: "label", type: "TEXT" },
              ],
            },
          ]),
        );
        await page.request.post("/api/query/raw", {
          data: {
            connectionId,
            query: `INSERT INTO ${table} VALUES (1, 'first'), (2, 'second')`,
          },
        });

        // The app read the providers before the fake one was set up.
        await page.reload();
        const columns = async (): Promise<string[]> => {
          const response = await page.request.post("/api/query/raw", {
            data: {
              connectionId,
              query: `SELECT name FROM pragma_table_info('${table}')`,
            },
          });
          return (
            (await response.json()) as {
              data: { data: Array<{ name: string }> };
            }
          ).data.data.map((row) => row.name);
        };

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-expand-to-agent").click();
        const composer = page
          .getByTestId("ai-agent-workspace")
          .getByTestId("ai-chat-input");

        await test.step("A query result opens as a tab in the app's data grid; the chat only links to it", async () => {
          llm.script = {
            name: "execute_sql",
            args: { sql: `SELECT id, label FROM ${table} ORDER BY id` },
          };
          await composer.fill("show the rows");
          await composer.press("Enter");
          await expect(canvas).toHaveAttribute("data-tab", "result", {
            timeout: 15000,
          });
          const grid = canvas.getByTestId("ai-result-grid");
          await expect(grid.getByText("second", { exact: true })).toBeVisible();
          await expect(grid).toContainText(`FROM ${table}`);
          await expect(
            canvas.getByTestId("ai-canvas-tab").filter({ hasText: table }),
          ).toBeVisible();
          // The rows are on the canvas; the chat shows a link, not a second table.
          const chip = page
            .getByTestId("ai-agent-workspace")
            .getByTestId("ai-chip-result");
          await expect(chip).toContainText(table);
          await expect(
            page.getByTestId("ai-agent-workspace").getByTestId("ai-data-table"),
          ).toHaveCount(0);

          // Closing the tab and clicking the chip brings it back.
          await canvas
            .getByTestId("ai-canvas-tab")
            .filter({ hasText: table })
            .getByTestId("sidebar-tab-close")
            .click();
          await chip.click();
          await expect(canvas).toHaveAttribute("data-tab", "result");
        });

        await test.step("A proposal switches the canvas to the changes", async () => {
          await setAiMode(page, "agent");
          llm.script = {
            name: "propose_schema_change",
            args: {
              ops: [
                {
                  op: "add_column",
                  table,
                  column: { name: "note", type: "TEXT" },
                },
              ],
            },
          };
          await composer.fill("add a note column");
          await composer.press("Enter");
          await expect(canvas).toHaveAttribute("data-tab", "proposal", {
            timeout: 15000,
          });
          await expect(page.getByTestId("ai-proposal-view")).toHaveAttribute(
            "data-view",
            "diff",
          );
          // The result stays open as its own tab beside the proposal.
          await expect(canvas.getByTestId("ai-canvas-tab")).toHaveCount(2);
        });

        await test.step("Apply, then Undo from the chat card brings the column back out", async () => {
          const dock = page.getByTestId("ai-changeset-dock");
          await page.getByTestId("ai-dock-apply-all").click();
          await page.getByTestId("ai-dock-execute").click();
          await expect(dock).toHaveCount(0, { timeout: 15000 });
          expect(await columns()).toContain("note");

          await page.getByTestId("ai-undo").click();
          await expect(dock).toContainText("1 change pending", {
            timeout: 15000,
          });
          await page.getByTestId("ai-dock-apply-all").click();
          await expect(page.getByTestId("ai-dock-preview-modal")).toContainText(
            "DROP COLUMN",
          );
          await page.getByTestId("ai-dock-execute").click();
          await expect(dock).toHaveCount(0, { timeout: 15000 });
          expect(await columns()).not.toContain("note");
        });

        await test.step("Expanding widens the canvas beside the same chat; Esc returns", async () => {
          const workspace = page.getByTestId("ai-agent-workspace");
          const before = (await canvas.boundingBox())?.width ?? 0;
          await page.getByTestId("ai-canvas-fullscreen").click();
          await expect
            .poll(async () => (await canvas.boundingBox())?.width ?? 0)
            .toBeGreaterThan(before + 100);
          // One chat box, not a second one floating over the canvas.
          await expect(workspace.getByTestId("ai-chat-input")).toHaveCount(1);
          await expect(
            workspace.getByTestId("ai-message").first(),
          ).toBeVisible();
          await page.keyboard.press("Escape");
          await expect
            .poll(async () => (await canvas.boundingBox())?.width ?? 0)
            .toBeLessThan(before + 10);
          await expect(workspace).toBeVisible();
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
