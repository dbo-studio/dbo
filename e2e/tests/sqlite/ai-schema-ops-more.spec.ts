import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { checkMoreSchemaOps } from "../../helpers/schemaOpsMore";

test.describe("AI schema ops: renames, views, checks, drop table (sqlite)", () => {
  test("apply, undo what can be undone, drop", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-schema-ops-${suffix}`;
    await withConnectionCleanup(page, connectionName, async () => {
      await checkMoreSchemaOps(
        page,
        "sqlite",
        connectionName,
        suffix,
        `/tmp/dbo-e2e-schema-ops-${suffix}.db`,
      );
    });
  });
});
