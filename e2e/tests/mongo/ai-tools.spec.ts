import { expect, test, type Page } from "@playwright/test";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { SettingsPage, SqlEditorPage } from "../../pages";
import { db } from "./_case";
import { useMongo } from "./_case";

type Step = { type: string; label?: string; content?: string };

/** The assistant on a MongoDB connection: its own read-only tools, run by a scripted model. */
test.describe("MongoDB AI assistant", () => {
  const m = useMongo("ai");
  let llm: FakeLlm;

  test.beforeEach(async ({ page }) => {
    llm = new FakeLlm();
    const url = await llm.start();
    await clearActiveAiProfile(page);
    await pointProviderAtFakeLlm(page, url);
  });

  test.afterEach(async () => {
    await llm.stop();
  });

  async function turn(page: Page, script: { name: string; args: Record<string, unknown> } | null, mode = "ask"): Promise<Step[]> {
    llm.script = script;
    const res = await page.request.post("/api/ai/chat/stream", {
      data: { connectionId: m.s.id, message: "look at this", mode },
    });
    expect(res.status()).toBe(200);
    return (await res.text())
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Step);
  }

  const call = async (page: Page, name: string, args: Record<string, unknown>): Promise<Step> => {
    const step = (await turn(page, { name, args })).find((e) => e.label === name && e.type !== "tool_start");
    expect(step, `${name} ran`).toBeDefined();
    return step as Step;
  };

  test("offers only the NoSQL read tools and tells the model about the collections", async ({ page }) => {
    await m.add(page, '{"name":"a"}');
    await turn(page, null);

    const offered = llm.offeredTools.at(-1) ?? [];
    expect(offered.sort()).toEqual(["aggregate", "browse_container", "describe_container", "get_item", "list_containers", "list_reports", "pin_report", "review_collection", "run_command", "save_report", "show_chart"]);
    const prompt = llm.systemPrompts.at(-1) ?? "";
    expect(prompt).toContain("Containers:");
    expect(prompt).toContain(m.s.container);
    expect(prompt).not.toContain("Write SQL");
  });

  test("lists, describes, browses and reads documents", async ({ page }) => {
    const id = await m.add(page, '{"name":"alice","age":{"$numberInt":"30"}}');
    await m.add(page, '{"name":"bob","age":{"$numberInt":"41"}}');

    const list = await call(page, "list_containers", {});
    expect(list.type, list.content).toBe("tool_result");
    expect(list.content).toContain(m.s.container);

    const desc = await call(page, "describe_container", { container: m.s.container });
    expect(desc.type, desc.content).toBe("tool_result");
    expect(desc.content).toContain("age");

    const browse = await call(page, "browse_container", { container: m.s.container, filter: '{"age":{"$gt":35}}' });
    expect(browse.type, browse.content).toBe("tool_result");
    expect(browse.content).toContain("bob");
    expect(browse.content).not.toContain("alice");

    const item = await call(page, "get_item", { container: m.s.container, item: id });
    expect(item.content).toContain("alice");
  });

  test("runs reads and aggregations, and refuses writes and JavaScript", async ({ page }) => {
    await m.add(page, '{"tag":"a","n":{"$numberInt":"1"}}');
    await m.add(page, '{"tag":"a","n":{"$numberInt":"2"}}');
    const coll = m.s.coll;

    const count = await call(page, "run_command", { command: `db.${coll}.countDocuments({})` });
    expect(count.type, count.content).toBe("tool_result");
    expect(count.content).toContain("2");

    const agg = await call(page, "aggregate", { container: m.s.container, pipeline: '[{"$group":{"_id":"$tag","total":{"$sum":"$n"}}}]' });
    expect(agg.type, agg.content).toBe("tool_result");
    expect(agg.content).toContain("total");

    for (const [name, args] of [
      ["run_command", { command: `db.${coll}.deleteMany({})` }],
      ["run_command", { command: `db.${coll}.insertOne({"x":1})` }],
      ["run_command", { command: `db.${coll}.drop()` }],
      ["aggregate", { container: m.s.container, pipeline: '[{"$out":"stolen"}]' }],
      ["aggregate", { container: m.s.container, pipeline: '[{"$match":{"$where":"1"}}]' }],
    ] as const) {
      const step = await call(page, name, args as Record<string, unknown>);
      expect(step.type, `${name} ${JSON.stringify(args)}`).toBe("tool_error");
    }
    // Nothing was written or dropped.
    const after = await call(page, "run_command", { command: `db.${coll}.countDocuments({})` });
    expect(after.content).toContain("2");
  });

  test("SQL tools and schema proposals are refused on a MongoDB connection, even in Agent mode", async ({ page }) => {
    await m.add(page, '{"a":1}');
    for (const name of ["execute_sql", "list_tables", "propose_schema_change"]) {
      const step = (await turn(page, { name, args: { sql: "select 1" } }, "agent")).find((e) => e.label === name && e.type !== "tool_start");
      expect(step?.type, name).toBe("tool_error");
    }
    expect(llm.offeredTools.at(-1)).toContain("preview_write");
  });

  test("the sidebar shows Assistant and Snippets but no Fields, and the chat answers", async ({ page }) => {
    await m.add(page, '{"name":"a"}');
    llm.reply = { text: "There is one document.", wordDelayMs: 0 };

    // The panel reads the provider once on load; reload so it sees the one the test just configured.
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    const settings = new SettingsPage(page);
    await settings.openRightSidebar();
    await expect(page.getByRole("tab", { name: "Assistant" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Snippets" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Fields" })).toHaveCount(0);

    const composer = page.getByPlaceholder(/ask anything/i);
    await expect(composer).toBeVisible({ timeout: 15000 });
    await composer.fill("how many documents?");
    await composer.press("Enter");
    await expect(page.getByText("There is one document.")).toBeVisible({ timeout: 20000 });

    await page.getByRole("tab", { name: "Snippets" }).click();
    const snippets = page.getByTestId("nosql-snippets");
    await expect(snippets).toBeVisible();
    await expect(snippets.getByText("db.collection.find({}).limit(100)")).toBeVisible();
    await expect(page.getByTestId("sql-snippets")).toHaveCount(0);
  });

  /** Reloads so the panel sees the fake provider, then opens the assistant. */
  async function openAssistant(page: Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await new SettingsPage(page).openRightSidebar();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
  }

  test("an empty chat suggests MongoDB starters, not SQL ones", async ({ page }) => {
    await openAssistant(page);
    await expect(page.getByTestId("ai-starter-ai_prompt_nosql_collections")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("ai-starter-ai_prompt_list_tables")).toHaveCount(0);
    await expect(page.getByTestId("ai-starter-ai_prompt_write_join")).toHaveCount(0);
  });

  test("the tree menu asks about a collection in MongoDB words", async ({ page }) => {
    await m.add(page, '{"a":1}');
    await openAssistant(page);
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).click({ button: "right" });
    await page.getByRole("menuitem", { name: "AI", exact: true }).hover();
    await expect(page.getByRole("menuitem", { name: /generate a select/i })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Suggest indexes" }).click();
    await expect(page.getByText(`Which indexes would help the collection ${m.s.container}?`)).toBeVisible({ timeout: 20000 });
  });

  test("a failed statement offers Fix with AI, and the chat sees the error context", async ({ page }) => {
    await m.add(page, '{"a":1}');
    await openAssistant(page);
    const editor = new SqlEditorPage(page);
    await editor.open();
    await editor.typeQuery(`use ${db};\ndb.${m.s.coll}.find({oops: })`);
    await editor.clickRun();
    await page.getByTestId("mongo-fix-with-ai").click();
    await expect(page.getByText("Help me fix this MongoDB statement error.")).toBeVisible({ timeout: 20000 });
    expect(llm.systemPrompts.at(-1) ?? "").toContain("find({oops");
  });

  test("a successful run feeds its result to the assistant", async ({ page }) => {
    await m.add(page, '{"name":"alice"}');
    await openAssistant(page);
    const editor = new SqlEditorPage(page);
    await editor.open();
    await editor.typeQuery(`use ${db};\ndb.${m.s.coll}.find({})`);
    await editor.clickRun();
    await expect(page.getByTestId("mongo-result")).toContainText("alice", { timeout: 20000 });

    const composer = page.getByPlaceholder(/ask anything/i);
    await composer.fill("what did that return?");
    await composer.press("Enter");
    await expect.poll(() => llm.systemPrompts.at(-1) ?? "", { timeout: 20000 }).toContain("Sample documents");
  });

  test("Ask AI about this collection is in the Browse menu", async ({ page }) => {
    await m.add(page, '{"a":1}');
    await openAssistant(page);
    const dbNode = page.getByTestId(`tree-node-${db}`);
    if (!(await dbNode.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${m.s.name.toLowerCase()}`).click();
    await dbNode.click();
    await page.getByTestId(`tree-node-${m.s.coll}`).dblclick();
    await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Ask AI about this collection" }).click();
    await expect(page.getByText(`Tell me about the collection ${m.s.container}.`)).toBeVisible({ timeout: 20000 });
  });

  test("inline completion works on MongoDB with a shell prompt and the collection list", async ({ page }) => {
    await m.add(page, '{"a":1}');
    const res = await page.request.post("/api/ai/complete", {
      data: { connectionId: m.s.id, contextOpts: { prompt: `db.${m.s.coll}.fi`, suffix: "" } },
    });
    expect(res.status(), await res.text()).toBe(200);

    const prompt = llm.systemPrompts.at(-1) ?? "";
    expect(prompt).toContain("MongoDB shell statements");
    expect(prompt).toContain(m.s.container);
    expect(prompt).not.toContain("SQL fill-in-the-middle");
  });

  const rowsOf = (step: Step): { columns: { name: string; type: string }[]; rows: Record<string, unknown>[]; count: number } =>
    JSON.parse(step.content ?? "{}");

  test("a chart runs a pipeline and flattens documents into plain columns", async ({ page }) => {
    await m.add(page, '{"city":"Paris","n":{"$numberInt":"3"},"at":{"$date":"2024-01-02T00:00:00Z"},"geo":{"lat":1.5}}');
    await m.add(page, '{"city":"Paris","n":{"$numberLong":"4"},"geo":{"lat":2.5}}');
    await m.add(page, '{"city":"Rome","n":{"$numberInt":"10"},"geo":{"lat":3.5}}');

    const grouped = rowsOf(
      await call(page, "show_chart", {
        title: "Total per city",
        type: "bar",
        container: m.s.container,
        pipeline: '[{"$group":{"_id":"$city","total":{"$sum":"$n"}}},{"$sort":{"_id":1}}]',
      }),
    );
    expect(grouped.columns.map((c) => c.name)).toEqual(["_id", "total"]);
    expect(grouped.columns.find((c) => c.name === "total")?.type).toBe("number");
    expect(grouped.rows).toEqual([{ _id: "Paris", total: 7 }, { _id: "Rome", total: 10 }]);

    // Documents flatten: nested fields get dotted names and extended JSON numbers become numbers.
    const docs = rowsOf(await call(page, "show_chart", { title: "All", type: "table", container: m.s.container, pipeline: '[{"$sort":{"city":1,"n":1}},{"$project":{"_id":0}}]' }));
    expect(docs.columns.map((c) => c.name)).toEqual(expect.arrayContaining(["city", "n", "geo.lat"]));
    expect(docs.rows[0]).toMatchObject({ city: "Paris", n: 3, "geo.lat": 1.5 });
    expect(typeof docs.rows[0].at).toBe("string");

    const cmd = rowsOf(await call(page, "show_chart", { title: "Count", type: "number", command: `db.${m.s.coll}.countDocuments({})` }));
    expect(cmd.rows).toEqual([{ value: 3 }]);
  });

  test("a chart refuses writes, mixed input and missing input", async ({ page }) => {
    await m.add(page, '{"a":1}');
    for (const args of [
      { title: "x", type: "table", container: m.s.container, pipeline: '[{"$out":"x"}]' },
      { title: "x", type: "table", command: `db.${m.s.coll}.deleteMany({})` },
      { title: "x", type: "table", container: m.s.container, pipeline: "[]", command: "PING" },
      { title: "x", type: "table" },
      { title: "x", type: "table", container: m.s.container, pipeline: "{}" },
    ]) {
      expect((await call(page, "show_chart", args)).type, JSON.stringify(args)).toBe("tool_error");
    }
  });

  test("a report saves, runs, refuses filters, and a board pins it", async ({ page }) => {
    await m.add(page, '{"city":"Paris","n":3}');
    await m.add(page, '{"city":"Rome","n":5}');
    const pipeline = '[{"$group":{"_id":"$city","total":{"$sum":"$n"}}},{"$sort":{"_id":1}}]';

    const saved = await call(page, "save_report", { title: "Per city", type: "bar", x: "_id", y: ["total"], container: m.s.container, pipeline });
    expect(saved.type, saved.content).toBe("tool_result");

    const list = (await (await page.request.get(`/api/questions?connectionId=${m.s.id}`)).json()) as { data: { id: number; name: string; sql: string }[] };
    const report = list.data.find((q) => q.name === "Per city");
    expect(report, "report listed").toBeDefined();
    expect(JSON.parse(report!.sql)).toMatchObject({ container: m.s.container });

    const run = await page.request.post(`/api/questions/${report!.id}/run`, { data: { params: {} } });
    expect(run.status(), await run.text()).toBe(200);
    const result = ((await run.json()) as { data: { rows: unknown[]; columns: { name: string }[] } }).data;
    expect(result.rows).toEqual([{ _id: "Paris", total: 3 }, { _id: "Rome", total: 5 }]);

    // This report declares no filters, so a value for one changes nothing.
    const extra = await page.request.post(`/api/questions/${report!.id}/run`, { data: { params: { city: "Rome" } } });
    expect(extra.status()).toBe(200);
    const refused = await page.request.post("/api/questions", {
      data: { connectionId: m.s.id, name: "Bad", sql: JSON.stringify({ command: `db.${m.s.coll}.drop()` }), chart: { type: "table", y: [] } },
    });
    expect(refused.ok()).toBeFalsy();

    const pinned = await call(page, "pin_report", { reportId: report!.id, board: "Cities" });
    expect(pinned.type, pinned.content).toBe("tool_result");
    const listed = await call(page, "list_reports", {});
    expect(listed.content).toContain("Per city");
    expect(listed.content).toContain("Cities");
  });

  test("the chat draws a Mongo chart card that saves as a report the Boards tab lists", async ({ page }) => {
    await m.add(page, '{"city":"Paris","n":3}');
    await m.add(page, '{"city":"Rome","n":5}');
    await openAssistant(page);

    llm.script = {
      name: "show_chart",
      args: {
        title: "Total per city",
        type: "bar",
        x: "_id",
        y: ["total"],
        container: m.s.container,
        pipeline: '[{"$group":{"_id":"$city","total":{"$sum":"$n"}}},{"$sort":{"_id":1}}]',
      },
    };
    const composer = page.getByTestId("ai-chat-input");
    await composer.fill("total per city");
    await composer.press("Enter");

    const card = page.getByTestId("ai-report-card");
    await expect(card).toContainText("Total per city", { timeout: 20000 });
    await expect(card.getByTestId("ai-chart")).toHaveAttribute("data-type", "bar");

    await card.getByTestId("ai-report-save").click();
    await expect.poll(async () => {
      const list = (await (await page.request.get(`/api/questions?connectionId=${m.s.id}`)).json()) as { data: { name: string; sql: string }[] };
      return list.data.find((q) => q.name === "Total per city")?.sql ?? "";
    }, { timeout: 15000 }).toContain('"pipeline"');

    // The saved report shows in the Boards sidebar instead of a "needs a SQL connection" notice.
    await page.mouse.move(600, 300);
    await page.getByTestId("sidebar-tab-boards").click();
    await expect(page.getByTestId("boards-view")).toContainText("Total per city", { timeout: 15000 });
  });

  test("review_collection flags an unused index, mixed types and a missing validator, with a fix to propose", async ({ page }) => {
    await m.add(page, '{"city":"Paris","n":{"$numberInt":"1"},"zip":"75001"}');
    await m.add(page, '{"city":"Rome","n":{"$numberInt":"2"},"zip":{"$numberInt":"184"}}');
    await m.add(page, '{"city":"Oslo","n":{"$numberDouble":"3.5"},"zip":"0150"}');
    expect((await page.request.post("/api/nosql/indexes", { data: { connectionId: m.s.id, containerId: m.s.container, spec: { keys: '{"city":1}' }, confirmed: true } })).ok()).toBeTruthy();

    const review = JSON.parse((await call(page, "review_collection", { container: m.s.container })).content ?? "{}") as {
      suggestions: { severity: string; title: string; fix?: string }[];
    };
    const titles = review.suggestions.map((s) => s.title);
    expect(titles).toContain("Mixed types in zip");
    // Number types mix freely in MongoDB, so n is not flagged.
    expect(titles).not.toContain("Mixed types in n");
    expect(titles).toContain("No validation rule");
    const unused = review.suggestions.find((s) => s.title === "Unused index city_1");
    expect(unused?.fix).toContain('dropIndex("city_1")');
  });

  test("a report's {{filters}} go in as typed JSON values, never as pasted text", async ({ page }) => {
    for (const [city, n] of [["Paris", 3], ["Rome", 5], ["Oslo", 8]] as [string, number][]) await m.add(page, `{"city":"${city}","n":{"$numberInt":"${n}"},"at":{"$date":"2024-03-0${n > 3 ? 2 : 1}T00:00:00Z"}}`);
    const spec = JSON.stringify({
      container: m.s.container,
      pipeline: [{ $match: { city: "{{city}}", n: { $gte: "{{min:number}}" } } }, { $project: { _id: 0, city: 1, n: 1 } }],
    });
    const created = await page.request.post("/api/questions", { data: { connectionId: m.s.id, name: "Filtered", sql: spec, chart: { type: "table", y: [] }, params: { city: "Rome", min: "1" } } });
    expect(created.status(), await created.text()).toBe(200);
    const id = ((await created.json()) as { data: { id: number } }).data.id;
    const run = async (params: Record<string, string>) =>
      page.request.post(`/api/questions/${id}/run`, { data: { params } });
    const rowsOf = async (params: Record<string, string>): Promise<Record<string, unknown>[]> =>
      ((await (await run(params)).json()) as { data: { rows: Record<string, unknown>[] } }).data.rows;

    expect(await rowsOf({ city: "Rome", min: "1" })).toEqual([{ city: "Rome", n: 5 }]);
    // min is a number filter, so 6 keeps only the larger one, and "Oslo" works the same way.
    expect(await rowsOf({ city: "Oslo", min: "6" })).toEqual([{ city: "Oslo", n: 8 }]);
    expect(await rowsOf({ city: "Oslo", min: "9" })).toEqual([]);

    // A value that tries to become an operator stays a plain string and matches nothing.
    expect(await rowsOf({ city: '{"$ne": null}', min: "1" })).toEqual([]);
    // Wrong type, missing value and field filters are refused.
    expect((await run({ city: "Rome", min: "many" })).status()).toBe(400);
    expect((await run({ city: "Rome" })).status()).toBe(400);
    const field = await page.request.post("/api/questions", { data: { connectionId: m.s.id, name: "F", sql: JSON.stringify({ container: m.s.container, pipeline: [{ $match: { a: "{{x:field=t.c}}" } }] }), chart: { type: "table", y: [] } } });
    const fid = ((await field.json()) as { data: { id: number } }).data.id;
    expect((await page.request.post(`/api/questions/${fid}/run`, { data: { params: {} } })).status()).toBe(400);
  });

  test("a date filter matches by day", async ({ page }) => {
    await m.add(page, '{"city":"Paris","at":{"$date":"2024-03-01T00:00:00Z"}}');
    await m.add(page, '{"city":"Rome","at":{"$date":"2024-03-05T00:00:00Z"}}');
    const spec = JSON.stringify({ container: m.s.container, pipeline: [{ $match: { at: { $gte: "{{since:date}}" } } }, { $project: { _id: 0, city: 1 } }] });
    const preview = await page.request.post("/api/questions/preview", { data: { connectionId: m.s.id, sql: spec, params: { since: "2024-03-03" } } });
    expect(preview.status(), await preview.text()).toBe(200);
    expect(((await preview.json()) as { data: { rows: unknown[] } }).data.rows).toEqual([{ city: "Rome" }]);
  });

  test("a chart tool call fills its filters from params", async ({ page }) => {
    await m.add(page, '{"city":"Paris","n":3}');
    await m.add(page, '{"city":"Rome","n":5}');
    const step = await call(page, "show_chart", {
      title: "One city",
      type: "table",
      container: m.s.container,
      pipeline: '[{"$match":{"city":"{{city}}"}},{"$project":{"_id":0,"city":1,"n":1}}]',
      params: { city: "Rome" },
    });
    expect(step.type, step.content).toBe("tool_result");
    expect(rowsOf(step).rows).toEqual([{ city: "Rome", n: 5 }]);

    const unfilled = await call(page, "show_chart", { title: "x", type: "table", container: m.s.container, pipeline: '[{"$match":{"city":"{{city}}"}}]' });
    expect(unfilled.type).toBe("tool_error");
  });
});

