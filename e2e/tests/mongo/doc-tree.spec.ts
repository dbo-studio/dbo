import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { db, useMongo } from "./_case";

const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";

type Node = { key: string; path: string[]; type: string; value: string; count: number; truncated: boolean };
type Children = { nodes: Node[]; total: number };

test.describe("MongoDB document tree", () => {
  const m = useMongo("dt");

  async function openBrowse(page: import("@playwright/test").Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });

  }

  async function seed(page: import("@playwright/test").Page): Promise<string> {
    return m.add(page, JSON.stringify({ name: "alice", n: { $numberInt: "5" }, big: { $numberLong: "7" }, tags: ["a", "b", "c"], addr: { city: "Paris", zip: "75" } }));
  }

  test("lists one level and drills into objects and arrays", async ({ page }) => {
    const id = await seed(page);
    const root = (await j(await m.api(page).tree(id))) as Children;
    const by = Object.fromEntries(root.nodes.map((n) => [n.key, n]));
    expect(by.name.value).toBe('"alice"');
    expect(by.tags.type).toBe("array");
    expect(by.tags.count).toBe(3);
    expect(by.addr.count).toBe(2);

    const tags = (await j(await m.api(page).tree(id, ["tags"], { limit: 2 }))) as Children;
    expect(tags.total).toBe(3);
    expect(tags.nodes.map((n) => n.value)).toEqual(['"a"', '"b"']);
    const rest = (await j(await m.api(page).tree(id, ["tags"], { offset: 2 }))) as Children;
    expect(rest.nodes.map((n) => n.value)).toEqual(['"c"']);

    const city = (await j(await m.api(page).tree(id, ["addr"]))) as Children;
    expect(city.nodes.find((n) => n.key === "city")?.value).toBe('"Paris"');
  });

  test("sets, adds and unsets a field and keeps the number width", async ({ page }) => {
    const id = await seed(page);
    expect((await m.api(page).setField(id, ["addr", "city"], '"Rome"')).ok()).toBeTruthy();
    expect((await m.api(page).setField(id, ["big"], "9", "int64")).ok()).toBeTruthy();
    expect((await m.api(page).setField(id, ["tags", "1"], '"z"')).ok()).toBeTruthy();
    expect((await m.api(page).setField(id, ["extra"], "true")).ok()).toBeTruthy();
    expect((await m.api(page).unsetField(id, ["name"])).ok()).toBeTruthy();

    const doc = JSON.parse((await j(await m.api(page).get(id))).value);
    expect(doc.addr.city).toBe("Rome");
    expect(doc.big).toEqual({ $numberLong: "9" });
    expect(doc.tags).toEqual(["a", "z", "c"]);
    expect(doc.extra).toBe(true);
    expect(doc.name).toBeUndefined();
  });

  test("refuses _id, operator and dotted paths and unknown paths", async ({ page }) => {
    const id = await seed(page);
    for (const path of [["_id"], ["$set"], ["a.b"], []]) {
      expect((await m.api(page).setField(id, path, "1")).ok(), JSON.stringify(path)).toBeFalsy();
    }
    expect((await m.api(page).tree(id, ["nope"])).ok()).toBeFalsy();
    expect((await m.api(page).tree(id, ["name"])).ok()).toBeFalsy();
  });

  test("a long string is cut in the tree but stays whole in the document", async ({ page }) => {
    const id = await m.add(page, JSON.stringify({ text: "x".repeat(5000) }));
    const root = (await j(await m.api(page).tree(id))) as Children;
    const text = root.nodes.find((n) => n.key === "text")!;
    expect(text.truncated).toBe(true);
    expect(text.value.length).toBeLessThanOrEqual(2000);
  });

  test("the tree view edits a field in place and the JSON view follows", async ({ page }) => {
    await seed(page);
    await openBrowse(page);
    await page.getByTestId("browse-item").first().click();
    const tree = page.getByTestId("doc-tree");
    await expect(tree).toBeVisible({ timeout: 15000 });

    await test.step("a container expands lazily", async () => {
      await expect(tree.getByTestId("doc-node-addr.city")).toHaveCount(0);
      await tree.getByRole("button", { name: "toggle-addr" }).click();
      await expect(tree.getByTestId("doc-node-addr.city")).toContainText("Paris");
    });

    await test.step("clicking a value edits it, and the row shows the path", async () => {
      await tree.getByTestId("doc-node-addr.city").getByText('"Paris"').click();
      await expect(page.getByTestId("doc-breadcrumb")).toContainText("addr › city");
      const input = tree.getByTestId("doc-node-addr.city").getByRole("textbox", { name: "field-value" });
      await input.fill("Rome");
      await input.press("Enter");
      await expect(tree.getByTestId("doc-node-addr.city")).toContainText("Rome", { timeout: 15000 });
    });

    await test.step("a field is added inside a nested object through its own plus button", async () => {
      await tree.getByTestId("doc-node-addr").hover();
      await expect(tree.getByRole("button", { name: "add-addr" })).toBeVisible();
      await tree.getByRole("button", { name: "add-addr" }).click();
      // Only the one add form for that object is open, not one per ancestor.
      await expect(tree.getByRole("textbox", { name: "new-field-name" })).toHaveCount(1);
      await tree.getByRole("textbox", { name: "new-field-name" }).fill("country");
      await tree.getByRole("textbox", { name: "new-field-value" }).fill("IT");
      await tree.getByRole("textbox", { name: "new-field-value" }).press("Enter");
      await expect(tree.getByTestId("doc-node-addr.country")).toContainText("IT", { timeout: 15000 });
      await expect(tree.getByRole("textbox", { name: "new-field-name" })).toHaveCount(0);
    });

    await test.step("the JSON view shows the edit", async () => {
      await page.getByTestId("doc-view-mode-json").click();
      await expect(page.getByText('"Rome"').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("a huge document opens as a tree and the JSON editor asks first", async ({ page }) => {
    await m.add(page, JSON.stringify({ blob: "x".repeat(300 * 1024), small: 1 }));
    await openBrowse(page);
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("doc-tree")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("doc-view-mode-json").click();
    await expect(page.getByTestId("doc-large-warning")).toBeVisible();
    await page.getByRole("button", { name: "Open anyway" }).click();
    await expect(page.getByTestId("doc-large-warning")).toHaveCount(0);
  });
});

test.describe("MongoDB document tree flow", () => {
  const f = useMongo("fl");

  async function openFirst(page: import("@playwright/test").Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${f.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${f.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("doc-tree")).toBeVisible({ timeout: 15000 });
  }

  test("changes a value's type, and refuses a value that does not fit it", async ({ page }) => {
    const id = await f.add(page, '{"n":{"$numberInt":"5"},"label":"x"}');
    await openFirst(page);
    const tree = page.getByTestId("doc-tree");

    await tree.getByTestId("doc-node-n").getByText("5", { exact: true }).click();
    await tree.getByTestId("doc-node-n").getByRole("combobox", { name: "field-type" }).click();
    await page.getByRole("option", { name: "string", exact: true }).click();
    await tree.getByRole("textbox", { name: "field-value" }).fill("five");
    await tree.getByRole("button", { name: "apply-edit" }).click();
    await expect(tree.getByTestId("doc-node-n")).toContainText('"five"', { timeout: 15000 });
    expect(JSON.parse((await j(await f.api(page).get(id))).value).n).toBe("five");

    await tree.getByTestId("doc-node-n").getByText('"five"').click();
    await tree.getByTestId("doc-node-n").getByRole("combobox", { name: "field-type" }).click();
    await page.getByRole("option", { name: "int32" }).click();
    await tree.getByRole("button", { name: "apply-edit" }).click();
    // "five" is not an int32: nothing is written and the edit box stays open.
    await expect(tree.getByRole("textbox", { name: "field-value" })).toBeVisible();
    expect(JSON.parse((await j(await f.api(page).get(id))).value).n).toBe("five");
    await tree.getByRole("button", { name: "cancel-edit" }).click();
    await expect(tree.getByRole("textbox", { name: "field-value" })).toHaveCount(0);
  });

  test("the add form opens under the clicked row and appends to arrays without a name", async ({ page }) => {
    const id = await f.add(page, '{"a":"first","tags":["p","q"],"z":"last"}');
    await openFirst(page);
    const tree = page.getByTestId("doc-tree");

    // A sibling form opens right after its own row, so "a" comes before it and "tags" after it.
    await tree.getByTestId("doc-node-a").hover();
    await tree.getByRole("button", { name: "add-a" }).click();
    const rows = await tree.locator('[data-testid^="doc-node-"], [data-testid="doc-add-form"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    expect(rows.indexOf("doc-add-form")).toBe(rows.indexOf("doc-node-a") + 1);
    await page.getByRole("button", { name: "cancel-add" }).click();
    await expect(page.getByTestId("doc-add-form")).toHaveCount(0);

    await tree.getByTestId("doc-node-tags").hover();
    await tree.getByRole("button", { name: "add-tags" }).click();
    await expect(page.getByRole("textbox", { name: "new-field-name" })).toHaveCount(0);
    await page.getByRole("textbox", { name: "new-field-value" }).fill("r");
    await page.getByRole("textbox", { name: "new-field-value" }).press("Enter");
    await expect.poll(async () => JSON.parse((await j(await f.api(page).get(id))).value).tags, { timeout: 15000 }).toEqual(["p", "q", "r"]);
  });

  test("expand all opens nested levels and collapse all closes them", async ({ page }) => {
    await f.add(page, '{"a":{"b":{"c":{"d":"deep"}}}}');
    await openFirst(page);
    const tree = page.getByTestId("doc-tree");

    await expect(tree.getByTestId("doc-node-a.b")).toHaveCount(0);
    await page.getByTestId("doc-expand-all").click();
    await expect(tree.getByTestId("doc-node-a.b.c.d")).toContainText("deep", { timeout: 15000 });
    await page.getByTestId("doc-collapse-all").click();
    await expect(tree.getByTestId("doc-node-a.b")).toHaveCount(0);
  });
});

test.describe("MongoDB document tree context menu", () => {
  const c = useMongo("cm");

  async function open(page: import("@playwright/test").Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${c.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${c.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("doc-tree")).toBeVisible({ timeout: 15000 });
  }

  test("right click offers edit, add, copy and delete, and each one works", async ({ page }) => {
    const id = await c.add(page, '{"name":"alice","addr":{"city":"Paris"},"tmp":1}');
    await open(page);
    const tree = page.getByTestId("doc-tree");

    await test.step("a scalar offers edit and copy; edit opens the value box", async () => {
      await tree.getByTestId("doc-node-name").click({ button: "right" });
      for (const name of ["Edit value", "Add field after", "Copy value", "Copy field name", "Copy path", "Delete field"]) {
        await expect(page.getByRole("menuitem", { name })).toBeVisible();
      }
      await expect(page.getByRole("menuitem", { name: "Collapse" })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "Edit value" }).click();
      await expect(tree.getByTestId("doc-node-name").getByRole("textbox", { name: "field-value" })).toBeVisible();
      await tree.getByRole("button", { name: "cancel-edit" }).click();
    });

    await test.step("an object offers add-inside and expand", async () => {
      await tree.getByTestId("doc-node-addr").click({ button: "right" });
      await expect(page.getByRole("menuitem", { name: "Add field inside" })).toBeVisible();
      await page.getByRole("menuitem", { name: "Expand" }).click();
      await expect(tree.getByTestId("doc-node-addr.city")).toBeVisible({ timeout: 15000 });
    });

    await test.step("delete removes the field after confirmation", async () => {
      await tree.getByTestId("doc-node-tmp").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete field" }).click();
      await page.getByRole("button", { name: /^delete$/i }).click();
      await expect.poll(async () => JSON.parse((await j(await c.api(page).get(id))).value).tmp, { timeout: 15000 }).toBeUndefined();
    });
  });

  test("_id and read-only rows get no write actions", async ({ page }) => {
    await c.add(page, '{"a":1}');
    await open(page);
    await page.getByTestId("doc-tree").getByTestId("doc-node-_id").click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: "Copy path" })).toBeVisible();
    for (const name of ["Edit value", "Add field after", "Delete field"]) {
      await expect(page.getByRole("menuitem", { name })).toHaveCount(0);
    }
  });
});

test.describe("MongoDB document tree keyboard", () => {
  const k = useMongo("kb");

  async function open(page: import("@playwright/test").Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${k.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${k.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("doc-tree")).toBeVisible({ timeout: 15000 });
  }

  const selected = (page: import("@playwright/test").Page) => page.getByTestId("doc-tree").locator('[aria-selected="true"]');

  test("arrows move, expand and collapse; Home and End jump", async ({ page }) => {
    await k.add(page, '{"a":1,"b":{"c":2,"d":3},"e":"x"}');
    await open(page);
    const tree = page.getByTestId("doc-tree");

    await tree.getByTestId("doc-node-a").click();
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-a");

    await page.keyboard.press("ArrowDown");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-b");
    await expect(selected(page)).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("ArrowRight");
    await expect(selected(page)).toHaveAttribute("aria-expanded", "true");
    await expect(tree.getByTestId("doc-node-b.c")).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("ArrowRight");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-b.c");
    await page.keyboard.press("ArrowLeft");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-b");
    await page.keyboard.press("ArrowLeft");
    await expect(tree.getByTestId("doc-node-b.c")).toHaveCount(0);

    await page.keyboard.press("End");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-e");
    await page.keyboard.press("Home");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-_id");
  });

  test("Enter edits, Escape returns focus to the tree, Insert adds, Delete removes", async ({ page }) => {
    const id = await k.add(page, '{"a":1,"e":"x"}');
    await open(page);
    const tree = page.getByTestId("doc-tree");

    await tree.getByTestId("doc-node-e").click();
    await page.keyboard.press("Enter");
    const box = tree.getByTestId("doc-node-e").getByRole("textbox", { name: "field-value" });
    await expect(box).toBeFocused();
    await box.fill("y");
    await box.press("Enter");
    await expect.poll(async () => JSON.parse((await j(await k.api(page).get(id))).value).e, { timeout: 15000 }).toBe("y");

    // Focus is back on the tree, so arrows work without clicking again.
    await page.keyboard.press("ArrowUp");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-a");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(tree.getByTestId("doc-node-a").getByRole("textbox", { name: "field-value" })).toHaveCount(0);
    await page.keyboard.press("ArrowDown");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-e");

    await page.keyboard.press("Insert");
    const name = page.getByRole("textbox", { name: "new-field-name" });
    await expect(name).toBeFocused();
    await name.fill("n");
    await page.getByRole("textbox", { name: "new-field-value" }).fill("7");
    await page.getByRole("textbox", { name: "new-field-value" }).press("Enter");
    await expect.poll(async () => JSON.parse((await j(await k.api(page).get(id))).value).n, { timeout: 15000 }).toEqual({ $numberInt: "7" });

    await tree.getByTestId("doc-node-a").click();
    await page.keyboard.press("Delete");
    await page.getByRole("button", { name: /^delete$/i }).click();
    await expect.poll(async () => JSON.parse((await j(await k.api(page).get(id))).value).a, { timeout: 15000 }).toBeUndefined();
  });

  test("keys typed in an edit box do not move the selection", async ({ page }) => {
    await k.add(page, '{"a":"one","b":"two"}');
    await open(page);
    const tree = page.getByTestId("doc-tree");
    await tree.getByTestId("doc-node-a").click();
    await page.keyboard.press("Enter");
    const box = tree.getByTestId("doc-node-a").getByRole("textbox", { name: "field-value" });
    await box.press("ArrowDown");
    await box.press("End");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-a");
    await expect(box).toBeFocused();
  });

  test("End scrolls to a row that is not rendered yet in a long list", async ({ page }) => {
    const fields = Object.fromEntries(Array.from({ length: 90 }, (_, i) => [`f${String(i).padStart(3, "0")}`, i]));
    await k.add(page, JSON.stringify(fields));
    await open(page);
    const tree = page.getByTestId("doc-tree");

    await tree.getByTestId("doc-node-_id").click();
    await expect(tree.getByTestId("doc-node-f089")).toHaveCount(0);
    await page.keyboard.press("End");
    await expect(selected(page)).toHaveAttribute("data-testid", "doc-node-f089", { timeout: 15000 });
    await expect(tree.getByTestId("doc-node-f089")).toBeInViewport();
    await page.keyboard.press("Home");
    await expect(tree.getByTestId("doc-node-_id")).toBeInViewport({ timeout: 15000 });
  });
});

test.describe("MongoDB browse tab switching", () => {
  const a = useMongo("sw");

  test("opening a second collection does not reuse the first one's selected document", async ({ page }) => {
    const other = `${a.s.coll}_b`;
    await a.add(page, '{"from":"first"}');
    await page.request.post(`${apiUrl()}/nosql/item`, {
      data: { connectionId: a.s.id, containerId: `${db}/${other}`, item: { id: "", view: "document", value: '{"from":"second"}', meta: { kind: "document" } }, confirmed: true },
      headers,
    });

    try {
      await page.reload();
      await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
      const dbNode = page.getByTestId(`tree-node-${db}`);
      if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${a.s.name.toLowerCase()}`).click();
      await dbNode.click();

      await page.getByTestId(`tree-node-${a.s.coll}`).dblclick();
      await page.getByTestId("browse-item").first().click();
      await expect(page.getByTestId("doc-tree")).toBeVisible({ timeout: 15000 });

      await page.getByTestId(`tree-node-${other}`).dblclick();
      await expect(page.getByTestId("browse-item")).toHaveCount(1, { timeout: 15000 });
      await expect(page.getByTestId("doc-tree")).toHaveCount(0);
      await expect(page.getByText(/does not exist/)).toHaveCount(0);

      await page.getByTestId("browse-item").first().click();
      await expect(page.getByTestId("doc-node-from")).toContainText("second", { timeout: 15000 });
    } finally {
      try {
        execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(other)}).drop()`], { stdio: "ignore" });
      } catch {
        /* docker is optional for cleanup */
      }
    }
  });
});
