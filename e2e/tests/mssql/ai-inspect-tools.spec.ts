import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkInspectTools } from "../../helpers/aiInspectTools";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("AI inspection tools (mssql)", () => {
  test("explain_query and table_stats work or refuse with a reason", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-explain-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkInspectTools(page, "mssql", connectionName, `explain_${suffix}`);
    });
  });
});
