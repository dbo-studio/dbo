import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkInspectTools } from "../../helpers/aiInspectTools";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("AI inspection tools (sqlite)", () => {
  test("explain_query plans a SELECT and refuses writes; table_stats measures a table", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-explain-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkInspectTools(
        page,
        "sqlite",
        connectionName,
        `explain_${suffix}`,
        `/tmp/dbo-e2e-explain-${suffix}.db`,
      );
    });
  });
});
