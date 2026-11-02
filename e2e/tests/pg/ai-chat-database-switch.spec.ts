import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** A connection with several databases: the chat context switches between them and lists their tables. */
test.describe("AI chat database switch (postgres)", () => {
  test("switching the database changes the tables the @ list offers and the request", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    const connectionName = `ai-db-switch-${suffix}`;
    const otherDatabase = `e2e_ctx_db_${suffix}`;
    const otherTable = `only_in_other_${suffix}`;

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("postgresql", connectionName));
        await pointProviderAtFakeLlm(page, llmUrl);

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string, database?: string) =>
          page.request.post("/api/query/raw", { data: { connectionId, query, database }, timeout: 20_000 });

        // A schema apply (unlike raw SQL) refreshes the cached database list the picker reads.
        const created = await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [{ op: "create_database", name: otherDatabase }]),
        );
        expect(created.status()).toBe(200);

        try {
          expect((await raw(`CREATE TABLE ${otherTable} (id INTEGER PRIMARY KEY)`, otherDatabase)).status()).toBe(200);

          const requests: Array<{ contextOpts?: { database?: string; tables?: string[] } }> = [];
          await page.route("**/api/ai/chat/stream", async (route) => {
            requests.push(route.request().postDataJSON() as (typeof requests)[number]);
            await route.continue();
          });

          await page.reload();
          await settingsPage.openRightSidebar();
          const composer = page.getByPlaceholder(/ask anything/i);
          await expect(page.getByTestId("ai-context-database")).toBeVisible({ timeout: 15000 });

          await test.step("The other database is offered and the composer shows it after the switch", async () => {
            await page.getByTestId("ai-context-database").click();
            await page.getByTestId("ai-context-choice").filter({ hasText: otherDatabase }).click();
            await expect(page.getByTestId("ai-context-database")).toContainText(otherDatabase);
            await expect(page.getByTestId("ai-context-follow")).toHaveAttribute("data-following", "false");
          });

          await test.step("The @ list now offers that database's tables", async () => {
            await composer.fill(`@${otherTable.slice(0, 14)}`);
            const option = page.getByTestId("ai-mention-option").filter({ hasText: otherTable });
            await expect(option).toBeVisible({ timeout: 15000 });
            await composer.press("Tab");
            await expect(page.getByTestId("ai-context-chip").filter({ hasText: otherTable })).toBeVisible();
          });

          await test.step("The request carries the database", async () => {
            await composer.fill("what is in here");
            await composer.press("Enter");
            await expect.poll(() => requests.length).toBeGreaterThanOrEqual(1);
            expect(requests.at(-1)?.contextOpts?.database).toBe(otherDatabase);
            expect(requests.at(-1)?.contextOpts?.tables).toContain(otherTable);
          });
        } finally {
          await raw(`DROP DATABASE IF EXISTS ${otherDatabase} WITH (FORCE)`).catch(() => undefined);
        }
      });
    } finally {
      await llm.stop();
    }
  });
});
