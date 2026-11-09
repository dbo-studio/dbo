import { expect, test, type Page } from "@playwright/test";
import type { HostSqlEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { createHostSqlConnection, raw } from "./hostSql";
import { withConnectionCleanup } from "./safeCleanup";

type Item = { id: number; query: string; name?: string };

/** Query history and saved queries on SQL Server / ClickHouse, through the API the sidebar uses. */
export function defineSavedHistoryTests(engine: HostSqlEngine): void {
  test.describe(`History and saved queries ${engine}`, () => {
    async function withConnection(page: Page, testInfo: import("@playwright/test").TestInfo, body: (id: number) => Promise<void>): Promise<void> {
      const name = `${engine}-hist-${uniqueTestSuffix(testInfo)}`;
      await withConnectionCleanup(page, name, async () => body(await createHostSqlConnection(page, engine, name)));
    }
    const list = async (page: Page, path: string, id: number): Promise<Item[]> =>
      ((await (await page.request.get(`/api/${path}?connectionId=${id}&page=1&count=100`)).json()) as { data: Item[] }).data;

    test("an executed query is recorded in the history of that connection only", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        const marker = `e2e_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_");
        await raw(page, id, `SELECT 1 AS ${marker}`);
        await expect.poll(async () => (await list(page, "histories", id)).some((h) => h.query.includes(marker))).toBe(true);
      });
    });

    test("a failing query is not hidden from the history and does not break later runs", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        await raw(page, id, "SELEC 1");
        await raw(page, id, "SELECT 2 AS after_error");
        expect((await list(page, "histories", id)).some((h) => h.query.includes("after_error"))).toBe(true);
      });
    });

    test("history can be cleared", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        await raw(page, id, "SELECT 3 AS to_clear");
        const del = await page.request.delete(`/api/histories?connectionId=${id}`);
        expect(del.ok(), await del.text()).toBeTruthy();
        expect((await list(page, "histories", id)).some((h) => h.query.includes("to_clear"))).toBe(false);
      });
    });

    test("saved queries: create (named and unnamed), list, update, delete", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        const marker = `E2E_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_");
        const q = `SELECT '${marker}' AS m`;
        const named = await page.request.post("/api/saved", { data: { connectionId: id, name: "my query", query: q } });
        expect(named.ok(), await named.text()).toBeTruthy();
        const unnamed = await page.request.post("/api/saved", { data: { connectionId: id, query: `${q} -- second` } });
        expect(unnamed.ok(), await unnamed.text()).toBeTruthy();

        const items = await list(page, "saved", id);
        expect(items.find((i) => i.name === "my query")?.query).toBe(q);
        // Unnamed ones are named from the first characters of the SQL.
        expect(items.find((i) => i.query.endsWith("-- second"))?.name).toBe(`${q} -- second`.slice(0, 20));

        const target = items.find((i) => i.name === "my query")!;
        const upd = await page.request.patch(`/api/saved/${target.id}`, { data: { connectionId: id, name: "renamed", query: `${q} -- v2` } });
        expect(upd.ok(), await upd.text()).toBeTruthy();
        expect((await list(page, "saved", id)).find((i) => i.id === target.id)).toMatchObject({ name: "renamed" });

        expect((await page.request.delete(`/api/saved/${target.id}`)).ok()).toBeTruthy();
        expect((await list(page, "saved", id)).some((i) => i.id === target.id)).toBe(false);
      });
    });

    test("a saved query needs a connection and SQL", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        expect((await page.request.post("/api/saved", { data: { connectionId: id, query: "" } })).status()).toBe(422);
        expect((await page.request.post("/api/saved", { data: { query: "SELECT 1" } })).status()).toBeGreaterThanOrEqual(400);
      });
    });

    test("saved queries are kept per connection", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (id) => {
        await page.request.post("/api/saved", { data: { connectionId: id, name: "mine", query: "SELECT 1" } });
        expect((await list(page, "saved", id + 100000)).some((i) => i.name === "mine")).toBe(false);
      });
    });
  });
}
