import { expect, type Page } from "@playwright/test";
import type { FakeLlm } from "./fakeLlm";
import { applyChangeset, changesetStatuses, type Changeset } from "./changeset";

type Suggestion = {
  kind: string;
  table: string;
  message: string;
  ops?: Array<Record<string, unknown>>;
};

/** Tables with one of each design problem review_schema knows. */
export const reviewFixture = (prefix: string): string[] => [
  `CREATE TABLE ${prefix}authors (id INTEGER PRIMARY KEY, name VARCHAR(50))`,
  `CREATE INDEX ${prefix.replace(".", "_")}a_name_1 ON ${prefix}authors (name)`,
  `CREATE INDEX ${prefix.replace(".", "_")}a_name_2 ON ${prefix}authors (name)`,
  `CREATE TABLE ${prefix}posts (id INTEGER PRIMARY KEY, author_id INTEGER)`,
  `CREATE TABLE ${prefix}comments (id INTEGER PRIMARY KEY, post_id INTEGER REFERENCES ${prefix}posts (id))`,
  `CREATE TABLE ${prefix}logs (message VARCHAR(50), "createdAt" VARCHAR(30))`,
];

/**
 * A scripted model calls review_schema; the fixture's problems come back as
 * suggestions, and the fix of the missing foreign key is proposed and applied.
 */
export async function checkSchemaReview(
  page: Page,
  llm: FakeLlm,
  connectionId: number,
  contextOpts?: { database?: string; schema?: string },
): Promise<void> {
  const created = await page.request.post("/api/ai/chats", {
    data: { connectionId, title: "review" },
  });
  const chatId = ((await created.json()) as { data: { id: number } }).data.id;

  llm.script = { name: "review_schema", args: {} };
  const sent = await page.request.post("/api/ai/chat/stream", {
    data: {
      connectionId,
      chatId,
      message: "review my schema",
      mode: "ask",
      contextOpts,
    },
  });
  const events = (await sent.text())
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as { type: string; label?: string; content?: string },
    );
  const step = events.find(
    (event) => event.label === "review_schema" && event.type !== "tool_start",
  );
  expect(step?.type, step?.content).toBe("tool_result");
  const review = JSON.parse(step?.content ?? "{}") as {
    database: string;
    schema: string;
    suggestions: Suggestion[];
  };
  const find = (kind: string, table?: string) =>
    review.suggestions.find(
      (item) =>
        item.kind === kind && (table === undefined || item.table === table),
    );

  expect(find("no_primary_key", "logs")).toBeDefined();
  expect(find("foreign_key_without_index", "comments")?.ops).toEqual([
    { op: "add_index", table: "comments", indexColumns: ["post_id"] },
  ]);
  expect(find("nullable_foreign_key", "comments")).toBeDefined();
  expect(find("duplicate_index", "authors")).toBeDefined();
  expect(find("mixed_naming")).toBeDefined();
  const missing = find("missing_foreign_key", "posts");
  expect(missing?.ops).toEqual([
    {
      op: "add_foreign_key",
      table: "posts",
      fkColumns: ["author_id"],
      refTable: "authors",
      refColumns: ["id"],
    },
  ]);
  // Tables with a primary key and nothing else wrong get no findings.
  expect(
    review.suggestions
      .filter((item) => item.table === "authors")
      .map((item) => item.kind),
  ).toEqual(["duplicate_index"]);

  const proposed = await page.request.post(
    `/api/ai/chats/${chatId}/changesets`,
    {
      data: {
        database: review.database || undefined,
        schema: review.schema || undefined,
        ops: missing?.ops,
      },
    },
  );
  expect(proposed.status(), await proposed.text()).toBe(200);
  const changeset = ((await proposed.json()) as { data: Changeset }).data;
  expect((await applyChangeset(page, { chatId, changeset })).status()).toBe(
    200,
  );
  expect(await changesetStatuses(page, { chatId, changeset })).toEqual([
    "applied",
  ]);

  // A data change cannot come in through this door.
  const refused = await page.request.post(
    `/api/ai/chats/${chatId}/changesets`,
    {
      data: { ops: [{ op: "write", sql: "DELETE FROM posts WHERE id = 1" }] },
    },
  );
  expect(refused.status()).toBe(400);
}
