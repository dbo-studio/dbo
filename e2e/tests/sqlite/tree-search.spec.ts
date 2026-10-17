import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { removeSqliteDbFile, setupSqliteConnection } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ObjectTreePage } from "../../pages";

test.describe("Object tree search", () => {
  test("finds tables in folders that were never opened, opens and reveals them", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `e2e-tree-search-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-tree-search-${suffix}.db`;
    removeSqliteDbFile(dbPath);
    const ddl = Array.from({ length: 40 }, (_, i) => `create table item_${String(i).padStart(2, "0")}(id integer);`).join("");
    execFileSync("sqlite3", [dbPath, `${ddl} create table invoices(id integer); create view invoice_totals as select * from invoices;`]);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await setupSqliteConnection(page, connectionName, dbPath);
        const tree = new ObjectTreePage(page);
        const status = page.getByTestId("tree-search-status");

        await test.step("Tables and Views are not loaded yet", async () => {
          await expect(tree.getTreeNode(connectionName)).toBeVisible();
          await expect(tree.getTreeNode("invoices")).toHaveCount(0);
        });

        await test.step("search reaches unopened folders", async () => {
          await tree.treeSearchInput().fill("invoice");
          await expect(status).toHaveText("2 results");
          await expect(tree.getTreeNode("invoices")).toBeVisible();
          await expect(tree.getTreeNode("invoice_totals")).toBeVisible();
          await expect(tree.getTreeNode("item_01")).toHaveCount(0);
        });

        await test.step("no match shows an empty state", async () => {
          await tree.treeSearchInput().fill("does_not_exist");
          await expect(page.getByText("No matches")).toBeVisible();
        });

        await test.step("opening a hit opens its tab and keeps it revealed after clearing", async () => {
          await tree.treeSearchInput().fill("invoices");
          await expect(tree.getTreeNode("invoices")).toBeVisible();
          await tree.getTreeNode("invoices").dblclick();
          await expect(page.getByTestId("workspace-tab-invoices")).toBeVisible({ timeout: 15000 });

          await tree.treeSearchInput().fill("");
          await expect(status).toHaveCount(0);
          await expect(tree.getTreeNode("Tables")).toHaveAttribute("aria-expanded", "true");
          await expect(tree.getTreeNode("invoices")).toBeVisible();
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});
