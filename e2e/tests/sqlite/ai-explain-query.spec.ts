import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkExplainQuery } from "../../helpers/explainQuery";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("AI explain_query (sqlite)", () => {
  test("returns the plan of a SELECT and refuses anything else", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-explain-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkExplainQuery(
        page,
        "sqlite",
        connectionName,
        `explain_${suffix}`,
        `/tmp/dbo-e2e-explain-${suffix}.db`,
      );
    });
  });
});
