import { expect, test, type Page } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { db, useMongo } from "./_case";

type Result = { docs: string[]; truncated: boolean };

test.describe("MongoDB aggregation", () => {
  const m = useMongo("ag");

  test.beforeEach(async ({ page }) => {
    for (const [tag, n] of [["a", 1], ["a", 2], ["b", 5]]) await m.add(page, `{"tag":"${tag}","n":{"$numberInt":"${n}"}}`);
  });

  const run = (page: Page, pipeline: string, limit?: number) =>
    page.request.post(`${apiUrl()}/nosql/aggregate`, { data: { connectionId: m.s.id, containerId: m.s.container, pipeline, limit }, headers });

  test("runs a pipeline and bounds the preview", async ({ page }) => {
    const res = (await j(await run(page, '[{"$group":{"_id":"$tag","total":{"$sum":"$n"}}},{"$sort":{"_id":1}}]'))) as Result;
    expect(res.docs.map((d) => JSON.parse(d).total)).toEqual([{ $numberInt: "3" }, { $numberInt: "5" }]);
    expect(res.truncated).toBe(false);

    const one = (await j(await run(page, "[]", 1))) as Result;
    expect(one.docs).toHaveLength(1);
    expect(one.truncated).toBe(true);
  });

  test("refuses writing and server-side JavaScript stages and bad input", async ({ page }) => {
    for (const p of ['[{"$out":"x"}]', '[{"$merge":{"into":"x"}}]', '[{"$match":{"$where":"1"}}]', "{}", "[oops"]) {
      expect((await run(page, p)).ok(), p).toBeFalsy();
    }
  });

  test("the builder previews a stage on its own output", async ({ page }) => {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Aggregate" }).click();
    await page.getByTestId("agg-add").click();
    await page.getByRole("menuitem", { name: "$match" }).click();
    await page.getByRole("textbox", { name: "stage-1-text" }).fill('{"$match":{"tag":"a"}}');
    await page.getByTestId("agg-preview-1").click();
    await expect(page.getByTestId("agg-doc")).toHaveCount(2, { timeout: 15000 });

    await page.getByTestId("agg-add").click();
    await page.getByRole("menuitem", { name: "$count" }).click();
    await page.getByTestId("agg-preview-2").click();
    await expect(page.getByTestId("agg-output")).toContainText('"total"', { timeout: 15000 });

    await page.getByRole("textbox", { name: "stage-2-text" }).fill("[1]");
    await page.getByTestId("agg-preview-2").click();
    await expect(page.getByTestId("agg-output")).toContainText("Stage 2 is not a JSON object");
  });
});
