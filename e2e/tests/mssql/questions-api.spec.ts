import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkQuestionsApi } from "../../helpers/questionsApi";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("Saved reports API (mssql)", () => {
  test("create, list, run, rename, refuse writes, delete", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `reports-api-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkQuestionsApi(page, "mssql", connectionName, `report_sales_${suffix}`);
    });
  });
});
