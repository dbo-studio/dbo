import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../../pages";

const slow = (rows: number): string =>
  `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<${rows}) SELECT count(*) AS n FROM c`;

/** The app side of background work: a waiting state in the tab, the bell, and opening a result from it. */
test.describe("Notification center", () => {
  test("a slow query runs in the background and its notification opens the rows", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ncenter-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ncenter-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    // A one second wait, so the test does not need a ten second query.
    await page.addInitScript(() => {
      const saved = JSON.parse(localStorage.getItem("settings") ?? '{"state":{},"version":0}') as { state: { general?: object } };
      saved.state.general = { ...saved.state.general, backgroundAfterSeconds: 1 };
      localStorage.setItem("settings", JSON.stringify(saved));
    });

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const editor = new SqlEditorPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const bell = page.getByTestId("notification-bell");
        await expect(bell).toBeVisible();
        // A badge with nothing to count is hidden, not emptied.
          await expect(page.getByTestId("notification-unread").locator(".MuiBadge-badge")).toBeHidden();

        await test.step("The tab shows a waiting state, and the rows arrive when the query ends", async () => {
          await editor.open();
          await editor.typeQuery(slow(150_000_000));
          // A query that moves to the background answers 202, which the run helper does not wait for.
          await editor.clickRun();
          await expect(page.getByTestId("background-query")).toBeVisible({ timeout: 15_000 });
          await expect(page.getByTestId("background-query-elapsed")).toBeVisible();
          // The rows come in on their own.
          await expect(page.getByTestId("background-query")).toHaveCount(0, { timeout: 90_000 });
          await expect(page.getByText("150000000").first()).toBeVisible();
        });

        await test.step("The bell counts it and the panel lists it", async () => {
          await expect(page.getByTestId("notification-unread")).toHaveText("1");
          await bell.click();
          const item = page.getByTestId("notification-item");
          await expect(item).toHaveCount(1);
          await expect(item).toHaveAttribute("data-kind", "job_completed");
          await expect(item).toContainText("Query finished");
        });

        await test.step("Opening it puts the rows in a new tab, and marks it read", async () => {
          await page.getByTestId("notification-item").click();
          await expect(page.getByText("150000000").first()).toBeVisible({ timeout: 15_000 });
          // A badge with nothing to count is hidden, not emptied.
          await expect(page.getByTestId("notification-unread").locator(".MuiBadge-badge")).toBeHidden();
          await bell.click();
          await expect(page.getByTestId("notification-item")).toHaveAttribute("data-read", "true");
        });

        await test.step("An entry can be removed", async () => {
          await page.getByTestId("notification-delete").click();
          await expect(page.getByTestId("notification-empty")).toBeVisible();
        });

        await test.step("A cancelled background query leaves the tab usable and no entry", async () => {
          // Clicking outside closes the panel.
          await page.locator(".MuiPopover-root .MuiBackdrop-root").click({ position: { x: 5, y: 300 } });
          await expect(page.getByTestId("notification-panel")).toBeHidden();
          await editor.open();
          await editor.typeQuery(slow(100_000_000_000));
          await editor.clickRun();
          await expect(page.getByTestId("background-query")).toBeVisible({ timeout: 15_000 });
          await page.getByTestId("background-query-cancel").click();
          await expect(page.getByTestId("background-query")).toHaveCount(0);
          await bell.click();
          await expect(page.getByTestId("notification-empty")).toBeVisible();
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
