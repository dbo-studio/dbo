import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Every apply attempt is logged with its SQL, and the log shows in AI settings. */
test.describe("Agent audit log", () => {
  test("applied and failed attempts are recorded", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-audit-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-audit-${suffix}.db`;
    const table = `audit_${suffix}`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;

        const audit = async (): Promise<Array<{ status: string; summary: string; sql: string; error?: string }>> =>
          (
            (await (
              await page.request.get(`/api/ai/audit?connectionId=${connectionId}&page=1&count=20`)
            ).json()) as { data: Array<{ status: string; summary: string; sql: string; error?: string }> }
          ).data;

        await test.step("A successful apply is logged with its SQL", async () => {
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table, columns: [{ name: "id", type: "INTEGER", primary: true }] },
          ]);
          expect((await applyChangeset(page, proposal)).status()).toBe(200);

          const [entry] = await audit();
          expect(entry).toMatchObject({ status: "applied", summary: `create_table ${table}` });
          expect(entry.sql).toContain(`CREATE TABLE`);
          expect(entry.sql).toContain(table);
        });

        await test.step("A failed apply is logged with its error", async () => {
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table, columns: [{ name: "id", type: "INTEGER", primary: true }] },
          ]);
          expect((await applyChangeset(page, proposal)).status()).not.toBe(200);

          const [entry, previous] = await audit();
          expect(entry.status).toBe("failed");
          expect(entry.error).toBeTruthy();
          expect(previous.status).toBe("applied");
        });

        await test.step("The settings page lists the entries", async () => {
          await settingsPage.open();
          await settingsPage.navigateTo("AI");
          await expect(page.getByTestId("ai-audit-entry")).toHaveCount(2);
          await expect(page.getByTestId("ai-audit")).toContainText(`create_table ${table}`);
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
