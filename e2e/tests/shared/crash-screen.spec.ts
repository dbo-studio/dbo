import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { CrashPage } from "../../pages";

const PERSIST_MARKER_KEY = "dbo_e2e_persist_marker";

/**
 * Crash screen: Reload clears frontend persist only (not backend connections).
 */
test.describe("Crash screen", () => {
  test("reload clears local persist and keeps server connections", async ({
    page,
  }, testInfo) => {
    const crashPage = new CrashPage(page);
    const connectionName = `crash-screen-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await test.step("Boot, create a server connection, and mark local persist", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("add-connection")).toBeVisible({
        timeout: 30000,
      });

      const createRes = await page.request.post("/api/connections", {
        data: {
          name: config.name,
          type: "postgresql",
          rememberPassword: true,
          options: {
            host: config.host,
            port: Number(config.port),
            username: config.username,
            password: config.password,
            database: config.database,
          },
        },
      });
      expect(createRes.ok()).toBeTruthy();

      await page.evaluate((key) => {
        localStorage.setItem(key, "1");
      }, PERSIST_MARKER_KEY);
    });

    await test.step("Open the crash screen", async () => {
      await crashPage.gotoCrash();
      await crashPage.expectVisible();
    });

    await test.step("Reload clears local persist and keeps the connection", async () => {
      await crashPage.reloadAndClear();
      await expect(crashPage.screen).toBeHidden({ timeout: 30000 });
      await expect(page.getByTestId("add-connection")).toBeVisible({
        timeout: 30000,
      });

      const marker = await page.evaluate(
        (key) => localStorage.getItem(key),
        PERSIST_MARKER_KEY,
      );
      expect(marker).toBeNull();

      const listRes = await page.request.get("/api/connections");
      expect(listRes.ok()).toBeTruthy();
      const listBody = (await listRes.json()) as {
        data: Array<{ name: string }>;
      };
      expect(listBody.data.some((connection) => connection.name === connectionName)).toBeTruthy();
    });
  });
});
