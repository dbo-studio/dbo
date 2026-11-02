import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

type Spoken = { title: string; tag?: string; silent?: boolean; body?: string };

/** Notification settings steer what the system is told: kinds, focus, sound, and what a notification carries. */
test.describe("Notification settings", () => {
  test("a finished export speaks to the system as the settings say", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `nsettings-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-nsettings-${suffix}.db`;
    const table = `t_${suffix}`;
    ensureSqliteDbFile(dbPath);

    // A browser notification stand-in that records what it was asked to show.
    await page.addInitScript(() => {
      const spoken: unknown[] = [];
      (window as unknown as { __spoken: unknown[] }).__spoken = spoken;
      class FakeNotification {
        static permission = "granted";
        static requestPermission = async (): Promise<string> => "granted";
        onclick: (() => void) | null = null;
        constructor(title: string, options: object = {}) {
          spoken.push({ title, ...options });
        }
        close(): void {}
      }
      (window as unknown as { Notification: unknown }).Notification = FakeNotification;
      // Behind other windows, so the system is the one to speak.
      document.hasFocus = (): boolean => (window as unknown as { __focused?: boolean }).__focused === true;
    });

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settings = new SettingsPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        await page.request.post("/api/query/raw", { data: { connectionId, query: `CREATE TABLE ${table} (id INTEGER)` } });
        await page.request.post("/api/query/raw", { data: { connectionId, query: `INSERT INTO ${table} VALUES (1)` } });

        const spoken = async (): Promise<Spoken[]> =>
          page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken);
        const exportTable = (): Promise<unknown> =>
          page.request.post("/api/export", {
            data: { connectionId, table, query: `SELECT * FROM ${table}`, format: "csv", chunkSize: 100 },
          });

        await test.step("A finished export tells the system, with a title and nothing else", async () => {
          await exportTable();
          await expect.poll(async () => (await spoken()).length, { timeout: 30_000 }).toBe(1);
          const [one] = await spoken();
          expect(one.title).toBe("Export finished");
          expect(one.silent).toBe(true);
          expect(one.body).toBeUndefined();
        });

        await test.step("In front of the app a message in the app does it, not the system", async () => {
          await page.evaluate(() => ((window as unknown as { __focused: boolean }).__focused = true));
          await exportTable();
          await expect(page.getByText("Export finished").first()).toBeVisible({ timeout: 30_000 });
          expect(await spoken()).toHaveLength(1);
          await page.evaluate(() => ((window as unknown as { __focused: boolean }).__focused = false));
        });

        await test.step("A kind switched off stays quiet", async () => {
          await settings.open();
          await settings.navigateTo("Notifications");
          await page.getByTestId("notifications-export").click();
          await exportTable();
          // The inbox still gets it; only the telling stops.
          await expect
            .poll(async () => ((await (await page.request.get("/api/notifications")).json()) as { data: { items: unknown[] } }).data.items.length, { timeout: 30_000 })
            .toBe(3);
          await page.waitForTimeout(1_000);
          expect(await spoken()).toHaveLength(1);
          await page.getByTestId("notifications-export").click();
        });

        await test.step("Sound is off by default and the setting reaches the system", async () => {
          await page.getByTestId("notifications-sound").click();
          await exportTable();
          await expect.poll(async () => (await spoken()).length, { timeout: 30_000 }).toBe(2);
          expect((await spoken())[1].silent).toBe(false);
        });

        await test.step("The background wait is kept", async () => {
          const field = page.getByTestId("notifications-background-seconds");
          await field.fill("4");
          await page.reload();
          await settings.open();
          await settings.navigateTo("Notifications");
          await expect(page.getByTestId("notifications-background-seconds")).toHaveValue("4");
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
