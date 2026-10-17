import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { removeSqliteDbFile, setupSqliteConnection } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ObjectTreePage } from "../../pages";

/** Seeds tables before connecting, so the tree has folders and leaves to walk. */
function seedSqlite(dbPath: string): void {
  removeSqliteDbFile(dbPath);
  const ddl = ["alpha", "beta", "users", "orders"].map((t) => `create table ${t}(id integer primary key);`).join("");
  execFileSync("sqlite3", [dbPath, `${ddl} create view active_users as select * from users;`]);
}

const focused = (page: Page): Promise<string | null> =>
  page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);

async function expectFocus(page: Page, testId: string): Promise<void> {
  await expect.poll(() => focused(page)).toBe(testId);
}

test.describe("Object tree keyboard", () => {
  test("arrows, expand/collapse, type-ahead, Enter, context menu key and search keys", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `e2e-tree-kb-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-tree-kb-${suffix}.db`;
    const rootId = `tree-node-${connectionName.toLowerCase()}`;
    seedSqlite(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await setupSqliteConnection(page, connectionName, dbPath);
        const tree = new ObjectTreePage(page);
        const root = tree.getTreeNode(connectionName);

        await test.step("single tab stop and ARIA", async () => {
          await expect(root).toBeVisible();
          await expect(page.getByRole("tree")).toBeVisible();
          await expect(page.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
          await expect(root).toHaveAttribute("aria-level", "1");
        });

        await test.step("Right expands, Down/Right walk into children", async () => {
          await root.focus();
          if ((await root.getAttribute("aria-expanded")) !== "true") await page.keyboard.press("ArrowRight");
          await expect(root).toHaveAttribute("aria-expanded", "true");
          await page.keyboard.press("ArrowDown");
          await expectFocus(page, "tree-node-tables");
          await page.keyboard.press("ArrowRight");
          await expect(tree.getTreeNode("Tables")).toHaveAttribute("aria-expanded", "true");
          await expect(tree.getTreeNode("alpha")).toBeVisible();
          await page.keyboard.press("ArrowRight");
          await expectFocus(page, "tree-node-alpha");
          await expect(tree.getTreeNode("alpha")).toHaveAttribute("aria-level", "3");
        });

        await test.step("Home, End and type-ahead", async () => {
          await page.keyboard.press("End");
          await expectFocus(page, "tree-node-views");
          await page.keyboard.press("Home");
          await expectFocus(page, rootId);
          await page.keyboard.type("u");
          await expectFocus(page, "tree-node-users");
        });

        await test.step("Left goes to parent, then collapses it; focus stays in the tree", async () => {
          await page.keyboard.press("ArrowLeft");
          await expectFocus(page, "tree-node-tables");
          await page.keyboard.press("ArrowLeft");
          await expect(tree.getTreeNode("Tables")).toHaveAttribute("aria-expanded", "false");
          await expect(tree.getTreeNode("users")).toHaveCount(0);
          await expectFocus(page, "tree-node-tables");
        });

        await test.step("Shift+F10 opens the context menu with focus inside; Esc returns to the row", async () => {
          await page.keyboard.press("Shift+F10");
          await expect(page.getByRole("menu")).toBeVisible();
          await expect.poll(() => focused(page)).toMatch(/^context-menu-item-/);
          await page.keyboard.press("Escape");
          await expect(page.getByRole("menu")).toBeHidden();
          await expectFocus(page, "tree-node-tables");
        });

        await test.step("Enter opens a table", async () => {
          await page.keyboard.press("ArrowRight");
          await expect(tree.getTreeNode("Tables")).toHaveAttribute("aria-expanded", "true");
          await page.keyboard.type("or");
          await expectFocus(page, "tree-node-orders");
          await page.keyboard.press("Enter");
          await expect(page.getByTestId("workspace-tab-orders")).toBeVisible({ timeout: 15000 });
          await expect(page.getByTestId("data-grid")).toBeVisible({ timeout: 15000 });
        });

        await test.step("/ focuses search, Down enters results, Esc clears", async () => {
          await tree.getTreeNode("orders").focus();
          await page.keyboard.press("/");
          await expect(tree.treeSearchInput()).toBeFocused();
          await page.keyboard.type("bet");
          await expect(tree.getTreeNode("beta")).toBeVisible();
          await expect(tree.getTreeNode("alpha")).toHaveCount(0);
          await page.keyboard.press("ArrowDown");
          await expectFocus(page, rootId);
          await tree.treeSearchInput().focus();
          await page.keyboard.press("Escape");
          await expect(tree.treeSearchInput()).toHaveValue("");
          await expect(tree.getTreeNode("alpha")).toBeVisible();
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});
