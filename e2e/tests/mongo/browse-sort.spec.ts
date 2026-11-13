import { expect, test } from "@playwright/test";
import { j } from "../../helpers/nosql";
import { useMongo } from "./_case";

type Page = { items: { id: string; value: string }[]; nextCursor: string };

test.describe("MongoDB browse sort and projection", () => {
  const m = useMongo("bs");

  test.beforeEach(async ({ page }) => {
    for (const [name, age] of [["bob", 41], ["alice", 30], ["carol", 52]]) {
      await m.add(page, `{"name":"${name}","age":{"$numberInt":"${age}"}}`);
    }
  });

  const names = (p: Page): string[] => p.items.map((i) => JSON.parse(i.value).name);

  test("sorts descending and pages by offset", async ({ page }) => {
    const sorts = JSON.stringify([{ field: "age", desc: true }]);
    const first = (await j(await m.api(page).browse({ sorts, limit: 2 }))) as Page;
    expect(names(first)).toEqual(["carol", "bob"]);
    expect(first.nextCursor).not.toBe("");

    const second = (await j(await m.api(page).browse({ sorts, limit: 2, cursor: first.nextCursor }))) as Page;
    expect(names(second)).toEqual(["alice"]);
    expect(second.nextCursor).toBe("");
  });

  test("projection keeps _id and only the asked fields", async ({ page }) => {
    const res = (await j(await m.api(page).browse({ projection: '{"name":1}' }))) as Page;
    const doc = JSON.parse(res.items[0].value);
    expect(Object.keys(doc).sort()).toEqual(["_id", "name"]);
  });

  test("a bad cursor is rejected", async ({ page }) => {
    const sorts = JSON.stringify([{ field: "age", desc: false }]);
    const res = await m.api(page).browse({ sorts, cursor: "x" });
    expect(res.ok()).toBeFalsy();
  });

  test("a large document is not inlined in the list", async ({ page }) => {
    const id = await m.add(page, JSON.stringify({ name: "big", blob: "x".repeat(40000) }));
    const res = (await j(await m.api(page).browse({ filter: '{"name":"big"}' }))) as { items: { id: string; value: unknown; meta: { truncated?: boolean } }[] };
    expect(res.items[0].id).toBe(id);
    expect(res.items[0].value).toBeNull();
    expect(res.items[0].meta.truncated).toBe(true);
  });
});
