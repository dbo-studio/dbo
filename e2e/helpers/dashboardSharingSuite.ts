import { expect, test } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ConnectionPage } from "../pages";
import { FakeWebhook } from "./fakeMailbox";
import { withConnectionCleanup } from "./safeCleanup";

/** Share links and subscriptions on a real server: the report runs with a bound filter for the visitor and the sender. */
export function defineDashboardSharingTests(engine: DbEngine): void {
  test.describe(`Dashboard sharing ${engine}`, () => {
    test("a shared link and a webhook subscription run the report with its filter", async ({ page, browser }, testInfo) => {
      test.setTimeout(120_000);
      const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
      const connectionName = `sharing-${suffix}`;
      const table = `e2e_s_${suffix}`;
      const baseURL = testInfo.project.use.baseURL as string;
      const hook = new FakeWebhook();

      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig(engine, connectionName));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string) => page.request.post("/api/query/raw", { data: { connectionId, query, backgroundAfterSeconds: 0 } });
        const hookUrl = await hook.start();

        try {
          await raw(`CREATE TABLE ${table} (region VARCHAR(20), amount INTEGER)`);
          await raw(`INSERT INTO ${table} VALUES ('east', 10), ('west', 20), ('east', 500)`);

          const question = (
            (await (
              await page.request.post("/api/questions", {
                data: {
                  connectionId,
                  name: `Total ${suffix}`,
                  sql: `SELECT sum(amount) AS total FROM ${table} WHERE region = {{region}}`,
                  chart: { type: "number", y: ["total"] },
                  params: { region: "east" },
                },
              })
            ).json()) as { data: { id: number } }
          ).data.id;
          const board = (
            (await (await page.request.post("/api/dashboards", { data: { connectionId, name: `Board ${suffix}` } })).json()) as {
              data: { id: number };
            }
          ).data.id;
          await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } });

          await test.step("A visitor sees the default value, and a changed one when the link allows it", async () => {
            const link = (
              (await (await page.request.post(`/api/dashboards/${board}/shares`, { data: { allowFilters: true } })).json()) as {
                data: { token: string };
              }
            ).data;
            const visitor = await browser.newContext({ baseURL });
            const view = async (params?: Record<string, string>) =>
              (
                (await (await visitor.request.post(`/api/public/dashboards/${link.token}`, { data: { params } })).json()) as {
                  data: { cards: Array<{ result: { rows: Array<Record<string, unknown>> } }> };
                }
              ).data.cards[0].result.rows;
            expect(Number((await view())[0].total)).toBe(510);
            expect(Number((await view({ region: "west" }))[0].total)).toBe(20);
            await visitor.close();
          });

          await test.step("A webhook run sends the rows", async () => {
            const made = await page.request.post(`/api/dashboards/${board}/subscriptions`, {
              data: { kind: "webhook", target: hookUrl, frequency: "daily", hour: 9, minute: 0 },
            });
            const id = ((await made.json()) as { data: { id: number } }).data.id;
            const run = (
              (await (await page.request.post(`/api/dashboards/${board}/subscriptions/${id}/run`)).json()) as {
                data: { status: string; error: string };
              }
            ).data;
            expect(run.error).toBe("");
            expect(run.status).toBe("ok");
            expect(hook.hooks).toHaveLength(1);
            expect(hook.hooks[0].body).toContain("510");
          });
        } finally {
          await hook.stop();
          await raw(`DROP TABLE IF EXISTS ${table}`);
        }
      });
    });
  });
}
