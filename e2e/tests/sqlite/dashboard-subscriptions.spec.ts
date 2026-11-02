import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { attachments, FakeMailbox, FakeWebhook, htmlBody } from "../../helpers/fakeMailbox";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { BoardsPage, ConnectionPage, ObjectTreePage } from "../../pages";

type Sub = { id: number; nextRunAt: string; lastStatus: string; enabled: boolean };

/** Scheduled snapshots of a dashboard: email through SMTP settings, webhook with a signature, history, pause. */
test.describe("Dashboard subscriptions", () => {
  test("set up email and webhook schedules, send, fail, pause and run on time", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `subs-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-subs-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const mailbox = new FakeMailbox();
    const smtpPort = await mailbox.start();
    const webhook = new FakeWebhook();
    const hookUrl = await webhook.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);
        const boards = new BoardsPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await tree.waitForTreeLoad();

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const reportName = `Totals ${suffix}`;
        const make = async (name: string, sql: string): Promise<number> =>
          (
            await (
              await page.request.post("/api/questions", {
                data: { connectionId, name, sql, chart: { type: "table", y: [] } },
              })
            ).json()
          ).data.id;
        const good = await make(reportName, "SELECT 'a,b' AS label, 7 AS v UNION ALL SELECT '=SUM(1)', 8");
        const broken = await make(`Broken ${suffix}`, "SELECT * FROM table_that_is_missing");
        const boardName = `Digest ${suffix}`;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()
        ).data.id;
        for (const questionId of [good, broken]) {
          await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId } });
        }

        const subs = async (): Promise<Sub[]> =>
          ((await (await page.request.get(`/api/dashboards/${board}/subscriptions`)).json()) as { data: { items: Sub[] } }).data.items;

        await page.reload();
        await tree.waitForTreeLoad();
        await boards.openItem(boardName);

        await test.step("Email cannot be scheduled before the mail account is set", async () => {
          const refused = await page.request.post(`/api/dashboards/${board}/subscriptions`, {
            data: { kind: "email", target: "ops@example.test", frequency: "daily", hour: 9, minute: 0 },
          });
          expect(refused.status()).toBe(400);
          await page.getByTestId("dashboard-schedule").click();
          await expect(page.getByTestId("schedule-email-status")).toContainText("not set up");
        });

        await test.step("The mail account is saved without ever coming back out", async () => {
          await page.getByTestId("schedule-smtp-toggle").click();
          await page.getByTestId("smtp-host").fill("127.0.0.1");
          await page.getByTestId("smtp-port").fill(String(smtpPort));
          await page.getByTestId("smtp-username").fill("mailer");
          await page.getByTestId("smtp-password").fill("pw-secret");
          await page.getByTestId("smtp-fromAddress").fill("DBO <reports@example.test>");
          await page.getByTestId("smtp-security-none").click();
          await page.getByTestId("smtp-save").click();
          await expect(page.getByTestId("schedule-email-status")).toContainText("Email is set up");

          const saved = await (await page.request.get("/api/subscriptions/smtp")).text();
          expect(saved).toContain('"hasPassword":true');
          expect(saved).not.toContain("pw-secret");
        });

        await test.step("A daily email schedule shows its next run", async () => {
          await page.getByTestId("schedule-target").fill("ops@example.test, lead@example.test");
          await page.getByTestId("schedule-time").fill("09:00");
          await page.getByTestId("schedule-create").click();
          const row = page.getByTestId("schedule-row");
          await expect(row).toHaveCount(1);
          await expect(row).toContainText("Every day at 09:00");

          const [sub] = await subs();
          const next = new Date(sub.nextRunAt);
          expect(next.getTime()).toBeGreaterThan(Date.now());
          expect(next.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000 + 60_000);
          expect(await page.evaluate((iso) => new Date(iso).getHours(), sub.nextRunAt)).toBe(9);
        });

        await test.step("Send now emails a CSV per report that ran and a summary", async () => {
          await page.getByTestId("schedule-run-now").click();
          await expect.poll(() => mailbox.mails.length, { timeout: 20_000 }).toBe(1);
          const mail = mailbox.mails[0];
          expect(mail.to.sort()).toEqual(["lead@example.test", "ops@example.test"]);
          expect(mail.from).toBe("reports@example.test");
          expect(mail.login).toBe("\0mailer\0pw-secret");
          expect(mail.raw).toContain("Subject:");

          const files = attachments(mail.raw);
          expect(Object.keys(files)).toHaveLength(1);
          const [name, csv] = Object.entries(files)[0];
          expect(name).toMatch(/^Totals_.*\.csv$/);
          // A comma stays inside its quotes; a cell that looks like a formula is kept as text.
          expect(csv).toBe("label,v\n\"a,b\",7\n'=SUM(1),8\n");
          const html = htmlBody(mail.raw);
          expect(html).toContain(boardName);
          expect(html).toContain("could not be loaded");
        });

        await test.step("History records the run", async () => {
          await page.getByTestId("schedule-history-toggle").click();
          const run = page.getByTestId("schedule-run");
          await expect(run).toHaveCount(1);
          await expect(run).toHaveAttribute("data-status", "ok");
          await expect(run).toContainText("1 reports");
        });

        await test.step("A webhook gets signed JSON", async () => {
          await page.getByTestId("schedule-kind-webhook").click();
          await page.getByTestId("schedule-target").fill(hookUrl);
          await page.getByTestId("schedule-secret").fill("s3cret");
          await page.getByTestId("schedule-create").click();
          await expect(page.getByTestId("schedule-row")).toHaveCount(2);
          await page.getByTestId("schedule-row").nth(1).getByTestId("schedule-run-now").click();
          await expect.poll(() => webhook.hooks.length, { timeout: 20_000 }).toBe(1);

          const { headers, body } = webhook.hooks[0];
          expect(headers["x-dbo-event"]).toBe("dashboard.snapshot");
          expect(headers["x-dbo-signature"]).toBe(`sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`);
          const payload = JSON.parse(body) as {
            dashboard: { name: string };
            cards: Array<{ name: string; rows?: Array<Record<string, unknown>>; error?: string }>;
          };
          expect(payload.dashboard.name).toBe(boardName);
          expect(payload.cards[0].rows).toEqual([
            { label: "a,b", v: 7 },
            { label: "=SUM(1)", v: 8 },
          ]);
          // The failing report is named, with a generic message and never the query or the driver's words.
          expect(payload.cards[1].error).toBe("this report could not be loaded");
          expect(body).not.toContain("table_that_is_missing");
        });

        await test.step("A webhook that answers an error is a failed run, with the reason", async () => {
          webhook.status = 500;
          const row = page.getByTestId("schedule-row").nth(1);
          await row.getByTestId("schedule-run-now").click();
          await expect(row).toHaveAttribute("data-state", "failing", { timeout: 20_000 });
          await expect(row.getByTestId("schedule-last-error")).toContainText("answered 500");
          webhook.status = 200;
        });

        await test.step("Pause stops it and Resume brings it back", async () => {
          const row = page.getByTestId("schedule-row").nth(1);
          await row.getByTestId("schedule-toggle").click();
          await expect(row).toHaveAttribute("data-state", "paused");
          expect((await subs())[1].enabled).toBe(false);
          await row.getByTestId("schedule-toggle").click();
          await expect(row).not.toHaveAttribute("data-state", "paused");
        });

        await test.step("Bad input is refused", async () => {
          const bad = async (data: Record<string, unknown>): Promise<number> =>
            (await page.request.post(`/api/dashboards/${board}/subscriptions`, { data })).status();
          const base = { frequency: "daily", hour: 9, minute: 0 };
          expect(await bad({ ...base, kind: "email", target: "not an address" })).toBe(422);
          expect(await bad({ ...base, kind: "webhook", target: "ftp://example.test/x" })).toBe(422);
          expect(await bad({ ...base, kind: "webhook", target: hookUrl, hour: 25 })).toBe(422);
          expect(await bad({ ...base, kind: "webhook", target: hookUrl, timezone: "Mars/Base" })).toBe(422);
          expect(await bad({ ...base, kind: "webhook", target: hookUrl, frequency: "minutely" })).toBe(422);
        });

        await test.step("The scheduler sends on time without being asked", async () => {
          const before = webhook.hooks.length;
          const now = new Date();
          const made = await page.request.post(`/api/dashboards/${board}/subscriptions`, {
            data: {
              kind: "webhook",
              target: hookUrl,
              frequency: "hourly",
              minute: (now.getUTCMinutes() + 1) % 60,
              hour: 0,
              timezone: "UTC",
            },
          });
          const id = ((await made.json()) as { data: { id: number } }).data.id;
          await expect.poll(() => webhook.hooks.length, { timeout: 120_000, intervals: [2_000] }).toBeGreaterThan(before);

          const runs = (
            (await (await page.request.get(`/api/dashboards/${board}/subscriptions/${id}/runs`)).json()) as {
              data: Array<{ status: string; manual: boolean }>;
            }
          ).data;
          expect(runs).toHaveLength(1);
          expect(runs[0]).toMatchObject({ status: "ok", manual: false });
          // It moved on to the next hour, so it does not send twice.
          const after = (await subs()).find((item) => item.id === id) as Sub;
          expect(new Date(after.nextRunAt).getTime()).toBeGreaterThan(Date.now() + 30 * 60 * 1000);
        });

        await test.step("Deleting the dashboard removes its schedules", async () => {
          await page.request.delete(`/api/dashboards/${board}`);
          expect((await page.request.get(`/api/dashboards/${board}/subscriptions`)).status()).toBe(404);
        });
      });
    } finally {
      await mailbox.stop();
      await webhook.stop();
      removeSqliteDbFile(dbPath);
    }
  });
});
