import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { db, useMongo } from "./_case";

const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";

test.describe("MongoDB import, export and collection admin", () => {
  const m = useMongo("tr");
  const q = () => ({ connectionId: m.s.id, containerId: m.s.container });
  const count = async (page: import("@playwright/test").Page, containerId: string): Promise<number> =>
    ((await j(await page.request.get(`${apiUrl()}/nosql/browse`, { params: { connectionId: m.s.id, containerId }, headers }))).items as unknown[]).length;
  const post = (page: import("@playwright/test").Page, path: string, data: Record<string, unknown>) =>
    page.request.post(`${apiUrl()}/nosql/${path}`, { data: { ...q(), confirmed: true, ...data }, headers });

  test("exports NDJSON honoring the filter, and an import brings it back with types intact", async ({ page }) => {
    await m.add(page, '{"name":"a","n":{"$numberLong":"5"},"at":{"$date":{"$numberLong":"1700000000000"}}}');
    await m.add(page, '{"name":"b"}');

    const all = await (await page.request.get(`${apiUrl()}/nosql/export`, { params: q(), headers })).text();
    const lines = all.trim().split("\n");
    expect(lines).toHaveLength(2);

    const one = await (await page.request.get(`${apiUrl()}/nosql/export`, { params: { ...q(), filter: '{"name":"b"}' }, headers })).text();
    expect(one.trim().split("\n")).toHaveLength(1);

    // Clear the collection, then restore it from the export.
    const ids = ((await j(await m.api(page).browse())).items as { id: string }[]).map((i) => i.id);
    await m.api(page).remove(ids);
    const res = await post(page, "import", { data: all, format: "ndjson" });
    expect(((await j(res)) as { inserted: number }).inserted).toBe(2);

    const back = JSON.parse((await j(await m.api(page).get(ids[0]))).value);
    expect(back.n).toEqual({ $numberLong: "5" });
    expect(back.at).toBeTruthy();
  });

  test("imports a JSON array and refuses malformed input without writing", async ({ page }) => {
    const ok = await post(page, "import", { data: '[{"x":1},{"x":2},{"x":3}]', format: "json" });
    expect(((await j(ok)) as { inserted: number }).inserted).toBe(3);

    for (const [data, format] of [['{"x":1}\n{oops', "ndjson"], ["[1,2]", "json"], ['[{"$where":"1"}]', "json"], ['{"x":1}', "csv"]]) {
      expect((await post(page, "import", { data, format })).ok(), `${format}:${data}`).toBeFalsy();
    }
    expect(((await j(await m.api(page).browse())).items as unknown[]).length).toBe(3);
  });

  test("a bad export filter is a 400 before any output", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/export`, { params: { ...q(), filter: "{oops" }, headers });
    expect(res.status()).toBe(400);
  });

  test("renames and drops a collection, and never overwrites an existing one", async ({ page }) => {
    await m.add(page, '{"k":1}');
    const target = `${m.s.coll}_renamed`;

    try {
      const res = await post(page, "collection/rename", { newName: target });
      expect(((await j(res)) as { containerId: string }).containerId).toBe(`${db}/${target}`);
      expect(await count(page, `${db}/${target}`)).toBe(1);

      // The source name is gone, so a second rename of it must fail rather than recreate it.
      expect((await post(page, "collection/rename", { newName: "x" })).ok()).toBeFalsy();
      expect((await post(page, "collection/rename", { containerId: `${db}/${target}`, newName: "system.nope" })).ok()).toBeFalsy();

      expect((await post(page, "collection/drop", { containerId: `${db}/${target}` })).ok()).toBeTruthy();
      expect(await count(page, `${db}/${target}`)).toBe(0);
    } finally {
      try {
        execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(target)}).drop()`], { stdio: "ignore" });
      } catch {
        /* docker is optional for cleanup */
      }
    }
  });

  test("the UI imports a file and renames the collection", async ({ page }) => {
    await m.add(page, '{"seed":1}');
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("import-file").setInputFiles({ name: "docs.ndjson", mimeType: "application/x-ndjson", buffer: Buffer.from('{"a":1}\n{"a":2}\n') });
    await expect(page.getByTestId("browse-footer")).toContainText("3 loaded", { timeout: 15000 });

    const target = `${m.s.coll}_ui`;
    try {
      await page.getByRole("button", { name: "More actions" }).click();
      await page.getByRole("menuitem", { name: "Rename collection" }).click();
      await page.getByRole("textbox", { name: "new-collection-name" }).fill(target);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByTestId("browse-tab")).toHaveCount(0, { timeout: 15000 });
      expect(await count(page, `${db}/${target}`)).toBe(3);
    } finally {
      try {
        execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(target)}).drop()`], { stdio: "ignore" });
      } catch {
        /* docker is optional for cleanup */
      }
    }
  });

  /** Uploads a file to the background import and waits for its job; returns the job's final state. */
  async function importFile(page: import("@playwright/test").Page, name: string, format: string, text: string, containerId = m.s.container) {
    const res = await page.request.post(`${apiUrl()}/nosql/import/job`, {
      multipart: { file: { name, mimeType: "text/plain", buffer: Buffer.from(text) }, connectionId: String(m.s.id), containerId, format, confirmed: "true" },
      headers,
    });
    expect(res.status(), await res.text()).toBe(200);
    const jobId = ((await res.json()) as { data: { jobId: number } }).data.jobId;
    let job: { status: string; error?: string; message?: string; result?: { successRows?: number; totalRows?: number } } = { status: "pending" };
    await expect
      .poll(async () => {
        job = ((await (await page.request.get(`${apiUrl()}/jobs/${jobId}`, { headers })).json()) as { data: typeof job }).data;
        return job.status;
      }, { timeout: 60000, intervals: [500] })
      .toMatch(/completed|failed|canceled/);
    return job;
  }

  test("a background import streams a large NDJSON file in batches", async ({ page }) => {
    const text = Array.from({ length: 2500 }, (_, i) => JSON.stringify({ n: i, name: `doc${i}` })).join("\n");
    const job = await importFile(page, "big.ndjson", "ndjson", text);
    expect(job.status).toBe("completed");
    expect(job.result?.successRows).toBe(2500);
    const count = await m.api(page).cli(`db.${m.s.coll}.countDocuments({})`, false);
    expect(JSON.stringify(await j(count))).toContain("2500");
  });

  test("a CSV import reads numbers, booleans, nested columns and JSON cells, and skips empty cells", async ({ page }) => {
    const csv = ["name,age,active,address.city,tags,note", 'alice,30,true,Paris,"[""a"",""b""]",', "bob,41.5,false,Rome,,hello", ",,,,,"].join("\n");
    const job = await importFile(page, "people.csv", "csv", csv);
    expect(job.status, job.error ?? job.message).toBe("completed");
    expect(job.result?.successRows).toBe(2);

    const docs = ((await j(await m.api(page).browse())).items as { value: string }[]).map((i) => JSON.parse(i.value));
    const alice = docs.find((d) => d.name === "alice");
    expect(alice).toMatchObject({ age: { $numberInt: "30" }, active: true, address: { city: "Paris" }, tags: ["a", "b"] });
    expect(alice.note).toBeUndefined();
    expect(docs.find((d) => d.name === "bob")).toMatchObject({ age: { $numberDouble: "41.5" }, active: false, note: "hello" });
  });

  test("a bad file stops the import and reports what was written", async ({ page }) => {
    const job = await importFile(page, "bad.ndjson", "ndjson", '{"a":1}\n{"a":2}\nnot json');
    expect(job.status).toBe("failed");
    // The reading stops at the bad line, before it reaches the first batch.
    const count = await m.api(page).cli(`db.${m.s.coll}.countDocuments({})`, false);
    expect(JSON.stringify(await j(count))).toContain("0");
  });

  test("a CSV export flattens nested fields and round-trips through the CSV import", async ({ page }) => {
    await m.add(page, '{"name":"alice","age":{"$numberInt":"30"},"address":{"city":"Paris"},"tags":["a","b"]}');
    await m.add(page, '{"name":"bob","age":{"$numberInt":"41"},"address":{"city":"Rome"}}');

    const text = await (await page.request.get(`${apiUrl()}/nosql/export`, { params: { ...q(), format: "csv" }, headers })).text();
    const lines = text.trim().split("\n");
    expect(lines[0].split(",")).toEqual(expect.arrayContaining(["_id", "address.city", "age", "name", "tags"]));
    expect(lines[0].startsWith("_id,")).toBe(true);
    expect(lines).toHaveLength(3);
    expect(text).toContain("alice");
    expect(text).toContain("Paris");

    const ids = ((await j(await m.api(page).browse())).items as { id: string }[]).map((i) => i.id);
    await m.api(page).remove(ids);
    const job = await importFile(page, "round.csv", "csv", text);
    expect(job.status, job.error ?? job.message).toBe("completed");
    const back = ((await j(await m.api(page).browse())).items as { value: string }[]).map((i) => JSON.parse(i.value));
    expect(back.map((d) => d.name).sort()).toEqual(["alice", "bob"]);
    expect(back.find((d) => d.name === "bob").address.city).toBe("Rome");
  });

  test("the upload refuses a bad format and a missing file, and a missing file is not left behind", async ({ page }) => {
    const bad = await page.request.post(`${apiUrl()}/nosql/import/job`, {
      multipart: { file: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("x") }, connectionId: String(m.s.id), containerId: m.s.container, format: "xml", confirmed: "true" },
      headers,
    });
    expect(bad.status()).toBe(400);
    const none = await page.request.post(`${apiUrl()}/nosql/import/job`, { multipart: { connectionId: String(m.s.id), containerId: m.s.container, format: "csv" }, headers });
    expect(none.status()).toBe(400);
  });
});

