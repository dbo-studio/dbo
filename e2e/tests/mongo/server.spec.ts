import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useMongo } from "./_case";

const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";

/** Server-level views of MongoDB: status, operations, databases and special collections, users, GridFS, change streams. */
test.describe("MongoDB server tools", () => {
  const m = useMongo("sv");
  const get = (page: Page, path: string, params: Record<string, string | number> = {}) =>
    page.request.get(`${apiUrl()}/nosql/server/${path}`, { params: { connectionId: m.s.id, ...params }, headers });
  const post = (page: Page, path: string, data: Record<string, unknown>, confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/server/${path}`, { data: { connectionId: m.s.id, confirmed, ...data }, headers });
  const dbName = (): string => `dbo_e2e_${m.s.coll.replace(/[^a-z0-9_]/g, "_").slice(-24)}`;

  const dropDb = (name: string): void => {
    try {
      execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", name, "--eval", "db.dropDatabase()"], { stdio: "ignore" });
    } catch {
      /* docker is optional for cleanup */
    }
  };

  test("the server tool is advertised and reports status", async ({ page }) => {
    await m.add(page, '{"a":1}');
    const spec = await j(await page.request.get(`${apiUrl()}/nosql/describe`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers }));
    expect(spec.tools).toEqual(expect.arrayContaining(["cli", "server"]));

    const status = (await j(await get(page, "status"))) as { version: string; uptimeSecs: number; connections: Record<string, number>; opCounters: Record<string, number> };
    expect(status.version).toMatch(/^\d+\.\d+/);
    expect(status.uptimeSecs).toBeGreaterThan(0);
    expect(status.connections.current).toBeGreaterThan(0);
    expect(Object.keys(status.opCounters)).toEqual(expect.arrayContaining(["insert", "query"]));

    const ops = (await j(await get(page, "operations"))) as { id: string; secs: number }[];
    expect(Array.isArray(ops)).toBe(true);
    // The call that lists operations does not list itself.
    expect(JSON.stringify(ops)).not.toContain('"currentOp"');
  });

  test("creates and drops a database, with the drop needing confirmation", async ({ page }) => {
    const name = dbName();
    try {
      expect((await post(page, "databases", { name, collection: "first" })).ok()).toBeTruthy();
      const dbs = (await j(await get(page, "databases"))) as { name: string; collections: number }[];
      expect(dbs.find((d) => d.name === name)?.collections).toBe(1);

      for (const bad of ["a b", "x/y", "$x", "", "admin.x"]) {
        expect((await post(page, "databases", { name: bad, collection: "c" })).ok(), bad).toBeFalsy();
      }
      for (const system of ["admin", "local", "config"]) {
        expect((await post(page, "databases/drop", { name: system })).ok(), system).toBeFalsy();
      }

      const unconfirmed = await post(page, "databases/drop", { name }, false);
      expect(unconfirmed.status()).toBe(403);
      expect(((await j(await get(page, "databases"))) as { name: string }[]).some((d) => d.name === name)).toBe(true);

      expect((await post(page, "databases/drop", { name })).ok()).toBeTruthy();
      expect(((await j(await get(page, "databases"))) as { name: string }[]).some((d) => d.name === name)).toBe(false);
    } finally {
      dropDb(name);
    }
  });

  test("creates capped, time series and view collections, and lists them by type", async ({ page }) => {
    const name = dbName();
    try {
      expect((await post(page, "databases", { name, collection: "base" })).ok()).toBeTruthy();
      const make = (collection: string, options: Record<string, unknown>) => post(page, "collections", { database: name, name: collection, options });

      expect((await make("log", { kind: "capped", cappedBytes: 8192 })).ok()).toBeTruthy();
      expect((await make("metrics", { kind: "timeseries", timeField: "ts", metaField: "host", granularity: "minutes" })).ok()).toBeTruthy();
      expect((await make("only_big", { kind: "view", viewOn: "base", pipeline: '[{"$match":{"n":{"$gt":1}}}]' })).ok()).toBeTruthy();

      const list = (await j(await get(page, "collections", { database: name }))) as { name: string; type: string; capped: boolean }[];
      const by = Object.fromEntries(list.map((c) => [c.name, c]));
      expect(by.base.type).toBe("collection");
      expect(by.log.capped).toBe(true);
      expect(by.metrics.type).toBe("timeseries");
      expect(by.only_big.type).toBe("view");

      for (const options of [{ kind: "capped", cappedBytes: 10 }, { kind: "timeseries" }, { kind: "view", viewOn: "base", pipeline: '[{"$out":"x"}]' }, { kind: "weird" }]) {
        expect((await make("bad", options)).ok(), JSON.stringify(options)).toBeFalsy();
      }
    } finally {
      dropDb(name);
    }
  });

  test("lists GridFS buckets and files, downloads a file and deletes it", async ({ page }) => {
    const name = dbName();
    const cli = (input: string) => page.request.post(`${apiUrl()}/nosql/tools/cli/run`, { data: { connectionId: m.s.id, input, confirmed: true }, headers });
    try {
      expect((await post(page, "databases", { name, collection: "seed" })).ok()).toBeTruthy();
      const id = "6af000000000000000000001";
      const base = `use ${name};\n`;
      const inserted = await cli(`${base}db.getCollection("fs.files").insertOne({"_id":{"$oid":"${id}"},"length":11,"chunkSize":261120,"uploadDate":{"$date":"2024-01-02T00:00:00Z"},"filename":"hello.txt","metadata":{"contentType":"text/plain"}})`);
      expect(inserted.ok(), await inserted.text()).toBeTruthy();
      expect((await cli(`${base}db.getCollection("fs.chunks").insertOne({"files_id":{"$oid":"${id}"},"n":0,"data":{"$binary":{"base64":"aGVsbG8gd29ybGQ=","subType":"00"}}})`)).ok()).toBeTruthy();

      expect((await j(await get(page, "gridfs/buckets", { database: name }))) as string[]).toEqual(["fs"]);
      const files = (await j(await get(page, "gridfs/files", { database: name, bucket: "fs" }))) as { id: string; filename: string; length: number; contentType: string }[];
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({ id, filename: "hello.txt", length: 11, contentType: "text/plain" });

      const download = await get(page, "gridfs/download", { database: name, bucket: "fs", id });
      expect(download.status()).toBe(200);
      expect(await download.text()).toBe("hello world");
      expect(download.headers()["content-disposition"]).toContain("hello.txt");
      expect((await get(page, "gridfs/download", { database: name, bucket: "fs", id: "6af0000000000000000000ff" })).ok()).toBeFalsy();

      expect((await post(page, "gridfs/delete", { database: name, bucket: "fs", id }, false)).status()).toBe(403);
      expect((await post(page, "gridfs/delete", { database: name, bucket: "fs", id })).ok()).toBeTruthy();
      expect((await j(await get(page, "gridfs/files", { database: name, bucket: "fs" }))) as unknown[]).toHaveLength(0);
    } finally {
      dropDb(name);
    }
  });

  test("users and operations answer, killing needs a number and confirmation", async ({ page }) => {
    const users = await get(page, "users");
    // An open server has no users; a locked one may refuse. Either is a clean answer, never a 5xx crash of the app.
    expect(users.status()).toBeLessThan(500);
    if (users.ok()) expect(Array.isArray(await j(users))).toBe(true);

    expect((await post(page, "operations/kill", { id: "abc" })).ok()).toBeFalsy();
    expect((await post(page, "operations/kill", { id: "1" }, false)).status()).toBe(403);
  });

  test("a change stream says plainly when the server is not a replica set", async ({ page }) => {
    await m.add(page, '{"a":1}');
    const res = await page.request.get(`${apiUrl()}/nosql/server/changes`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers });
    expect(res.status()).toBe(200);
    const first = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as { type: string; message?: string })[0];
    expect(first.type).toBe("error");
    expect(first.message).toContain("replica set");
  });

  /** Opens the Server tool from the collection menu (the tool the tree and the Browse menu both offer). */
  async function openServerTool(page: Page): Promise<void> {
    await m.add(page, '{"a":1}');
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Server", exact: true }).click();
    await expect(page.getByTestId("server-tool")).toBeVisible({ timeout: 15000 });
  }

  test("the Server tool shows status and operations", async ({ page }) => {
    await openServerTool(page);
    await expect(page.getByTestId("server-fact-Version")).toContainText(/^\d+\.\d+/, { timeout: 15000 });
    await expect(page.getByTestId("server-fact-Replica set")).toContainText("Standalone");
    await page.getByTestId("server-tab-operations").click();
    await expect(page.getByTestId("server-tool")).toContainText(/Nothing is running|Operation/, { timeout: 15000 });
  });

  test("the Server tool creates a time series collection and drops a database with a typed name", async ({ page }) => {
    const name = dbName();
    try {
      await openServerTool(page);
      await page.getByTestId("server-tab-databases").click();
      await page.getByRole("textbox", { name: "new-database-name" }).fill(name);
      await page.getByRole("textbox", { name: "new-database-collection" }).fill("base");
      await page.getByRole("button", { name: "Create database", exact: true }).click();
      await expect(page.getByTestId("server-database").filter({ hasText: name })).toBeVisible({ timeout: 15000 });

      await page.getByTestId("server-database").filter({ hasText: name }).click();
      await page.getByRole("textbox", { name: "new-collection-name" }).fill("metrics");
      await page.getByTestId("new-collection-kind").click();
      await page.getByRole("option", { name: "Time series" }).click();
      await page.getByRole("textbox", { name: "time-field" }).fill("ts");
      await page.getByRole("button", { name: "Create collection", exact: true }).click();
      await expect(page.getByTestId("server-collection").filter({ hasText: "metrics" })).toContainText("timeseries", { timeout: 15000 });

      await page.getByRole("button", { name: `drop-${name}` }).click();
      const confirm = page.getByTestId("drop-database-dialog");
      await expect(confirm.getByRole("button", { name: "Drop database" })).toBeDisabled();
      await confirm.getByRole("textbox", { name: "confirm-database-name" }).fill(name);
      await confirm.getByRole("button", { name: "Drop database" }).click();
      await expect(page.getByTestId("server-database").filter({ hasText: name })).toHaveCount(0, { timeout: 15000 });
    } finally {
      dropDb(name);
    }
  });

  test("the Changes tab reports a standalone server in words", async ({ page }) => {
    await openServerTool(page);
    await page.getByTestId("server-tab-changes").click();
    await page.getByRole("textbox", { name: "changes-container" }).fill(m.s.container);
    await page.getByTestId("changes-watch").click();
    await expect(page.getByTestId("change-error")).toContainText("replica set", { timeout: 15000 });
  });
});

