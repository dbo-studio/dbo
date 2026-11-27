// @cap: Indexes
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { ObjectFormPage, ObjectTreePage } from "../../pages";
import { useMongo } from "./_case";

type Index = { name: string; keys: string; unique: boolean; ttlSecs: number | null; ops: number };
type Explain = { stage: string; index: string; returned: number; docsExamined: number };

test.describe("MongoDB indexes and explain", () => {
  const m = useMongo("ix");
  const q = () => ({ connectionId: m.s.id, containerId: m.s.container });

  test("creates, lists and drops an index", async ({ page }) => {
    await m.add(page, '{"email":"a@x.io"}');
    const create = await page.request.post(`${apiUrl()}/nosql/indexes`, {
      data: { ...q(), spec: { keys: '{"email":1}', unique: true, ttlSecs: null }, confirmed: true },
      headers,
    });
    expect(create.ok(), await create.text()).toBeTruthy();

    const list = (await j(await page.request.get(`${apiUrl()}/nosql/indexes`, { params: q(), headers }))) as Index[];
    const idx = list.find((i) => i.name === "email_1");
    expect(idx?.unique).toBe(true);
    expect(idx?.keys).toContain('"email"');

    const drop = await page.request.post(`${apiUrl()}/nosql/indexes/drop`, { data: { ...q(), name: "email_1", confirmed: true }, headers });
    expect(drop.ok()).toBeTruthy();
    const after = (await j(await page.request.get(`${apiUrl()}/nosql/indexes`, { params: q(), headers }))) as Index[];
    expect(after.map((i) => i.name)).toEqual(["_id_"]);
  });

  test("refuses dropping _id and an empty key document", async ({ page }) => {
    const drop = await page.request.post(`${apiUrl()}/nosql/indexes/drop`, { data: { ...q(), name: "_id_", confirmed: true }, headers });
    expect(drop.ok()).toBeFalsy();
    const bad = await page.request.post(`${apiUrl()}/nosql/indexes`, { data: { ...q(), spec: { keys: "{}" }, confirmed: true }, headers });
    expect(bad.ok()).toBeFalsy();
  });

  test("explain shows a collection scan, then an index scan once indexed", async ({ page }) => {
    for (let i = 0; i < 5; i++) await m.add(page, `{"k":${i}}`);
    const explain = async (): Promise<Explain> =>
      (await j(await page.request.get(`${apiUrl()}/nosql/explain`, { params: { ...q(), filter: '{"k":3}' }, headers }))) as Explain;

    const before = await explain();
    expect(before.stage).toBe("COLLSCAN");
    expect(before.docsExamined).toBe(5);
    expect(before.returned).toBe(1);

    await page.request.post(`${apiUrl()}/nosql/indexes`, { data: { ...q(), spec: { keys: '{"k":1}' }, confirmed: true }, headers });
    const after = await explain();
    expect(after.index).toBe("k_1");
    expect(after.docsExamined).toBe(1);
  });

  test("Edit collection adds and drops an index through the object form", async ({ page }) => {
    await m.add(page, '{"email":"a@x.io"}');
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${m.s.container.split("/")[0].toLowerCase()}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    const tree = new ObjectTreePage(page);
    const form = new ObjectFormPage(page);
    const indexes = async () => ((await j(await page.request.get(`${apiUrl()}/nosql/indexes`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers }))) as { name: string }[]).map((i) => i.name);

    await tree.runTreeAction(m.s.coll, "Edit collection");
    await form.waitForReady();
    const openIndexes = async (): Promise<void> => {
      await form.getTab("collection_indexes").click();
      await expect(form.addRowButton).toBeVisible({ timeout: 15000 });
    };
    await openIndexes();

    await test.step("Add an index", async () => {
      const row = await form.addArrayRow("keys");
      await form.fillArrayCell(row, "keys", '{"email":1}');
      await form.save();
      await form.assertPreviewContains("createIndex");
      await form.confirmExecute();
      await expect.poll(indexes, { timeout: 15000 }).toContain("email_1");
    });

    await test.step("Drop it again", async () => {
      await openIndexes();
      const rows = await form.arrayRowCount("keys");
      await form.deleteArrayRow(rows - 1);
      await form.save();
      await form.assertPreviewContains("dropIndex");
      await form.confirmExecute();
      await expect.poll(indexes, { timeout: 15000 }).not.toContain("email_1");
    });
  });
});
