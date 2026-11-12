// @tool: CLI
import { expect, test, type Page } from "@playwright/test";
import { ObjectTreePage, SqlEditorPage } from "../../pages";
import locales from "../../../frontend/src/locales/en.json";
import { db, useMongo } from "./_case";

/** The Mongo editor tab: same toolbar as the SQL editors, shell statements in, grid or JSON out. */
test.describe("MongoDB editor tab", () => {
  const m = useMongo("ed");

  async function seed(page: Page): Promise<void> {
    for (const d of ['{"name":"alice","age":{"$numberInt":"30"}}', '{"name":"bob","age":{"$numberInt":"41"}}', '{"name":"carol","age":{"$numberInt":"52"}}']) {
      await m.add(page, d);
    }
  }

  async function openEditor(page: Page): Promise<SqlEditorPage> {
    const editor = new SqlEditorPage(page);
    await editor.open();
    await expect(page.getByTestId("run-query")).toBeVisible({ timeout: 15000 });
    return editor;
  }

  const result = (page: Page) => page.getByTestId("mongo-result");
  const find = (filter = "{}"): string => `db.${m.s.coll}.find(${filter})`;

  test("the editor button is enabled and opens a tab with the SQL toolbar and a database picker", async ({ page }) => {
    await expect(page.getByRole("button", { name: "sql", exact: true })).toBeEnabled();
    await openEditor(page);

    for (const name of ["Save", "Export", "Beautify", "AI Explain"]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /minify/i })).toHaveCount(0);
    await expect(page.getByTestId("editor-context-database")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("editor-context-schema")).toHaveCount(0);
  });

  test("shell syntax runs and documents come back as a grid", async ({ page }) => {
    await seed(page);
    const editor = await openEditor(page);

    await editor.typeQuery(`use ${db};\n${find("{age: {$gt: 35}}")}.sort({age: -1})`);
    await editor.clickRun();
    const grid = result(page).getByRole("table");
    await expect(grid).toBeVisible({ timeout: 20000 });
    await expect(grid.getByText("carol")).toBeVisible();
    await expect(grid.getByText("bob")).toBeVisible();
    await expect(grid.getByText("alice")).toHaveCount(0);

    await test.step("a count comes back as JSON", async () => {
      await editor.typeQuery(`db.${m.s.coll}.countDocuments({})`);
      await editor.clickRun();
      await expect(result(page)).toContainText("3", { timeout: 20000 });
      await expect(result(page).getByRole("table")).toHaveCount(0);
    });
  });

  test("refused statements show their message instead of running", async ({ page }) => {
    const editor = await openEditor(page);
    await editor.typeQuery(find("{$where: 'sleep(1000)'}"));
    await editor.clickRun();
    // Safe Mode refuses it with a message toast; the result area says it did not run.
    await expect(result(page)).toContainText(locales.cli_not_run, { timeout: 20000 });
    await expect(page.getByText(/not allowed|blocked/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("export downloads the shown result as JSON, and as CSV when it is a grid", async ({ page }) => {
    await seed(page);
    const editor = await openEditor(page);
    await editor.typeQuery(`${find()}.sort({age: 1})`);
    await editor.clickRun();
    await expect(result(page).getByRole("table")).toBeVisible({ timeout: 20000 });

    const download = async (format: "JSON" | "CSV"): Promise<string> => {
      await page.getByRole("button", { name: "Export" }).click();
      const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: format }).click()]);
      expect(file.suggestedFilename()).toBe(format === "JSON" ? "mongo-result.json" : "mongo-result.csv");
      return (await import("node:fs/promises")).readFile((await file.path())!, "utf8");
    };

    const json = JSON.parse(await download("JSON")) as { name: string }[];
    expect(json.map((d) => d.name)).toEqual(["alice", "bob", "carol"]);

    const csv = (await download("CSV")).trim().split(/\r?\n/);
    expect(csv[0]).toContain("name");
    expect(csv).toHaveLength(4);
    expect(csv.join("\n")).toContain("carol");
  });

  test("the database picker scopes the statement to the chosen database", async ({ page }) => {
    await seed(page);
    const editor = await openEditor(page);
    await editor.selectContext(db);
    await editor.typeQuery(`db.${m.s.coll}.countDocuments({})`);
    await editor.clickRun();
    await expect(result(page)).toContainText("3", { timeout: 20000 });
  });

  test("tree actions open the editor: Indexes runs, Create collection and Drop collection are templates", async ({ page }) => {
    await seed(page);
    const tree = new ObjectTreePage(page);
    const editor = new SqlEditorPage(page);

    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await expect(page.getByTestId(`tree-node-${m.s.coll}`)).toBeVisible({ timeout: 15000 });

    await test.step("Indexes runs getIndexes", async () => {
      await tree.runTreeAction(m.s.coll, "Indexes");
      await expect(editor.editor).toBeVisible({ timeout: 15000 });
      await expect(result(page)).toContainText("_id_", { timeout: 20000 });
      expect(await editor.getMonacoValue()).toBe(`use ${db};\ndb.${m.s.coll}.getIndexes()`);
    });

    await test.step("Drop collection only fills the editor", async () => {
      await tree.runTreeAction(m.s.coll, "Drop collection");
      await expect.poll(() => editor.getMonacoValue()).toBe(`use ${db};\ndb.${m.s.coll}.drop()`);
      const shown = await result(page).textContent();
      expect(shown ?? "").not.toMatch(/"ok"/);
    });

    await test.step("Create collection on the database fills a template", async () => {
      await tree.runTreeAction(db, "Create collection");
      await expect.poll(() => editor.getMonacoValue()).toContain(`createCollection("new_collection")`);
    });
  });

  test("format rewrites the statement; the run shortcut runs it", async ({ page }) => {
    await seed(page);
    const editor = await openEditor(page);
    await editor.typeQuery(`${find("{name:'alice'}")}`);
    await page.getByRole("button", { name: "Beautify" }).click();
    await expect.poll(() => editor.getMonacoValue()).toContain("{ name: 'alice' }");

    await editor.focus();
    // The web shortcut is Alt+Enter (Cmd/Ctrl+Enter belongs to the desktop app).
    await page.keyboard.press("Alt+Enter");
    await expect(result(page).getByText("alice")).toBeVisible({ timeout: 20000 });
  });
});
