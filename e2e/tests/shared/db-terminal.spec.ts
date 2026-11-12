import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/**
 * The DB terminal and the bottom panel on a SQL (SQLite) connection. SQLite needs no server: an empty file is a valid
 * database, and the connection is created through the API.
 */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const headers = { "X-Client-Mode": "web" };

async function openSqliteConnection(page: Page, name: string): Promise<number> {
  const file = path.join(os.tmpdir(), `dbo-terminal-${name}.db`);
  fs.writeFileSync(file, "");

  const create = await page.request.post(`${apiUrl()}/connections`, {
    data: { name, type: "sqlite", options: { path: file } },
    headers,
  });
  expect(create.ok(), await create.text()).toBeTruthy();

  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.openSwitcher();
  await connectionPage.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });

  const list = await page.request.get(`${apiUrl()}/connections`, { headers });
  return ((await list.json()) as { data: { id: number; name: string }[] }).data.find((c) => c.name === name)!.id;
}

test.describe("DB terminal (SQL) and bottom panel", () => {
  let name: string;
  let connectionId: number;

  test.beforeEach(async ({ page }, testInfo) => {
    name = `term-${uniqueTestSuffix(testInfo)}`;
    connectionId = await openSqliteConnection(page, name);
  });

  test("the API runs a statement and refuses host-reaching SQL", async ({ page }) => {
    const run = (input: string) =>
      page.request.post(`${apiUrl()}/cli/run`, { data: { connectionId, input }, headers });

    const ok = await run("SELECT 1 AS n");
    expect(ok.ok(), await ok.text()).toBeTruthy();
    const body = (await ok.json()).data;
    expect(body.kind).toBe("table");
    expect(body.columns).toEqual(["n"]);
    expect(body.rows).toEqual([[1]]);

    for (const sql of ["SELECT load_extension('x')", "ATTACH DATABASE '/tmp/x.db' AS other"]) {
      const res = await run(sql);
      expect(res.status(), sql).toBe(403);
    }
  });

  test("bottom panel: terminal runs SQL, multi-line input, and History lives there", async ({ page }) => {
    await expect(page.getByTestId("bottom-panel")).toHaveCount(0);
    await page.getByTestId("open-terminal").click();
    const panel = page.getByTestId("bottom-panel");
    await expect(panel).toBeVisible();

    const terminal = page.getByTestId("db-terminal");
    await expect(terminal).toBeVisible({ timeout: 15000 });
    await terminal.click();

    await test.step("a statement spanning two lines runs when it ends with ;", async () => {
      await page.keyboard.type("SELECT 41 + 1");
      await page.keyboard.press("Enter");
      await page.keyboard.type("AS answer;");
      await page.keyboard.press("Enter");
      await expect(terminal).toContainText("answer", { timeout: 15000 });
      await expect(terminal).toContainText("42");
      await expect(terminal).toContainText("(1 row)");
    });

    await test.step("History is a tab of the bottom panel and lists the statement", async () => {
      await page.getByTestId("bottom-tab-history").click();
      await expect(panel).toContainText("SELECT 41 + 1", { timeout: 15000 });
    });

    await test.step("maximize grows the panel and restore brings it back", async () => {
      const height = async (): Promise<number> => (await page.getByTestId("bottom-panel").boundingBox())!.height;
      const before = await height();
      await page.getByRole("button", { name: "Maximize panel" }).click();
      await expect.poll(height).toBeGreaterThan(before + 100);
      await page.getByRole("button", { name: "Restore panel size" }).click();
      await expect.poll(height).toBeLessThan(before + 20);
    });

    await test.step("the explorer no longer has a History tab on desktop", async () => {
      await expect(page.getByRole("tab", { name: "History", exact: true })).toHaveCount(1); // the panel tab only
      await expect(page.getByTestId("sidebar-tab-history")).toHaveCount(0);
    });

    await test.step("the panel toggles from the footer and with Alt+J", async () => {
      // The footer History item closes the panel only while History is the open tab.
      await page.getByTestId("bottom-tab-history").click();
      await page.getByTestId("status-history").click();
      await expect(panel).toHaveCount(0);
      await page.keyboard.press("Alt+J");
      await expect(page.getByTestId("bottom-panel")).toBeVisible();
    });
  });

  test("control characters in data cannot move the cursor or restyle the terminal", async ({ page }) => {
    const run = await page.request.post(`${apiUrl()}/cli/run`, {
      data: { connectionId, input: "SELECT char(27) || '[2J' AS evil" },
      headers,
    });
    expect(run.ok(), await run.text()).toBeTruthy();

    await page.getByTestId("open-terminal").click();
    const terminal = page.getByTestId("db-terminal");
    await terminal.click();
    await page.keyboard.type("SELECT char(27) || '[31mRED' AS evil;");
    await page.keyboard.press("Enter");
    // The escape byte is replaced, so the sequence is printed as text instead of acting on the terminal.
    await expect(terminal).toContainText("[31mRED", { timeout: 15000 });
  });
});
