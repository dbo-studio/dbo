import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** A schedule that fails five times in a row pauses itself and says so in the notification center. */
test.describe("Subscription auto-pause", () => {
  test("five failed scheduled sends pause it and add a notification", async ({ page }, testInfo) => {
    test.setTimeout(480_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `autopause-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-autopause-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const boardName = `Pause ${suffix}`;
        const board = (
          (await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()) as {
            data: { id: number };
          }
        ).data.id;
        const question = (
          (await (
            await page.request.post("/api/questions", {
              data: { connectionId, name: "One", sql: "SELECT 1 AS n", chart: { type: "number", y: ["n"] } },
            })
          ).json()) as { data: { id: number } }
        ).data.id;
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } });

        // Nothing listens on port 9, so every send is refused.
        const schedule = (minute: number) => ({
          kind: "webhook",
          target: "http://127.0.0.1:9/hook",
          frequency: "hourly",
          hour: 0,
          minute,
          timezone: "UTC",
        });
        const soon = () => (new Date().getUTCMinutes() + 1) % 60;
        const made = await page.request.post(`/api/dashboards/${board}/subscriptions`, { data: schedule(soon()) });
        const id = ((await made.json()) as { data: { id: number } }).data.id;
        const state = async () =>
          (
            (await (await page.request.get(`/api/dashboards/${board}/subscriptions`)).json()) as {
              data: { items: Array<{ id: number; enabled: boolean; consecutiveFailures: number }> };
            }
          ).data.items.find((item) => item.id === id)!;

        for (let failures = 1; failures <= 5; failures++) {
          await expect.poll(async () => (await state()).consecutiveFailures, { timeout: 120_000, intervals: [3_000] }).toBe(failures);
          if (failures < 5) {
            expect((await state()).enabled).toBe(true);
            await page.request.patch(`/api/dashboards/${board}/subscriptions/${id}`, { data: schedule(soon()) });
          }
        }

        expect((await state()).enabled).toBe(false);
        const inbox = (
          (await (await page.request.get("/api/notifications")).json()) as {
            data: { items: Array<{ kind: string; body: string }> };
          }
        ).data.items;
        const entry = inbox.find((item) => item.kind === "subscription_paused");
        expect(entry?.body).toContain(boardName);

        await page.reload();
        await page.getByTestId("notification-bell").click();
        await expect(page.getByTestId("notification-item").filter({ hasText: "Subscription paused" })).toBeVisible();
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
