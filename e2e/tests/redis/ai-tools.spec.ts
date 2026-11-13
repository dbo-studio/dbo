import { expect, test, type Page } from "@playwright/test";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { applyChangeset, type ProposedChangeset } from "../../helpers/changeset";
import { j } from "../../helpers/nosql";
import { useRedis } from "../../helpers/redisCase";
import { SettingsPage } from "../../pages";

type Step = { type: string; label?: string; content?: string };

/** The assistant on a Redis connection: the same read-only tools, with key names and commands. */
test.describe("Redis AI assistant", () => {
  const r = useRedis();
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

  async function call(page: Page, name: string, args: Record<string, unknown>): Promise<Step> {
    llm.script = { name, args };
    const res = await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, message: "look", mode: "ask" } });
    expect(res.status()).toBe(200);
    const events = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as Step);
    const step = events.find((e) => e.label === name && e.type !== "tool_start");
    expect(step, `${name} ran`).toBeDefined();
    return step as Step;
  }

  test("tells the model about the databases, lists keys, reads a value and refuses writes", async ({ page }) => {
    const key = `${r.s.prefix}:ai`;
    try {
      expect((await r.api(page).insert({ id: key, view: "text", value: "hello", meta: { kind: "string" } })).ok()).toBeTruthy();

      llm.script = null;
      await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, message: "hi", mode: "ask" } });
      expect((llm.offeredTools.at(-1) ?? []).sort()).toEqual(["aggregate", "browse_container", "describe_container", "get_item", "list_containers", "list_reports", "pin_report", "review_collection", "run_command", "save_report", "show_chart"]);
      const prompt = llm.systemPrompts.at(-1) ?? "";
      expect(prompt).toContain("Containers:");
      expect(prompt).toContain("db0");
      expect(prompt).not.toContain("Write SQL");

      const list = await call(page, "list_containers", {});
      expect(list.content).toContain("db0");

      const browse = await call(page, "browse_container", { container: "db0", filter: `${r.s.prefix}:*` });
      expect(browse.type, browse.content).toBe("tool_result");
      expect(browse.content).toContain(key);

      const got = await call(page, "get_item", { container: "db0", item: key });
      expect(got.content).toContain("hello");

      const type = await call(page, "run_command", { command: `TYPE ${key}` });
      expect(type.type, type.content).toBe("tool_result");
      expect(type.content).toContain("string");

      for (const command of [`SET ${key} changed`, `DEL ${key}`, "FLUSHDB"]) {
        const refused = await call(page, "run_command", { command });
        expect(refused.type, command).toBe("tool_error");
      }
      expect((await call(page, "aggregate", { container: "db0", pipeline: "[]" })).type).toBe("tool_error");
      expect((await call(page, "get_item", { container: "db0", item: key })).content).toContain("hello");
    } finally {
      await r.api(page).remove([key]);
    }
  });

  async function openAssistant(page: Page): Promise<void> {
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await new SettingsPage(page).openRightSidebar();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
  }

  const ask = async (page: Page, text: string): Promise<void> => {
    const composer = page.getByPlaceholder(/ask anything/i);
    await composer.fill(text);
    await composer.press("Enter");
  };

  test("the sidebar has no Fields tab, and the starters are Redis ones", async ({ page }) => {
    await openAssistant(page);
    await expect(page.getByRole("tab", { name: "Fields" })).toHaveCount(0);
    await expect(page.getByTestId("ai-starter-ai_prompt_redis_keys")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("ai-starter-ai_prompt_write_join")).toHaveCount(0);
  });

  test("a Redis code block runs in the terminal, and Insert only fills the prompt", async ({ page }) => {
    const key = `${r.s.prefix}:ai-run`;
    try {
      expect((await r.api(page).insert({ id: key, view: "text", value: "v", meta: { kind: "string" } })).ok()).toBeTruthy();
      llm.reply = { text: `Check it:\n\`\`\`redis\nGET ${key}\n\`\`\`\n`, wordDelayMs: 0 };
      await openAssistant(page);
      await ask(page, "read the key");
      await expect(page.getByTestId("ai-code-run").last()).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId("ai-code-open-tab")).toHaveCount(0);

      await page.getByTestId("ai-code-insert").last().click();
      const terminal = page.getByTestId("db-terminal");
      await expect(terminal).toBeVisible({ timeout: 15000 });
      await expect(terminal).toContainText(`GET ${key}`, { timeout: 15000 });
      // Insert leaves the command on the prompt: it has not run, so there is no reply yet.
      await expect(terminal).not.toContainText('"v"');

      await page.getByTestId("ai-code-run").last().click();
      await expect(terminal).toContainText('"v"', { timeout: 15000 });
    } finally {
      await r.api(page).remove([key]);
    }
  });

  test("the tree menu asks about a Redis database in Redis words", async ({ page }) => {
    await openAssistant(page);
    const db0 = page.getByTestId("tree-node-db0");
    if (!(await db0.isVisible().catch(() => false))) await page.getByTestId(`tree-node-${r.s.name.toLowerCase()}`).click();
    await db0.click({ button: "right" });
    await page.getByRole("menuitem", { name: "AI", exact: true }).hover();
    await expect(page.getByRole("menuitem", { name: /generate a select/i })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Find keys" }).click();
    await expect(page.getByText(/Write a command to find keys in the Redis database db0\./)).toBeVisible({ timeout: 20000 });
  });

  test("inline completion works on Redis with a command prompt", async ({ page }) => {
    const res = await page.request.post("/api/ai/complete", {
      data: { connectionId: r.s.id, contextOpts: { prompt: "HGET", suffix: "" } },
    });
    expect(res.status(), await res.text()).toBe(200);
    const prompt = llm.systemPrompts.at(-1) ?? "";
    expect(prompt).toContain("Redis commands");
    expect(prompt).not.toContain("SQL fill-in-the-middle");
  });

  test("a chart and a report run a read-only Redis command; a write is refused", async ({ page }) => {
    const key = `${r.s.prefix}:report`;
    try {
      expect((await r.api(page).insert({ id: key, view: "text", value: "v", meta: { kind: "string" } })).ok()).toBeTruthy();

      const size = await call(page, "show_chart", { title: "Keys", type: "number", command: "DBSIZE" });
      expect(size.type, size.content).toBe("tool_result");
      expect(JSON.parse(size.content ?? "{}").columns).toEqual([{ name: "value", type: "number" }]);

      const refused = await call(page, "show_chart", { title: "Bad", type: "table", command: `DEL ${key}` });
      expect(refused.type).toBe("tool_error");

      const saved = await call(page, "save_report", { title: "Key count", type: "number", command: "DBSIZE" });
      expect(saved.type, saved.content).toBe("tool_result");
      const list = (await (await page.request.get(`/api/questions?connectionId=${r.s.id}`)).json()) as { data: { id: number; name: string }[] };
      const report = list.data.find((q) => q.name === "Key count");
      expect(report).toBeDefined();
      const run = await page.request.post(`/api/questions/${report!.id}/run`, { data: { params: {} } });
      expect(run.status(), await run.text()).toBe(200);
      expect(((await run.json()) as { data: { count: number } }).data.count).toBe(1);
    } finally {
      await r.api(page).remove([key]);
    }
  });

  test("Agent mode proposes Redis commands, applies them on request, and undoes them", async ({ page }) => {
    const key = `${r.s.prefix}:agent`;
    const fresh = `${r.s.prefix}:agent-new`;
    const value = async (id: string): Promise<string | null> => {
      const res = await r.api(page).get(id);
      return res.ok() ? ((await j(res)).value as string) : null;
    };

    try {
      expect((await r.api(page).insert({ id: key, view: "text", value: "old", meta: { kind: "string" } })).ok()).toBeTruthy();

      const created = await page.request.post("/api/ai/chats", { data: { connectionId: r.s.id, title: "agent" } });
      const chatId = ((await created.json()) as { data: { id: number } }).data.id;
      llm.script = { name: "preview_write", args: { statements: [`SET ${key} new`, `SET ${fresh} made`] } };
      const sent = await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, chatId, message: "change keys", mode: "agent" } });
      const events = (await sent.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as { type: string; label?: string; content?: string; data?: unknown });
      const diff = events.find((e) => e.type === "diagram_diff");
      expect(diff?.data, events.find((e) => e.type === "tool_error")?.content).toBeDefined();
      const proposal: ProposedChangeset = { chatId, changeset: diff!.data as ProposedChangeset["changeset"] };

      // Nothing has run yet.
      expect(await value(key)).toBe("old");
      expect(await value(fresh)).toBeNull();

      expect((await applyChangeset(page, proposal, true)).status()).toBe(200);
      expect(await value(key)).toBe("new");
      expect(await value(fresh)).toBe("made");

      // Undo: the changed key gets its old value back and the key the change created goes away (a delete: confirm it).
      const undo = await page.request.post(`/api/ai/chats/${chatId}/changesets/${proposal.changeset.id}/undo`);
      expect(undo.status(), await undo.text()).toBe(200);
      const undoSet = { chatId, changeset: ((await undo.json()) as { data: ProposedChangeset["changeset"] }).data };
      expect((await applyChangeset(page, undoSet, false)).status()).toBe(403);
      expect((await applyChangeset(page, undoSet, true)).status()).toBe(200);
      expect(await value(key)).toBe("old");
      expect(await value(fresh)).toBeNull();

      // A command the driver blocks (scripting) never reaches a proposal.
      for (const statement of ["FLUSHDB", "FLUSHALL", "SELECT 1\nFLUSHDB"]) {
        llm.script = { name: "preview_write", args: { statements: [statement] } };
        const wipe = await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, message: "x", mode: "agent" } });
        const wipeEvents = (await wipe.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as { type: string; label?: string });
        expect(wipeEvents.find((e) => e.label === "preview_write" && e.type !== "tool_start")?.type, statement).toBe("tool_error");
      }
      llm.script = { name: "preview_write", args: { statements: ["EVAL \"return 1\" 0"] } };
      const blocked = await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, message: "x", mode: "agent" } });
      const blockedEvents = (await blocked.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as { type: string; label?: string });
      expect(blockedEvents.find((e) => e.label === "preview_write" && e.type !== "tool_start")?.type).toBe("tool_error");
    } finally {
      await r.api(page).remove([key, fresh]);
    }
  });

  test("collection keys are undone from a rebuilt copy, and a statement can name its database", async ({ page }) => {
    const hash = `${r.s.prefix}:agent-hash`;
    const other = `${r.s.prefix}:agent-db1`;
    const db1 = (await import("../../helpers/nosql")).nosql(page, r.s.id, "db1");
    const item = (id: string, view: string, value: unknown, kind: string) => ({ id, view, value, meta: { kind } });

    try {
      expect((await r.api(page).insert(item(hash, "fields", { a: "1", b: "2" }, "hash"))).ok()).toBeTruthy();
      expect((await db1.insert(item(other, "text", "one", "string"))).ok()).toBeTruthy();

      const created = await page.request.post("/api/ai/chats", { data: { connectionId: r.s.id, title: "agent" } });
      const chatId = ((await created.json()) as { data: { id: number } }).data.id;
      llm.script = { name: "preview_write", args: { statements: [`HSET ${hash} a changed c 3`, `SELECT 1\nSET ${other} changed`] } };
      const sent = await page.request.post("/api/ai/chat/stream", { data: { connectionId: r.s.id, chatId, message: "change", mode: "agent" } });
      const diff = (await sent.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as { type: string; data?: unknown }).find((e) => e.type === "diagram_diff");
      expect(diff?.data).toBeDefined();
      const proposal: ProposedChangeset = { chatId, changeset: diff!.data as ProposedChangeset["changeset"] };

      expect((await applyChangeset(page, proposal, true)).status()).toBe(200);
      expect(((await j(await r.api(page).get(hash))).value as Record<string, string>)).toMatchObject({ a: "changed", c: "3" });
      // The second statement ran on db1, not on the default database.
      expect((await j(await db1.get(other))).value).toBe("changed");
      expect((await r.api(page).get(other)).ok()).toBeFalsy();

      const undo = await page.request.post(`/api/ai/chats/${chatId}/changesets/${proposal.changeset.id}/undo`);
      expect(undo.status(), await undo.text()).toBe(200);
      const undoSet = { chatId, changeset: ((await undo.json()) as { data: ProposedChangeset["changeset"] }).data };
      expect((await applyChangeset(page, undoSet, true)).status()).toBe(200);

      const back = (await j(await r.api(page).get(hash))).value as Record<string, string>;
      expect(back).toEqual({ a: "1", b: "2" });
      expect((await j(await db1.get(other))).value).toBe("one");
    } finally {
      await r.api(page).remove([hash]);
      await db1.remove([other]);
    }
  });

  test("a Redis report's filter is quoted for the command line", async ({ page }) => {
    const key = `${r.s.prefix}:filtered key`;
    try {
      expect((await r.api(page).insert({ id: key, view: "text", value: "found", meta: { kind: "string" } })).ok()).toBeTruthy();
      const created = await page.request.post("/api/questions", {
        data: { connectionId: r.s.id, name: "Get key", sql: JSON.stringify({ command: "GET {{key}}" }), chart: { type: "table", y: [] } },
      });
      expect(created.status(), await created.text()).toBe(200);
      const id = ((await created.json()) as { data: { id: number } }).data.id;
      const rows = async (params: Record<string, string>) =>
        ((await (await page.request.post(`/api/questions/${id}/run`, { data: { params } })).json()) as { data: { rows: unknown[] } }).data.rows;

      // The key has a space in it; the value is quoted, so it is one argument, not two.
      expect(await rows({ key })).toEqual([{ value: "found" }]);
      // A value cannot add a second argument or a second command.
      expect(await rows({ key: `${r.s.prefix}:nope extra` })).toEqual([]);
    } finally {
      await r.api(page).remove([key]);
    }
  });
});

