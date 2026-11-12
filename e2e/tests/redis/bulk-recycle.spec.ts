// @cap: BulkDelete BulkDeletePattern Recycle
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { KINDS, useRedis } from "../../helpers/redisCase";

/** Redis bulk delete by pattern (preview, typed confirmation, job) and the recycle bin for every key type. */
test.describe("Redis bulk delete and recycle bin", () => {
  const r = useRedis();
  const key = (n: string): string => `${r.s.prefix}:${n}`;
  const str = (id: string) => ({ id, view: "text", value: "v", meta: { kind: "string" } });

  const preview = (page: import("@playwright/test").Page, pattern: string) =>
    page.request.get(`${apiUrl()}/nosql/bulk-delete/preview`, { params: { connectionId: r.s.id, containerId: "db0", pattern }, headers });
  const bulk = (page: import("@playwright/test").Page, pattern: string, confirmName: string) =>
    page.request.post(`${apiUrl()}/nosql/bulk-delete`, { data: { connectionId: r.s.id, containerId: "db0", pattern, confirmName }, headers });

  test.describe("bulk delete", () => {
    test("preview counts only matching keys", async ({ page }) => {
      for (let i = 0; i < 7; i++) await r.api(page).insert(str(key(`m:${i}`)));
      await r.api(page).insert(str(key("other")));
      const p = await j(await preview(page, `${r.s.prefix}:m:*`));
      expect(p.count).toBe(7);
      expect(p.capped).toBe(false);
    });

    test("preview of a pattern that matches nothing is zero", async ({ page }) => {
      expect((await j(await preview(page, `${r.s.prefix}:none:*`))).count).toBe(0);
    });

    test("a wrong or empty confirmation name is refused and nothing is deleted", async ({ page }) => {
      await r.api(page).insert(str(key("safe:1")));
      expect((await bulk(page, `${r.s.prefix}:safe:*`, "nope")).status()).toBe(400);
      // An empty name fails request validation (422); a wrong name reaches the service check (400).
      expect((await bulk(page, `${r.s.prefix}:safe:*`, "")).status()).toBe(422);
      expect((await r.api(page).get(key("safe:1"))).ok()).toBeTruthy();
    });

    test("the job deletes the matches and keeps everything else", async ({ page }) => {
      for (let i = 0; i < 30; i++) await r.api(page).insert(str(key(`del:${i}`)));
      await r.api(page).insert(str(key("keep")));
      const res = await bulk(page, `${r.s.prefix}:del:*`, r.s.name);
      expect(res.ok(), await res.text()).toBeTruthy();
      expect((await j(res)).jobId).toBeGreaterThan(0);
      await expect
        .poll(async () => ((await j(await r.api(page).browse({ filter: `${r.s.prefix}:del:*`, limit: 100 }))).items as unknown[]).length, {
          timeout: 60000,
          intervals: [1000],
        })
        .toBe(0);
      expect((await r.api(page).get(key("keep"))).ok()).toBeTruthy();
    });

    test("bulk deletes are not undoable, so nothing lands in the recycle bin", async ({ page }) => {
      for (let i = 0; i < 3; i++) await r.api(page).insert(str(key(`rb:${i}`)));
      await bulk(page, `${r.s.prefix}:rb:*`, r.s.name);
      await expect
        .poll(async () => (await r.api(page).get(key("rb:0"))).ok(), { timeout: 60000, intervals: [1000] })
        .toBeFalsy();
      const list = (await j(await page.request.get(`${apiUrl()}/nosql/recycle`, { params: { connectionId: r.s.id }, headers }))) as { itemId: string }[];
      expect(list.filter((e) => e.itemId.startsWith(`${r.s.prefix}:rb:`))).toHaveLength(0);
    });
  });

  test.describe("recycle bin", () => {
    const list = async (page: import("@playwright/test").Page) =>
      (await j(await page.request.get(`${apiUrl()}/nosql/recycle`, { params: { connectionId: r.s.id }, headers }))) as { id: number; itemId: string }[];
    const restore = (page: import("@playwright/test").Page, id: number) =>
      page.request.post(`${apiUrl()}/nosql/recycle/${id}/restore`, { params: { connectionId: r.s.id }, data: { confirmed: true }, headers });

    for (const kind of Object.keys(KINDS) as (keyof typeof KINDS)[]) {
      test(`${kind}: a deleted key comes back with its value`, async ({ page }) => {
        const api = r.api(page);
        const id = key(`rec-${kind}`);
        await api.insert({ id, view: KINDS[kind].view, value: KINDS[kind].value, meta: { kind } });
        const before = await j(await api.get(id));
        await api.remove([id]);
        expect((await api.get(id)).ok()).toBeFalsy();
        const entry = (await list(page)).find((e) => e.itemId === id);
        expect(entry, "recycle entry").toBeTruthy();
        expect((await restore(page, entry!.id)).ok()).toBeTruthy();
        const after = await j(await api.get(id));
        expect(after.meta.type).toBe(kind);
        if (kind === "set") expect([...after.value].sort()).toEqual([...before.value].sort());
        else expect(after.value).toEqual(before.value);
      });
    }

    test("restore never overwrites a key that exists again", async ({ page }) => {
      const api = r.api(page);
      const id = key("conflict");
      await api.insert(str(id));
      await api.remove([id]);
      const entry = (await list(page)).find((e) => e.itemId === id)!;
      await api.insert({ ...str(id), value: "new" });
      expect((await restore(page, entry.id)).ok()).toBeFalsy();
      expect((await j(await api.get(id))).value).toBe("new");
    });

    test("an unknown recycle id is refused", async ({ page }) => {
      expect((await restore(page, 999999)).ok()).toBeFalsy();
    });

    test("a binary string is restored byte for byte", async ({ page }) => {
      const api = r.api(page);
      const id = key("bin");
      await api.insert({ id, view: "text", value: "//4A", meta: { kind: "string", encoding: "base64" } });
      await api.remove([id]);
      const entry = (await list(page)).find((e) => e.itemId === id)!;
      await restore(page, entry.id);
      const got = await j(await api.get(id));
      expect(got.value).toBe("//4A");
      expect(got.meta.encoding).toBe("base64");
    });
  });
});
