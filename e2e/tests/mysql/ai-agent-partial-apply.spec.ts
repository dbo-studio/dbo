import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  clearActiveAiProfile,
  saveAiSetup,
  setAiMode,
} from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** MySQL schema changes are not atomic: the dock warns before apply and reports what stayed when a step fails. */
test.describe("AI Agent partial apply (mysql)", () => {
  test("notice before apply, per-step report after a failure", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-partial-${suffix}`;
    const fresh = `e2e_fresh_${suffix}`;
    const taken = `e2e_taken_${suffix}`;

    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    let connectionId = 0;
    const query = (sql: string) =>
      page.request.post("/api/query/raw", {
        data: { connectionId, query: sql },
      });

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("mysql", connectionName),
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        expect(
          (
            await query(`CREATE TABLE \`${taken}\` (id INT PRIMARY KEY)`)
          ).status(),
        ).toBe(200);

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        try {
          const columns = [{ name: "id", type: "INT", primary: true }];
          // The first create is valid; the second collides with the table made above.
          llm.script = {
            name: "propose_schema_change",
            args: {
              database: "default",
              ops: [
                { op: "create_table", table: fresh, columns },
                { op: "create_table", table: taken, columns },
              ],
            },
          };
          const composer = page.getByTestId("ai-chat-input");
          await composer.fill("create two tables");
          await composer.press("Enter");
          const dock = page.getByTestId("ai-changeset-dock");
          await expect(dock).toContainText("2 changes pending", {
            timeout: 15000,
          });

          await test.step("The dock warns that MySQL applies schema changes one at a time", async () => {
            await expect(
              page.getByTestId("ai-dock-mysql-notice"),
            ).toBeVisible();
          });

          await test.step("A failing step leaves a report of what applied and what did not", async () => {
            await page.getByTestId("ai-dock-apply-all").click();
            await page.getByTestId("ai-dock-execute").click();
            await expect(page.getByTestId("ai-dock-partial")).toContainText(
              "1 of 2 steps applied, then step 2 failed",
              {
                timeout: 20000,
              },
            );

            await page.getByTestId("ai-changes-tab-diff").click();
            const ops = page.getByTestId("ai-diff-op");
            await expect(
              ops.and(page.locator('[data-status="applied"]')),
            ).toHaveCount(1);
            await expect(
              ops.and(page.locator('[data-status="failed"]')),
            ).toHaveCount(1);
          });

          await test.step("Rejecting the failed step closes the review", async () => {
            await page.getByTestId("ai-dock-reject-all").click();
            await expect(dock).toHaveCount(0);
          });
        } finally {
          await query(`DROP TABLE IF EXISTS \`${fresh}\``);
          await query(`DROP TABLE IF EXISTS \`${taken}\``);
        }
      });
    } finally {
      await llm.stop();
    }
  });
});
