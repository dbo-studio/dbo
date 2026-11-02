import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, ObjectTreePage } from "../../pages";

/** Share links: a read-only page for visitors without a session, with expiry, password and revoke. */
test.describe("Dashboard share links", () => {
  test("create, protect, view as a visitor, expire and revoke a link", async ({ page, browser }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `share-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-share-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const baseURL = testInfo.project.use.baseURL as string;

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await tree.waitForTreeLoad();

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const secretSql = "SELECT 42 AS answer";
        const question = (
          await (
            await page.request.post("/api/questions", {
              data: { connectionId, name: `Answer ${suffix}`, sql: secretSql, chart: { type: "number", y: ["answer"] } },
            })
          ).json()
        ).data.id;
        const boardName = `Shared ${suffix}`;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()
        ).data.id;
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } });

        await page.reload();
        await tree.waitForTreeLoad();
        await tree.getTreeNode("Dashboards").click();
        await tree.getTreeNode(boardName).dblclick();

        let link = "";
        await test.step("The owner creates a password-protected link that expires tomorrow", async () => {
          await page.getByTestId("dashboard-share").click();
          await page.getByTestId("share-preset-1").click();
          await page.getByTestId("share-password").fill("open-sesame");
          await page.getByTestId("share-create").click();
          link = await page.getByTestId("share-link").inputValue();
          expect(link).toMatch(new RegExp(`^${baseURL}/share/[A-Za-z0-9_-]{43}$`));

          const row = page.getByTestId("share-row");
          await expect(row).toHaveCount(1);
          await expect(row).toHaveAttribute("data-status", "active");
          await expect(row).toContainText("Password");
        });

        const visitor = await browser.newContext({ baseURL });
        const shared = await visitor.newPage();

        await test.step("A visitor needs the password, and a wrong one is refused", async () => {
          const responses: string[] = [];
          shared.on("response", async (response) => {
            if (response.url().includes("/api/public/")) responses.push(await response.text().catch(() => ""));
          });
          await shared.goto(link);
          await expect(shared.getByTestId("shared-password")).toBeVisible();
          await shared.getByTestId("shared-password-input").fill("nope");
          await shared.getByTestId("shared-password-submit").click();
          await expect(shared.getByTestId("shared-password-error")).toBeVisible();

          await shared.getByTestId("shared-password-input").fill("open-sesame");
          await shared.getByTestId("shared-password-submit").click();
          await expect(shared.getByTestId("shared-dashboard-name")).toHaveText(boardName);
          await expect(shared.getByTestId("shared-card").getByTestId("ai-chart")).toContainText("42");
          // The visitor gets rows, never the query.
          expect(responses.join("")).not.toContain(secretSql);
          await expect(shared.getByTestId("shared-card")).not.toContainText("SELECT");
        });

        await test.step("The page offers no editing or sharing", async () => {
          // That the rest of the API is closed to visitors is checked with sign-in on: auth-dashboard-share.
          await expect(shared.getByTestId("dashboard-edit")).toHaveCount(0);
          await expect(shared.getByTestId("dashboard-share")).toHaveCount(0);
        });

        await test.step("The owner removes the password; the visitor then needs none", async () => {
          await page.getByTestId("share-edit").click();
          await page.getByTestId("share-edit-password-remove").click();
          await expect(page.getByTestId("share-row")).not.toContainText("Password");

          const fresh = await visitor.newPage();
          await fresh.goto(link);
          await expect(fresh.getByTestId("shared-dashboard-name")).toHaveText(boardName);
          await fresh.close();
        });

        await test.step("The owner sets an expiry date from the dialog", async () => {
          const next = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("sv");
          await page.getByTestId("share-edit-date").fill(next);
          await page.getByTestId("share-edit-save").click();
          await expect(page.getByTestId("share-row")).toContainText(
            new Date(`${next}T23:59:59`).toLocaleDateString(),
          );
        });

        await test.step("A link past its expiry stops working", async () => {
          const soon = new Date(Date.now() + 2_000).toISOString();
          const made = await page.request.post(`/api/dashboards/${board}/shares`, { data: { expiresAt: soon } });
          const token = ((await made.json()) as { data: { token: string } }).data.token;
          expect((await visitor.request.post(`/api/public/dashboards/${token}`, { data: {} })).status()).toBe(200);
          await page.waitForTimeout(2_500);
          expect((await visitor.request.post(`/api/public/dashboards/${token}`, { data: {} })).status()).toBe(404);

          const past = await page.request.post(`/api/dashboards/${board}/shares`, {
            data: { expiresAt: new Date(Date.now() - 1000).toISOString() },
          });
          expect(past.status()).toBe(422);
        });

        await test.step("Revoke turns the link off at once", async () => {
          await page.getByTestId("share-revoke").first().click();
          await expect(page.locator('[data-testid="share-row"][data-status="revoked"]').first()).toBeVisible();

          const gone = await visitor.newPage();
          await gone.goto(link);
          await expect(gone.getByText("This link is not available")).toBeVisible();
          await gone.close();
        });

        await test.step("Guessing tokens is rate limited and learns nothing", async () => {
          const statuses: number[] = [];
          for (let i = 0; i < 35; i += 1) {
            statuses.push((await visitor.request.post("/api/public/dashboards/not-a-real-token", { data: {} })).status());
          }
          expect(new Set(statuses.slice(0, 30))).toEqual(new Set([404]));
          expect(statuses.at(-1)).toBe(429);
        });

        await visitor.close();
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });

  test("viewer filters are opt in and bound, and every visit is logged", async ({ page, browser }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `share-filters-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-share-filters-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const baseURL = testInfo.project.use.baseURL as string;

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await tree.waitForTreeLoad();

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const question = (
          await (
            await page.request.post("/api/questions", {
              data: {
                connectionId,
                name: `Doubled ${suffix}`,
                sql: "SELECT {{n:number}} * 2 AS doubled",
                chart: { type: "number", y: ["doubled"] },
                params: { n: "5" },
              },
            })
          ).json()
        ).data.id;
        const boardName = `Filtered share ${suffix}`;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()
        ).data.id;
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } });

        const visitor = await browser.newContext({ baseURL });
        const view = async (token: string, data: object = {}) => {
          const answer = await visitor.request.post(`/api/public/dashboards/${token}`, { data });
          return { status: answer.status(), body: (await answer.json()) as { data?: any } };
        };
        const makeLink = async (data: object): Promise<{ id: number; token: string }> =>
          ((await (await page.request.post(`/api/dashboards/${board}/shares`, { data })).json()) as { data: { id: number; token: string } }).data;

        await test.step("A link without filters ignores what a viewer sends", async () => {
          const link = await makeLink({});
          const answer = await view(link.token, { params: { n: "21" } });
          expect(answer.body.data.filters).toEqual([]);
          expect(JSON.stringify(answer.body.data.cards[0].result.rows)).toContain("10");
        });

        const open = await makeLink({ allowFilters: true });

        await test.step("A link that allows filters lists them and runs the viewer's values", async () => {
          const start = await view(open.token);
          expect(start.body.data.filters).toEqual([{ name: "n", type: "number", value: "5" }]);

          const changed = await view(open.token, { params: { n: "21" } });
          expect(JSON.stringify(changed.body.data.cards[0].result.rows)).toContain("42");
        });

        await test.step("A value that is not a number is refused as data, with no query in the answer", async () => {
          const bad = await view(open.token, { params: { n: "1 OR 1=1" } });
          expect(bad.status).toBe(200);
          expect(bad.body.data.cards[0].error).toBe("this report could not be loaded");
          expect(JSON.stringify(bad.body)).not.toContain("SELECT");
        });

        await test.step("The shared page shows the filter and reruns on a new value", async () => {
          const shared = await visitor.newPage();
          await shared.goto(`/share/${open.token}`);
          await expect(shared.getByTestId("shared-filters")).toBeVisible();
          await expect(shared.getByTestId("param-n")).toHaveValue("5");
          await expect(shared.getByTestId("shared-card").getByTestId("ai-chart")).toContainText("10");
          await shared.getByTestId("param-n").fill("21");
          await shared.getByTestId("param-n").press("Enter");
          await expect(shared.getByTestId("shared-card").getByTestId("ai-chart")).toContainText("42");
          await shared.close();
        });

        await test.step("Every visit is in the link's log, with how it went", async () => {
          const locked = await makeLink({ password: "pw-1234" });
          await view(locked.token);
          await view(locked.token, { password: "wrong" });
          await view(locked.token, { password: "pw-1234" });
          const visits = (
            (await (await page.request.get(`/api/dashboards/${board}/shares/${locked.id}/visits`)).json()) as {
              data: Array<{ outcome: string; ip: string }>;
            }
          ).data;
          expect(visits.map((visit) => visit.outcome)).toEqual(["ok", "wrong_password", "password_required"]);
          expect(visits[0].ip).not.toBe("");
        });

        await page.reload();
        await tree.waitForTreeLoad();

        await test.step("The owner turns filters on and reads the log in the dialog", async () => {
          await tree.getTreeNode("Dashboards").click();
          await tree.getTreeNode(boardName).dblclick();
          await page.getByTestId("dashboard-share").click();
          await page.getByTestId("share-visits-toggle").first().click();
          await expect(page.getByTestId("share-visit").first()).toBeVisible();
          await page.getByTestId("share-allow-filters").check();
          await page.getByTestId("share-create").click();
          await expect(page.getByText("Filters open").first()).toBeVisible();
        });

        await visitor.close();
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
