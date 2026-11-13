import { expect, test, type Page } from "@playwright/test";
import { clearActiveAiProfile, setAiMode } from "../../helpers/aiSetup";
import { applyChangeset, applyUndo, changesetStatuses, reviewChangeset, undoSql, type ProposedChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { j } from "../../helpers/nosql";
import { SettingsPage } from "../../pages";
import { db, useMongo } from "./_case";

type Step = { type: string; label?: string; content?: string; data?: unknown };

/** Agent mode on MongoDB: statements are proposed, previewed, reviewed, applied, audited and undone. */
test.describe("MongoDB AI agent writes", () => {
  const m = useMongo("agw");
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

  const use = (): string => `use ${db};\n`;
  const names = async (page: Page): Promise<string[]> =>
    ((await j(await m.api(page).browse())).items as { value: string }[]).map((i) => JSON.parse(i.value).name ?? "?").sort();

  async function propose(page: Page, statements: string[], chatId?: number): Promise<{ proposal: ProposedChangeset; events: Step[] }> {
    let id = chatId;
    if (id === undefined) {
      const created = await page.request.post("/api/ai/chats", { data: { connectionId: m.s.id, title: "agent" } });
      id = ((await created.json()) as { data: { id: number } }).data.id;
    }
    llm.script = { name: "preview_write", args: { statements } };
    const sent = await page.request.post("/api/ai/chat/stream", { data: { connectionId: m.s.id, chatId: id, message: "change it", mode: "agent" } });
    const events = (await sent.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as Step);
    const diff = events.find((e) => e.type === "diagram_diff");
    expect(diff?.data, `proposal: ${events.find((e) => e.type === "tool_error")?.content}`).toBeDefined();
    return { proposal: { chatId: id, changeset: diff!.data as ProposedChangeset["changeset"] }, events };
  }

  const seed = async (page: Page): Promise<void> => {
    for (const [name, age] of [["alice", 30], ["bob", 41], ["carol", 52]]) await m.add(page, `{"name":"${name}","age":{"$numberInt":"${age}"}}`);
  };
  const coll = (): string => `db.${m.s.coll}`;

  test("proposes an update with a count and sample, applies it only on request, and undoes it", async ({ page }) => {
    await seed(page);
    const { proposal, events } = await propose(page, [`${use()}${coll()}.updateMany({ age: { $gt: 35 } }, { $set: { name: "senior" } })`]);

    // The model is told what it would touch, and nothing has run.
    const result = events.find((e) => e.label === "preview_write" && e.type === "tool_result");
    expect(result?.content).toContain("2 row(s)");
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);
    expect(proposal.changeset.ops).toHaveLength(1);
    expect(proposal.changeset.ops[0]).toMatchObject({ op: "write", affectedRows: 2, status: "pending" });

    const preview = await page.request.get(`/api/ai/chats/${proposal.chatId}/changesets/${proposal.changeset.id}/ops/0/preview`);
    expect(preview.status(), await preview.text()).toBe(200);
    // An update shows each changed field with its value before and after.
    const sample = (await j(preview)) as { affectedRows: number; columns: string[]; rows: { field: string; before: string; after: string }[] };
    expect(sample.affectedRows).toBe(2);
    expect(sample.columns).toEqual(["document", "field", "before", "after"]);
    expect(sample.rows.map((r) => [r.field, r.before, r.after]).sort()).toEqual([
      ["name", '"bob"', '"senior"'],
      ["name", '"carol"', '"senior"'],
    ]);

    const applied = await applyChangeset(page, proposal, true);
    expect(applied.status(), await applied.text()).toBe(200);
    expect(await names(page)).toEqual(["alice", "senior", "senior"]);
    expect(await changesetStatuses(page, proposal)).toEqual(["applied"]);
    expect((await undoSql(page, proposal)).length).toBeGreaterThan(0);

    await applyUndo(page, proposal);
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);
  });

  test("insert and delete are undone too", async ({ page }) => {
    await seed(page);
    const { proposal } = await propose(page, [
      `${use()}${coll()}.insertMany([{ "name": "dave" }, { "name": "erin" }])`,
      `${use()}${coll()}.deleteOne({ name: "alice" })`,
    ]);
    expect((await applyChangeset(page, proposal, true)).status()).toBe(200);
    expect(await names(page)).toEqual(["bob", "carol", "dave", "erin"]);

    // Taking back an insert deletes documents, which Safe Mode asks to confirm.
    const undo = await page.request.post(`/api/ai/chats/${proposal.chatId}/changesets/${proposal.changeset.id}/undo`);
    expect(undo.status()).toBe(200);
    const undoSet = { chatId: proposal.chatId, changeset: ((await undo.json()) as { data: ProposedChangeset["changeset"] }).data };
    const unconfirmed = await applyChangeset(page, undoSet, false);
    expect(unconfirmed.status()).toBe(403);
    expect(await names(page)).toEqual(["bob", "carol", "dave", "erin"]); // the batch stopped before its first statement
    expect((await applyChangeset(page, undoSet, true)).status()).toBe(200);
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);
  });

  test("a rejected change does not run, and a write that is not a write is refused", async ({ page }) => {
    await seed(page);
    const { proposal } = await propose(page, [`${use()}${coll()}.deleteMany({ age: { $gt: 0 } })`]);
    expect((await reviewChangeset(page, proposal, "rejected")).status()).toBe(200);
    expect((await applyChangeset(page, proposal, true)).status()).toBe(400);
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);

    for (const statement of [`${coll()}.find({})`, `${use()}${coll()}.aggregate([{"$out":"x"}])`, "not a statement"]) {
      llm.script = { name: "preview_write", args: { statements: [statement] } };
      const res = await page.request.post("/api/ai/chat/stream", { data: { connectionId: m.s.id, message: "x", mode: "agent" } });
      const events = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as Step);
      expect(events.find((e) => e.label === "preview_write" && e.type !== "tool_start")?.type, statement).toBe("tool_error");
    }
  });

  test("the connection's agent level decides what applies", async ({ page }) => {
    await seed(page);
    const setTier = async (agentTier: string): Promise<void> => {
      expect((await page.request.patch(`/api/connections/${m.s.id}`, { data: { agentTier } })).status()).toBe(200);
    };

    const data = await propose(page, [`${use()}${coll()}.updateOne({ name: "alice" }, { $set: { age: 31 } })`]);
    // A chat has one open changeset, so the structure change goes in its own chat.
    const structure = await propose(page, [`${use()}${coll()}.createIndex({ name: 1 })`]);

    await setTier("read_only");
    expect((await applyChangeset(page, data.proposal, true)).status()).toBe(403);

    await setTier("data_write");
    expect((await applyChangeset(page, structure.proposal, true)).status()).toBe(403);
    expect((await applyChangeset(page, data.proposal, true)).status()).toBe(200);

    await setTier("schema_change");
    expect((await applyChangeset(page, structure.proposal, true)).status()).toBe(200);
    const indexes = (await j(await page.request.get(`/api/nosql/indexes`, { params: { connectionId: m.s.id, containerId: m.s.container } }))) as { name: string }[];
    expect(indexes.map((i) => i.name)).toContain("name_1");
  });

  test("a prod connection locks the write, whatever the proposal says", async ({ page }) => {
    await seed(page);
    const { proposal } = await propose(page, [`${use()}${coll()}.updateOne({ name: "alice" }, { $set: { age: 99 } })`]);
    expect((await page.request.patch(`/api/connections/${m.s.id}`, { data: { env: "prod" } })).ok()).toBeTruthy();

    const refused = await applyChangeset(page, proposal, true);
    expect(refused.ok()).toBeFalsy();
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);
  });

  test("applied writes are in the audit log", async ({ page }) => {
    await seed(page);
    const { proposal } = await propose(page, [`${use()}${coll()}.updateOne({ name: "bob" }, { $set: { age: 42 } })`]);
    expect((await applyChangeset(page, proposal, true)).status()).toBe(200);
    const audit = (await j(await page.request.get(`/api/ai/audit`, { params: { connectionId: m.s.id, page: 1, count: 20 } }))) as { sql: string; status: string }[];
    expect(audit[0].status).toBe("applied");
    expect(audit[0].sql).toContain("updateOne");
  });

  test("the chat dock reviews and applies a proposal in the UI", async ({ page }) => {
    await seed(page);
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await new SettingsPage(page).openRightSidebar();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
    await setAiMode(page, "agent");

    llm.script = { name: "preview_write", args: { statements: [`${use()}${coll()}.updateMany({ age: { $gt: 35 } }, { $set: { name: "senior" } })`] } };
    const composer = page.getByTestId("ai-chat-input");
    await composer.fill("rename seniors");
    await composer.press("Enter");

    const dock = page.getByTestId("ai-changeset-dock");
    await expect(dock).toContainText("1 change pending", { timeout: 20000 });
    // The card lists the statement; there is no diagram to open for a MongoDB change.
    const card = page.getByTestId("ai-diagram-diff-card");
    await expect(card).toContainText("updateMany");
    await expect(page.getByTestId("ai-diagram-open")).toHaveCount(0);
    expect(await names(page)).toEqual(["alice", "bob", "carol"]);

    await page.getByTestId("ai-dock-apply-all").click();
    await expect(page.getByTestId("ai-dock-preview-modal")).toContainText("updateMany");
    await page.getByTestId("ai-dock-execute").click();
    await expect(dock).toHaveCount(0, { timeout: 20000 });
    expect(await names(page)).toEqual(["alice", "senior", "senior"]);
  });

  test("the preview shows $inc, $unset and $rename results, and says when an operator is not simulated", async ({ page }) => {
    await m.add(page, '{"name":"alice","age":{"$numberInt":"30"},"tmp":1,"old":"x"}');
    const preview = async (update: string): Promise<{ columns: string[]; rows: Record<string, string>[] }> => {
      const { proposal } = await propose(page, [`${use()}${coll()}.updateOne({ name: "alice" }, ${update})`]);
      return (await j(await page.request.get(`/api/ai/chats/${proposal.chatId}/changesets/${proposal.changeset.id}/ops/0/preview`))) as { columns: string[]; rows: Record<string, string>[] };
    };

    const rows = (await preview('{ $inc: { age: 5 }, $unset: { tmp: "" }, $rename: { old: "newer" } }')).rows;
    const by = Object.fromEntries(rows.map((r) => [r.field, [r.before, r.after]]));
    expect(by.age).toEqual(["30", "35"]);
    expect(by.tmp).toEqual(["1", "(removed)"]);
    expect(by.old).toEqual(['"x"', "(removed)"]);
    expect(by.newer).toEqual(["(none)", '"x"']);

    // $push is not simulated: the preview falls back to the plain document sample.
    const pushed = await preview('{ $push: { tags: "a" } }');
    expect(pushed.columns).toEqual(["value"]);
  });
});

