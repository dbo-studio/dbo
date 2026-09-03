import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../../pages";

/**
 * SQL Format / Beautify (Beatify) in the Query editor.
 */
test.describe("Query format PostgreSQL", () => {
  test("Beatify reformats messy SQL", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `query-format-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and open editor", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
      });

      await test.step("Format messy SQL", async () => {
        const messy = "select id,name from users where id=1 and name='a';";
        await sqlEditor.typeQuery(messy);
        await sqlEditor.formatSql();

        await expect
          .poll(async () => sqlEditor.getMonacoValue(), { timeout: 10000 })
          .not.toBe(messy);

        const formatted = await sqlEditor.getMonacoValue();
        expect(formatted.toLowerCase()).toContain("select");
        expect(formatted).toMatch(/select[\s\S]+from[\s\S]+where/i);
        // Beatify should introduce line breaks / indentation vs one-liner.
        expect(formatted.includes("\n") || /\s{2,}/.test(formatted)).toBe(true);
      });
    });
  });
});
