import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/**
 * MongoDB driver on the NoSQL engine. Needs a MongoDB (docker compose -f docker-compose.dev.yml up -d sample-mongo,
 * MONGO_TEST_PORT, default 27018). The connection is created through the real New connection form.
 */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const mongoHost = process.env.MONGO_TEST_HOST ?? "127.0.0.1";
const mongoPort = process.env.MONGO_TEST_PORT ?? "27018";
const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";
const headers = { "X-Client-Mode": "web" };

async function createMongoConnection(page: Page, name: string): Promise<number> {
  const cp = new ConnectionPage(page);
  await cp.goto();
  await cp.waitForReady();
  await cp.openNewConnectionModal();
  await cp.selectConnectionType("MongoDB");
  await cp.nameInput.fill(name);
  await cp.hostInput.fill(mongoHost);
  await page.locator('input[name="port"]').fill(mongoPort);
  await cp.testConnection();
  await cp.submitConnection();
  await cp.openSwitcher();
  await cp.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });

  const list = await page.request.get(`${apiUrl()}/connections`, { headers });
  return ((await list.json()) as { data: { id: number; name: string }[] }).data.find((c) => c.name === name)!.id;
}

const doc = (connectionId: number, container: string, value: string) => ({
  data: { connectionId, containerId: container, item: { id: "", view: "document", value, meta: { kind: "document" } } },
  headers,
});

test.describe("MongoDB driver", () => {
  let name: string;
  let connectionId: number;
  // The tree lists databases once per connection, so tests use the default "test" database with a collection of their own.
  const db = "test";
  let coll: string;
  let users: string; // container id: "test/<collection>"

  test.beforeEach(async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    name = `mongo-${suffix}`;
    coll = `users_${suffix}`.slice(0, 60);
    users = `${db}/${coll}`;
    connectionId = await createMongoConnection(page, name);
  });

  test.afterEach(() => {
    // Drop this test's collection; the shared MongoDB is otherwise left alone.
    try {
      execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(coll)}).drop()`], { stdio: "ignore" });
    } catch {
      /* docker is optional for cleanup */
    }
  });

  async function seed(page: Page): Promise<string[]> {
    const ids: string[] = [];
    for (const d of [
      '{"name":"alice","age":{"$numberInt":"30"},"at":{"$date":{"$numberLong":"1700000000000"}}}',
      '{"name":"bob","age":{"$numberLong":"41"}}',
      '{"name":"carol","age":{"$numberInt":"52"}}',
    ]) {
      const res = await page.request.post(`${apiUrl()}/nosql/item`, doc(connectionId, users, d));
      expect(res.ok(), await res.text()).toBeTruthy();
      ids.push(((await res.json()).data as { id: string }).id);
    }
    return ids;
  }

  async function openUsers(page: Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) {
      await page.getByTestId(`tree-node-${name.toLowerCase()}`).click();
    }
    await expect(dbNode).toBeVisible({ timeout: 15000 });
    await dbNode.click();
    const node = page.getByTestId(`tree-node-${coll}`);
    await expect(node).toBeVisible({ timeout: 15000 });
    await node.dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
  }

  test("tree, browse, filter, and Extended JSON types survive an edit", async ({ page }) => {
    const [aliceId] = await seed(page);
    await openUsers(page);
    await expect(page.getByTestId("browse-footer")).toContainText("3 loaded");

    await test.step("a JSON filter narrows the list", async () => {
      await page.getByLabel("browse-query").fill('{"age":{"$gt":35}}');
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByTestId("browse-footer")).toContainText("2 loaded");
    });

    await test.step("a filter with $where is refused", async () => {
      const res = await page.request.get(`${apiUrl()}/nosql/browse`, {
        params: { connectionId, containerId: users, filter: '{"$where":"1==1"}' },
        headers,
      });
      expect(res.status()).toBe(403);
    });

    await test.step("saving keeps ObjectId, int32, int64 and date types", async () => {
      const got = await page.request.get(`${apiUrl()}/nosql/item`, { params: { connectionId, containerId: users, itemId: aliceId }, headers });
      const value = (await got.json()).data.value as string;
      expect(value).toContain('"$numberInt":"30"');
      expect(value).toContain('"$date"');

      const edited = value.replace('"alice"', '"alice2"');
      const save = await page.request.put(`${apiUrl()}/nosql/item`, {
        data: { connectionId, containerId: users, itemId: aliceId, change: { value: edited }, confirmed: true },
        headers,
      });
      expect(save.ok(), await save.text()).toBeTruthy();

      const again = ((await (await page.request.get(`${apiUrl()}/nosql/item`, { params: { connectionId, containerId: users, itemId: aliceId }, headers })).json()).data.value as string);
      expect(again).toContain('"alice2"');
      expect(again).toContain('"$numberInt":"30"');
      expect(again).toContain('"$date"');

      const bad = await page.request.put(`${apiUrl()}/nosql/item`, {
        data: { connectionId, containerId: users, itemId: aliceId, change: { value: edited.replace(aliceId, "ffffffffffffffffffffffff") }, confirmed: true },
        headers,
      });
      expect(bad.status()).toBe(400); // _id cannot change
    });
  });

  test("create a document from the UI, delete it, restore it from the recycle bin", async ({ page }) => {
    await seed(page);
    await openUsers(page);

    await page.getByTestId("new-key-button").click();
    await expect(page.getByTestId("create-popover")).toContainText("New document");
    await page.getByRole("button", { name: "Create", exact: true }).click(); // the id is generated
    await expect(page.getByTestId("browse-footer")).toContainText("4 loaded");

    await page.getByRole("button", { name: "Delete item" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByTestId("browse-footer")).toContainText("3 loaded");

    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Recently deleted" }).click();
    await page.getByTestId("recycle-dialog").getByRole("button", { name: "Restore" }).first().click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("browse-footer")).toContainText("4 loaded");
  });

  test("bulk delete by filter: preview, typed confirmation, background job", async ({ page }) => {
    for (let i = 0; i < 120; i++) {
      await page.request.post(`${apiUrl()}/nosql/item`, doc(connectionId, users, `{"n":{"$numberInt":"${i}"},"kind":"junk"}`));
    }
    await page.request.post(`${apiUrl()}/nosql/item`, doc(connectionId, users, '{"kind":"keep"}'));
    await openUsers(page);

    await page.getByLabel("browse-query").fill('{"kind":"junk"}');
    await page.getByRole("button", { name: "Run" }).click();
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Delete matching…" }).click();

    const dialog = page.getByTestId("bulk-delete-dialog");
    await expect(page.getByTestId("bulk-delete-count")).toContainText("120 documents match");
    const confirm = dialog.getByRole("button", { name: /^Delete 120 documents$/ });
    await expect(confirm).toBeDisabled();

    const wrong = await page.request.post(`${apiUrl()}/nosql/bulk-delete`, {
      data: { connectionId, containerId: users, pattern: '{"kind":"junk"}', confirmName: "nope" },
      headers,
    });
    expect(wrong.status()).toBe(400);

    await page.getByLabel("bulk-delete-confirm").fill(name);
    await confirm.click();

    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${apiUrl()}/nosql/browse`, { params: { connectionId, containerId: users, limit: 500 }, headers });
          return ((await r.json()).data.items as unknown[]).length;
        },
        { timeout: 60000, intervals: [1000] },
      )
      .toBe(1);
  });

  test("terminal: mongosh-style commands run, dangerous ones are refused", async ({ page }) => {
    const run = (input: string, confirmed = true) =>
      page.request.post(`${apiUrl()}/nosql/tools/cli/run`, { data: { connectionId, input, confirmed }, headers });
    const out = async (input: string): Promise<unknown> => {
      const res = await run(input);
      expect(res.ok(), `${input}: ${await res.text()}`).toBeTruthy();
      return (await res.json()).data.output;
    };

    await out(`use ${db}`);
    await out('db.' + coll + '.insertOne({"name":"dave","age":{"$numberInt":"25"}})');
    await out('db.' + coll + '.insertMany([{"name":"erin","age":60},{"name":"frank","age":70}])');
    expect(await out('db.' + coll + '.countDocuments({"age":{"$gt":50}})')).toBe(2);

    const found = (await out('db.' + coll + '.find({"age":{"$gt":50}}).sort({"age":-1}).limit(1)')) as { name: string }[];
    expect(found.map((d) => d.name)).toEqual(["frank"]);

    const upd = (await out('db.' + coll + '.updateOne({"name":"dave"},{"$set":{"age":26}})')) as { modifiedCount: number };
    expect(upd.modifiedCount).toBe(1);
    expect(await out("show collections")).toContain(coll);
    expect((await out('db.' + coll + '.getIndexes()')) as unknown[]).toHaveLength(1);
    expect(await out('db.' + coll + '.deleteMany({"age":{"$gt":65}})')).toMatchObject({ deletedCount: 1 });

    await test.step("server-side JavaScript and writes outside the collection are refused", async () => {
      for (const bad of ['db.' + coll + '.find({"$where":"1==1"})', 'db.' + coll + '.aggregate([{"$out":"copy"}])', "db." + coll + ".drop()", "rm -rf /"]) {
        const res = await run(bad);
        expect(res.status(), bad).toBe(403);
      }
    });

    await test.step("a destructive statement needs explicit confirmation even without Safe Mode", async () => {
      const res = await run("db." + coll + ".deleteMany({})", false);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_confirm_required");
    });
  });

  test("stats dialog shows size and indexes", async ({ page }) => {
    await seed(page);
    await openUsers(page);
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Collection stats" }).click();
    const dialog = page.getByTestId("stats-dialog");
    await expect(dialog.getByTestId("stat-Documents")).toHaveText("3");
    await expect(dialog.getByTestId("stats-index")).toContainText("_id_");
  });

  test("a prod connection refuses writes until it is unlocked", async ({ page }) => {
    await seed(page);
    const patch = await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "prod" }, headers });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    const res = await page.request.post(`${apiUrl()}/nosql/item`, { ...doc(connectionId, users, '{"x":1}'), });
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe("safe_mode_prod_locked");
    const read = await page.request.get(`${apiUrl()}/nosql/browse`, { params: { connectionId, containerId: users }, headers });
    expect(read.ok()).toBeTruthy();
  });
});
