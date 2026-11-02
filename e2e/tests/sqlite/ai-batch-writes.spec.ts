import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkBatchWrites } from "../../helpers/batchWrites";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("AI batch data changes and seed rows (sqlite)", () => {
  test("seed two related tables in one change; a failing batch rolls back", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-batch-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkBatchWrites(
        page,
        "sqlite",
        connectionName,
        suffix,
        `/tmp/dbo-e2e-batch-${suffix}.db`,
      );
    });
  });
});
