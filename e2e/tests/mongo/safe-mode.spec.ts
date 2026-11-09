// @cap: Delete BulkDelete
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useMongo } from "./_case";

/** Mongo Safe Mode: terminal statements are read / write / destructive / blocked, and prod locks writes. */
test.describe("MongoDB safe mode", () => {
  const m = useMongo("safe");
  const cli = (page: import("@playwright/test").Page, input: string, confirmed: boolean) => m.api(page).cli(input, confirmed);

  test("reads run without confirmation", async ({ page }) => {
    await m.add(page, '{"a":1}');
    for (const q of [`db.${m.s.coll}.find({})`, `db.${m.s.coll}.countDocuments({})`, `db.${m.s.coll}.getIndexes()`, "show collections"]) {
      const res = await cli(page, q, false);
      expect(res.ok(), `${q}: ${await res.text()}`).toBeTruthy();
    }
  });

  test("a write runs once confirmed", async ({ page }) => {
    const res = await cli(page, `db.${m.s.coll}.insertOne({"w":1})`, true);
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(((await j(await m.api(page).browse())).items as unknown[]).length).toBe(1);
  });

  test("destructive statements need confirmation and delete nothing without it", async ({ page }) => {
    await m.add(page, '{"a":1}');
    for (const q of [`db.${m.s.coll}.deleteMany({})`, `db.${m.s.coll}.deleteOne({})`]) {
      const res = await cli(page, q, false);
      expect(res.status(), q).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_confirm_required");
    }
    expect(((await j(await m.api(page).browse())).items as unknown[]).length).toBe(1);
  });

  test("a prod connection locks every write path, reads keep working", async ({ page }) => {
    const id = await m.add(page, '{"a":1}');
    const patch = await page.request.patch(`${apiUrl()}/connections/${m.s.id}`, { data: { env: "prod" }, headers });
    expect(patch.ok(), await patch.text()).toBeTruthy();

    const locked = [
      await m.api(page).insert({ id: "", view: "document", value: '{"x":1}', meta: { kind: "document" } }),
      await m.api(page).save(id, { value: '{"a":2}' }),
      await m.api(page).remove([id]),
      await cli(page, `db.${m.s.coll}.insertOne({"x":1})`, true),
    ];
    for (const res of locked) {
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_prod_locked");
    }
    expect((await m.api(page).get(id)).ok()).toBeTruthy();
    expect((await m.api(page).browse()).ok()).toBeTruthy();
  });

  test("unlocking with the connection name allows writes again; a wrong name does not", async ({ page }) => {
    await page.request.patch(`${apiUrl()}/connections/${m.s.id}`, { data: { env: "prod" }, headers });
    const unlock = (confirmName: string) =>
      page.request.post(`${apiUrl()}/connections/${m.s.id}/safe-mode/unlock`, { data: { confirmName }, headers });
    expect((await unlock("not-the-name")).ok()).toBeFalsy();
    expect((await m.api(page).insert({ id: "", view: "document", value: '{"x":1}', meta: { kind: "document" } })).status()).toBe(403);
    expect((await unlock(m.s.name)).ok()).toBeTruthy();
    expect((await m.api(page).insert({ id: "", view: "document", value: '{"x":1}', meta: { kind: "document" } })).ok()).toBeTruthy();
    await page.request.patch(`${apiUrl()}/connections/${m.s.id}`, { data: { env: "dev" }, headers });
  });
});
