import { expect, test } from "@playwright/test";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { ConnectionPage } from "../../pages";

test("Empty state lists saved connections and opens one", async ({ page }, testInfo) => {
  const name = `empty-state-${uniqueTestSuffix(testInfo)}`;
  const dbPath = `/tmp/dbo-e2e-${name}.db`;
  ensureSqliteDbFile(dbPath);
  const connectionPage = new ConnectionPage(page);

  try {
    await connectionPage.goto();
    await connectionPage.waitForReady();
    // A fresh app opens the New connection dialog on its own.
    await connectionPage.dismissNewConnectionModalIfOpen();
    await connectionPage.createConnection(getDbConfig("sqlite", name, dbPath));

    // Close it through the API and reload: saved connection, none active.
    const list = (await (await page.request.get("/api/connections")).json()) as {
      data: { id: number; name: string }[];
    };
    const saved = list.data.find((c) => c.name === name);
    expect(saved).toBeTruthy();
    await page.request.patch(`/api/connections/${saved?.id}`, { data: { isActive: false, isClose: true } });
    await page.reload();

    const emptyList = page.getByTestId("empty-connections-list");
    await expect(emptyList).toBeVisible({ timeout: 15000 });
    await expect(emptyList.getByRole("button", { name })).toBeVisible();
    // The native file dialog exists only in the desktop app.
    await expect(page.getByTestId("open-database-file")).toBeHidden();

    await emptyList.getByRole("button", { name }).click();
    await connectionPage.expectConnectionActive(name);
  } finally {
    removeSqliteDbFile(dbPath);
  }
});
