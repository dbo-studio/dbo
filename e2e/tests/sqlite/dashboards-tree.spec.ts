import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, ObjectTreePage } from "../../pages";

/** Dashboards group in the connection tree: create, open, rename, duplicate and delete. */
test.describe("Dashboards in the tree", () => {
  test("create, rename, duplicate and delete a dashboard", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `dash-tree-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-dash-tree-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const createdName = `Revenue ${suffix}`;
        const renamedName = `Revenue Q1 ${suffix}`;

        await test.step("New dashboard from the group menu opens a tab", async () => {
          await tree.runTreeAction("Dashboards", "New dashboard");
          await page.getByTestId("dashboard-name-input").fill(createdName);
          await page.getByTestId("dashboard-name-submit").click();
          await expect(page.getByTestId("dashboard-tab")).toBeVisible();
          await expect(page.getByTestId("ai-board")).toHaveAttribute(
            "data-board",
            createdName,
          );
        });

        await test.step("It is listed under the group and survives a reload", async () => {
          await page.reload();
          await tree.waitForTreeLoad();
          await tree.getTreeNode("Dashboards").click();
          await expect(tree.getTreeNode(createdName)).toBeVisible();
        });

        await test.step("Rename updates the tree and the open tab", async () => {
          await tree.runTreeAction(createdName, "Rename");
          await page.getByTestId("dashboard-name-input").fill(renamedName);
          await page.getByTestId("dashboard-name-submit").click();
          await expect(tree.getTreeNode(renamedName)).toBeVisible();
          await expect(tree.getTreeNode(createdName)).toHaveCount(0);
        });

        await test.step("Duplicate adds a copy", async () => {
          await tree.runTreeAction(renamedName, "Duplicate");
          await expect(tree.getTreeNode(`${renamedName} (copy)`)).toBeVisible();
        });

        await test.step("Delete asks first, then removes the dashboard", async () => {
          await tree.runTreeAction(`${renamedName} (copy)`, "Delete");
          await tree.confirmDangerAction();
          await expect(tree.getTreeNode(`${renamedName} (copy)`)).toHaveCount(
            0,
          );
          await expect(tree.getTreeNode(renamedName)).toBeVisible();
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });

  test("create, edit, save and delete a question", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `question-tree-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-question-tree-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const name = `Signups ${suffix}`;

        await test.step("New question from the group menu opens its editor", async () => {
          await tree.runTreeAction("Reports", "New question");
          await expect(page.getByTestId("question-tab")).toBeVisible();
          await expect(page.getByTestId("ai-report-editor")).toBeVisible();
        });

        await test.step("Rename, change the chart and save", async () => {
          await page.getByTestId("ai-report-title").fill(name);
          await page.getByTestId("ai-report-type-number").click();
          await page.getByTestId("ai-report-run").click();
          await page.getByTestId("ai-report-save-canvas").click();
          await tree.getTreeNode("Reports").click();
          await expect(tree.getTreeNode(name)).toBeVisible();
        });

        await test.step("Saved changes survive a reload", async () => {
          await page.reload();
          await tree.waitForTreeLoad();
          await tree.getTreeNode("Reports").click();
          await tree.getTreeNode(name).click();
          await expect(page.getByTestId("ai-report-title")).toHaveValue(name);
          await expect(page.getByTestId("ai-report-type-number")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
        });

        await test.step("Delete asks first, then removes it and its tab", async () => {
          await tree.runTreeAction(name, "Delete");
          await tree.confirmDangerAction();
          await expect(tree.getTreeNode(name)).toHaveCount(0);
          await expect(page.getByTestId("question-tab")).toHaveCount(0);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
