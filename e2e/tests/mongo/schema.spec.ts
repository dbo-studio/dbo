import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { db, useMongo } from "./_case";

type Field = { path: string; count: number; types: { type: string; count: number }[]; top: { value: string; count: number }[] };
type Analysis = { sampled: number; fields: Field[] };
type Validator = { validator: string; level: string; action: string };

test.describe("MongoDB schema analysis and validation", () => {
  const m = useMongo("sc");
  const q = () => ({ connectionId: m.s.id, containerId: m.s.container });

  test("reports field types, presence and frequent values", async ({ page }) => {
    await m.add(page, '{"name":"a","age":{"$numberInt":"1"},"addr":{"city":"X"}}');
    await m.add(page, '{"name":"a","age":"old"}');
    await m.add(page, '{"name":"b"}');

    const res = (await j(await page.request.get(`${apiUrl()}/nosql/schema`, { params: q(), headers }))) as Analysis;
    expect(res.sampled).toBe(3);
    const by = Object.fromEntries(res.fields.map((f) => [f.path, f]));

    expect(by.name.count).toBe(3);
    expect(by.name.top[0]).toEqual({ value: '"a"', count: 2 });
    expect(by.age.count).toBe(2);
    expect(by.age.types.map((t) => t.type).sort()).toEqual(["int32", "string"]);
    expect(by["addr.city"].count).toBe(1);
    expect(by.addr.types[0].type).toBe("object");
  });

  test("sets, reads and clears a validator that is enforced on writes", async ({ page }) => {
    await m.add(page, '{"n":{"$numberInt":"1"}}');
    const rule = '{"$jsonSchema":{"bsonType":"object","required":["n"]}}';
    const put = (v: Validator) => page.request.put(`${apiUrl()}/nosql/validator`, { data: { ...q(), validator: v, confirmed: true }, headers });

    expect((await put({ validator: rule, level: "strict", action: "error" })).ok()).toBeTruthy();
    const got = (await j(await page.request.get(`${apiUrl()}/nosql/validator`, { params: q(), headers }))) as Validator;
    expect(got.validator).toContain("required");
    expect(got.level).toBe("strict");

    const bad = await m.api(page).insert({ id: "", view: "document", value: '{"other":1}', meta: { kind: "document" } });
    expect(bad.ok()).toBeFalsy();

    expect((await put({ validator: "", level: "off", action: "error" })).ok()).toBeTruthy();
    const cleared = (await j(await page.request.get(`${apiUrl()}/nosql/validator`, { params: q(), headers }))) as Validator;
    expect(cleared.validator).toBe("");
    expect((await m.api(page).insert({ id: "", view: "document", value: '{"other":1}', meta: { kind: "document" } })).ok()).toBeTruthy();
  });

  test("refuses a bad level, a bad action and invalid JSON", async ({ page }) => {
    await m.add(page, '{"n":1}');
    for (const v of [
      { validator: "{}", level: "wild", action: "error" },
      { validator: "{}", level: "strict", action: "boom" },
      { validator: "{oops", level: "strict", action: "error" },
    ]) {
      const res = await page.request.put(`${apiUrl()}/nosql/validator`, { data: { ...q(), validator: v, confirmed: true }, headers });
      expect(res.ok(), JSON.stringify(v)).toBeFalsy();
    }
  });

  test("the Schema dialog shows the analysis and saves a rule", async ({ page }) => {
    await m.add(page, '{"name":"a"}');
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Schema" }).click();
    await expect(page.getByTestId("schema-sampled")).toContainText("1 documents sampled", { timeout: 15000 });
    await expect(page.getByTestId("schema-row").filter({ hasText: "name" })).toBeVisible();

    await page.getByTestId("schema-tab-validation").click();
    await page.getByTestId("validator-level-moderate").click();
    await page.getByTestId("validator-save").click();
    await expect.poll(async () => ((await j(await page.request.get(`${apiUrl()}/nosql/validator`, { params: q(), headers }))) as Validator).level, { timeout: 15000 }).toBe("moderate");
  });
});
