import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/** Bottom panel (terminal, history) and the Browse list divider. SQLite and the fixture driver need no server. */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const headers = { "X-Client-Mode": "web" };

async function open(page: Page, name: string, type: "sqlite" | "nosql_fixture"): Promise<void> {
  const options: Record<string, unknown> = {};
  if (type === "sqlite") {
    const file = path.join(os.tmpdir(), `dbo-panels-${name}.db`);
    fs.writeFileSync(file, "");
    options.path = file;
  }
  const create = await page.request.post(`${apiUrl()}/connections`, { data: { name, type, options }, headers });
  expect(create.ok(), await create.text()).toBeTruthy();

  const cp = new ConnectionPage(page);
  await cp.goto();
  await cp.waitForReady();
  await cp.openSwitcher();
  await cp.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
}

const height = async (page: Page): Promise<number> => (await page.getByTestId("bottom-panel").boundingBox())!.height;

test.describe("bottom panel", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await open(page, `panel-${uniqueTestSuffix(testInfo)}`, "sqlite");
    await page.getByTestId("open-terminal").click();
    await expect(page.getByTestId("db-terminal")).toBeVisible({ timeout: 15000 });
  });

  test("size and open state survive a reload; maximize and restore work", async ({ page }) => {
    const base = await height(page);
    await page.getByRole("button", { name: "Maximize panel" }).click();
    await expect.poll(() => height(page)).toBeGreaterThan(base + 100);
    const tall = await height(page);

    await page.reload();
    await expect(page.getByTestId("bottom-panel")).toBeVisible({ timeout: 20000 });
    expect(Math.abs((await height(page)) - tall)).toBeLessThan(8);

    await page.getByRole("button", { name: "Restore panel size" }).click();
    await expect.poll(() => height(page)).toBeLessThan(tall - 100);

    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(page.getByTestId("bottom-panel")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("bottom-panel")).toHaveCount(0);
  });

  test("clear wipes the terminal screen", async ({ page }) => {
    const term = page.getByTestId("db-terminal");
    await term.click();
    await page.keyboard.type("SELECT 'marker-xyz' AS m;");
    await page.keyboard.press("Enter");
    await expect(term).toContainText("marker-xyz", { timeout: 15000 });
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByTestId("db-terminal")).not.toContainText("marker-xyz");
  });

  test("history groups by day, filters reads and writes, and opens a statement in an editor", async ({ page }) => {
    const term = page.getByTestId("db-terminal");
    await term.click();
    for (const sql of ["CREATE TABLE hx(a);", "SELECT 7 AS seven;"]) {
      await page.keyboard.type(sql);
      await page.keyboard.press("Enter");
      await expect(term).toContainText(sql.startsWith("CREATE") ? "OK" : "seven", { timeout: 15000 });
    }

    await page.getByTestId("bottom-tab-history").click();
    const panel = page.getByTestId("history-panel");
    await expect(panel).toContainText(/today/i);
    const items = panel.getByTestId("history-item");
    await expect(items).toHaveCount(2);

    await panel.getByRole("button", { name: "Reads" }).click();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("SELECT 7");
    await panel.getByRole("button", { name: "Writes" }).click();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("CREATE TABLE hx");
    await panel.getByRole("button", { name: "All" }).click();

    await panel.getByPlaceholder("Search").fill("seven");
    await expect(items).toHaveCount(1);

    await items.first().hover();
    await items.first().getByRole("button", { name: "Run" }).click();
    await expect(page.getByTestId("bottom-panel")).toBeVisible();
    await expect(page.locator(".monaco-editor").first()).toContainText("SELECT 7", { timeout: 15000 });
  });
});

test.describe("Browse list divider", () => {
  test("drag resizes the list, the width persists, double-click resets", async ({ page }, testInfo) => {
    await open(page, `divider-${uniqueTestSuffix(testInfo)}`, "nosql_fixture");
    const node = page.getByTestId("tree-node-keys");
    if (!(await node.isVisible().catch(() => false))) await page.getByTestId("tree-node-fixture").click();
    await node.dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });

    const list = page.getByTestId("browse-list");
    const width = async (): Promise<number> => (await list.boundingBox())!.width;
    const start = await width();

    const handle = page.getByTestId("browse-tab").getByTestId("resize-handle");
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 40, { steps: 6 });
    await page.mouse.up();
    await expect.poll(width).toBeGreaterThan(start + 100);
    const dragged = await width();

    await page.reload();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 20000 });
    expect(Math.abs((await width()) - dragged)).toBeLessThan(8);

    await page.getByTestId("browse-tab").getByTestId("resize-handle").dblclick();
    // The width animates back, so wait for it to settle on the original.
    await expect.poll(async () => Math.abs((await width()) - start)).toBeLessThan(8);
  });
});

test.describe("connection box in every sidebar area", () => {
  test("Items, Boards and Backup all show the connection switcher", async ({ page }, testInfo) => {
    const name = `box-${uniqueTestSuffix(testInfo)}`;
    await open(page, name, "sqlite");
    const box = page.getByTestId("connection-switcher");
    await expect(box).toContainText(name);

    for (const rail of ["sidebar-tab-boards", "activity-backup"]) {
      await page.getByTestId(rail).click();
      await expect(box).toBeVisible();
      await expect(box).toContainText(name);
    }
  });
});
