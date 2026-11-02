import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { FakeWebhook } from "../../helpers/fakeMailbox";
import { AuthPage } from "../../pages/AuthPage";
import { ConnectionPage } from "../../pages/ConnectionPage";

/**
 * With sign-in required, a share link still opens for a visitor without a session, and only the link's
 * own page: the rest of the API stays closed to them. Requires E2E_LOCAL_AUTH=1.
 * Run: npm run test:auth
 */
test.describe("Dashboard share links with sign-in required", () => {
  test.beforeEach(() => {
    test.skip(process.env.E2E_LOCAL_AUTH !== "1", "Set E2E_LOCAL_AUTH=1 to run local auth stack");
  });

  test("a visitor sees the shared board and nothing else", async ({ page, browser }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `auth-share-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-auth-share-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const baseURL = testInfo.project.use.baseURL as string;

    try {
      await new AuthPage(page).loginAdmin();
      await withConnectionCleanup(page, connectionName, async () => {
        await new ConnectionPage(page).setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const question = (
          await (
            await page.request.post("/api/questions", {
              data: { connectionId, name: "Answer", sql: "SELECT 42 AS answer", chart: { type: "number", y: ["answer"] } },
            })
          ).json()
        ).data.id;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: `Auth ${suffix}` } })).json()
        ).data.id;
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } });
        const made = await page.request.post(`/api/dashboards/${board}/shares`);
        const share = ((await made.json()) as { data: { id: number; token: string } }).data;

        const visitor = await browser.newContext({ baseURL });
        const shared = await visitor.newPage();

        await test.step("The link opens without a session", async () => {
          await shared.goto(`/share/${share.token}`);
          await expect(shared.getByTestId("shared-dashboard-name")).toHaveText(`Auth ${suffix}`);
          await expect(shared.getByTestId("shared-card").getByTestId("ai-chart")).toContainText("42");
        });

        await test.step("The rest of the API is closed to the visitor", async () => {
          for (const path of [
            `/api/dashboards?connectionId=${connectionId}`,
            `/api/dashboards/${board}/shares`,
            `/api/questions?connectionId=${connectionId}`,
            "/api/connections",
          ]) {
            expect((await visitor.request.get(path)).status(), path).toBe(401);
          }
        });

        await test.step("With sign-in on, a webhook cannot be aimed at the server's own network", async () => {
          const hook = new FakeWebhook();
          const url = await hook.start();
          try {
            const made = await page.request.post(`/api/dashboards/${board}/subscriptions`, {
              data: { kind: "webhook", target: url, frequency: "daily", hour: 9, minute: 0 },
            });
            const subId = ((await made.json()) as { data: { id: number } }).data.id;
            const run = (
              (await (await page.request.post(`/api/dashboards/${board}/subscriptions/${subId}/run`)).json()) as {
                data: { status: string; error: string };
              }
            ).data;
            expect(run.status).toBe("failed");
            expect(run.error).toContain("private or local address");
            // Nothing reached the receiver.
            expect(hook.hooks).toHaveLength(0);
          } finally {
            await hook.stop();
          }
        });

        await test.step("Revoke closes the link for the visitor", async () => {
          await page.request.delete(`/api/dashboards/${board}/shares/${share.id}`);
          expect((await visitor.request.post(`/api/public/dashboards/${share.token}`, { data: {} })).status()).toBe(404);
        });

        await visitor.close();
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
