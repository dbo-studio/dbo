import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { checkBatchWrites } from "../../helpers/batchWrites";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("AI batch data changes and seed rows (postgresql)", () => {
  test("seed two related tables in one change; a failing batch rolls back", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-batch-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkBatchWrites(page, "postgresql", connectionName, suffix);
    });
  });
});
