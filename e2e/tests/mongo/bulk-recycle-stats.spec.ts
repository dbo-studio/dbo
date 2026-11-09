// @cap: BulkDelete BulkDeletePattern Recycle Stats
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useMongo } from "./_case";

/** Mongo bulk delete by filter, the recycle bin and collection stats. */
test.describe("MongoDB bulk delete, recycle bin and stats", () => {
  const m = useMongo("bulk");
  const preview = (page: import("@playwright/test").Page, pattern: string) =>
    page.request.get(`${apiUrl()}/nosql/bulk-delete/preview`, { params: { connectionId: m.s.id, containerId: m.s.container, pattern }, headers });
  const bulk = (page: import("@playwright/test").Page, pattern: string, confirmName: string) =>
    page.request.post(`${apiUrl()}/nosql/bulk-delete`, { data: { connectionId: m.s.id, containerId: m.s.container, pattern, confirmName }, headers });
  const recycle = async (page: import("@playwright/test").Page) =>
    (await j(await page.request.get(`${apiUrl()}/nosql/recycle`, { params: { connectionId: m.s.id }, headers }))) as { id: number; itemId: string }[];
  const restore = (page: import("@playwright/test").Page, id: number) =>
    page.request.post(`${apiUrl()}/nosql/recycle/${id}/restore`, { params: { connectionId: m.s.id }, data: { confirmed: true }, headers });

  const seed = async (page: import("@playwright/test").Page, junk: number): Promise<void> => {
    for (let i = 0; i < junk; i++) await m.add(page, `{"n":${i},"kind":"junk"}`);
    await m.add(page, '{"kind":"keep"}');
  };

  test("preview counts the documents a filter matches", async ({ page }) => {
    await seed(page, 6);
    const p = await j(await preview(page, '{"kind":"junk"}'));
    expect(p.count).toBe(6);
    expect(p.capped).toBe(false);
  });

  test("the pattern * matches every document", async ({ page }) => {
    await seed(page, 3);
    expect((await j(await preview(page, "*"))).count).toBe(4);
  });

  test("an invalid or $where filter is refused", async ({ page }) => {
    expect((await preview(page, "{oops")).ok()).toBeFalsy();
    expect((await preview(page, '{"$where":"1==1"}')).ok()).toBeFalsy();
    expect((await bulk(page, '{"$where":"1==1"}', m.s.name)).ok()).toBeFalsy();
  });

  test("a wrong or empty confirmation name deletes nothing", async ({ page }) => {
    await seed(page, 2);
    expect((await bulk(page, '{"kind":"junk"}', "nope")).status()).toBe(400);
    expect((await bulk(page, '{"kind":"junk"}', "")).status()).toBe(400);
    expect(((await j(await m.api(page).browse())).items as unknown[]).length).toBe(3);
  });

  test("the job deletes the matches, keeps the rest and recycles what it deleted", async ({ page }) => {
    await seed(page, 5);
    const res = await bulk(page, '{"kind":"junk"}', m.s.name);
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect
      .poll(async () => ((await j(await m.api(page).browse({ limit: 100 }))).items as unknown[]).length, { timeout: 60000, intervals: [1000] })
      .toBe(1);
    await expect.poll(async () => (await recycle(page)).length, { timeout: 30000, intervals: [1000] }).toBeGreaterThanOrEqual(5);
  });

  test("a deleted document is restored with its _id and types", async ({ page }) => {
    const id = await m.add(page, '{"name":"alice","age":{"$numberInt":"30"},"at":{"$date":{"$numberLong":"1700000000000"}}}');
    const before = (await j(await m.api(page).get(id))).value as string;
    await m.api(page).remove([id]);
    expect((await m.api(page).get(id)).ok()).toBeFalsy();
    const entry = (await recycle(page)).find((e) => e.itemId === id);
    expect(entry, "recycle entry").toBeTruthy();
    expect((await restore(page, entry!.id)).ok()).toBeTruthy();
    expect(JSON.parse((await j(await m.api(page).get(id))).value)).toEqual(JSON.parse(before));
  });

  test("restore is single use and never overwrites", async ({ page }) => {
    const id = await m.add(page, '{"v":1}');
    await m.api(page).remove([id]);
    const entry = (await recycle(page)).find((e) => e.itemId === id)!;
    expect((await restore(page, entry.id)).ok()).toBeTruthy();
    expect((await restore(page, entry.id)).ok()).toBeFalsy();
  });

  test("an unknown recycle id is refused", async ({ page }) => {
    expect((await restore(page, 999999)).ok()).toBeFalsy();
  });

  test("stats report the document count, size and the _id index", async ({ page }) => {
    await seed(page, 4);
    const res = await page.request.get(`${apiUrl()}/nosql/stats`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers });
    const stats = await j(res);
    expect(JSON.stringify(stats)).toContain("_id_");
    expect(JSON.stringify(stats)).toMatch(/5/);
  });

  test("a created index shows up in the stats", async ({ page }) => {
    await seed(page, 1);
    await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
      data: { connectionId: m.s.id, input: `db.${m.s.coll}.createIndex({"kind":1})`, confirmed: true },
      headers,
    });
    const res = await page.request.get(`${apiUrl()}/nosql/stats`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers });
    expect(JSON.stringify(await j(res))).toContain("kind_1");
  });

  test("stats of a container that is not a collection are refused", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/stats`, { params: { connectionId: m.s.id, containerId: "bad" }, headers });
    expect(res.ok()).toBeFalsy();
  });
});
