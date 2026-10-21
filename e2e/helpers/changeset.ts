import { expect, type APIResponse, type Page } from "@playwright/test";
import type { FakeLlm } from "./fakeLlm";

export type ChangesetOp = Record<string, unknown>;

export type ChangesetOpState = {
  position: number;
  status: string;
  error?: string;
  op: string;
} & ChangesetOp;

export type Changeset = {
  id: number;
  connectionId: number;
  ops: ChangesetOpState[];
  undoSql: string[];
};

export type ProposedChangeset = { chatId: number; changeset: Changeset };

async function runAgentTool(
  page: Page,
  llm: FakeLlm,
  connectionId: number,
  script: { name: string; args: Record<string, unknown> },
  contextOpts?: { database?: string; schema?: string },
  chatId?: number,
): Promise<ProposedChangeset> {
  let id = chatId;
  if (id === undefined) {
    const created = await page.request.post("/api/ai/chats", {
      data: { connectionId, title: "changeset chat" },
    });
    id = ((await created.json()) as { data: { id: number } }).data.id;
  }

  llm.script = script;
  const sent = await page.request.post("/api/ai/chat/stream", {
    data: {
      connectionId,
      chatId: id,
      message: "change the schema",
      mode: "agent",
      contextOpts,
    },
  });
  const events = (await sent.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; data?: Changeset });
  const proposal = events.find((event) => event.type === "diagram_diff");
  const refused = events.find((event) => event.type === "tool_error") as
    { content?: string } | undefined;
  expect(
    proposal?.data,
    `the agent proposed a changeset${refused ? `: ${refused.content}` : ""}`,
  ).toBeDefined();

  return { chatId: id, changeset: proposal?.data as Changeset };
}

/**
 * Makes the agent propose `ops` through the fake LLM, so the changeset is
 * persisted by the real propose_schema_change tool. Pass `chatId` to propose
 * into an existing chat.
 */
export function proposeChangeset(
  page: Page,
  llm: FakeLlm,
  connectionId: number,
  ops: ChangesetOp[],
  contextOpts?: { database?: string; schema?: string },
  chatId?: number,
): Promise<ProposedChangeset> {
  return runAgentTool(
    page,
    llm,
    connectionId,
    { name: "propose_schema_change", args: { ops } },
    contextOpts,
    chatId,
  );
}

/** Makes the agent preview a data change, which joins the chat's changeset. */
export function previewWrite(
  page: Page,
  llm: FakeLlm,
  connectionId: number,
  sql: string,
  contextOpts?: { database?: string; schema?: string },
  chatId?: number,
): Promise<ProposedChangeset> {
  return runAgentTool(
    page,
    llm,
    connectionId,
    { name: "preview_write", args: { sql } },
    contextOpts,
    chatId,
  );
}

export function applyChangeset(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
  confirmed = false,
): Promise<APIResponse> {
  return page.request.post(
    `/api/ai/chats/${chatId}/changesets/${changeset.id}/apply`,
    { data: { confirmed } },
  );
}

export function reviewChangeset(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
  status: "accepted" | "rejected" | "pending",
  position?: number,
): Promise<APIResponse> {
  return page.request.patch(
    `/api/ai/chats/${chatId}/changesets/${changeset.id}`,
    { data: { status, position } },
  );
}

export type TableStructure = {
  columns: Array<{
    name: string;
    dataType: string;
    notNull: boolean;
    default?: string;
    isPrimaryKey: boolean;
  }>;
  indexes: Array<{ name: string; columns: string[]; unique: boolean }>;
  foreignKeys: unknown[];
};

/** The live definition of the tables the changeset changes, by table name. */
export async function changesetBefore(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
): Promise<Record<string, TableStructure>> {
  const response = await page.request.get(
    `/api/ai/chats/${chatId}/changesets/${changeset.id}/before`,
  );
  expect(response.status()).toBe(200);

  return ((await response.json()) as { data: Record<string, TableStructure> })
    .data;
}

export async function undoSql(
  page: Page,
  proposal: ProposedChangeset,
): Promise<string[]> {
  return (await storedChangeset(page, proposal))?.undoSql ?? [];
}

async function storedChangeset(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
): Promise<Changeset | undefined> {
  const response = await page.request.get(`/api/ai/chats/${chatId}/changesets`);
  const body = (await response.json()) as { data: Changeset[] };

  return body.data.find((item) => item.id === changeset.id);
}

export async function changesetStatuses(
  page: Page,
  proposal: ProposedChangeset,
): Promise<string[]> {
  return ((await storedChangeset(page, proposal))?.ops ?? []).map(
    (op) => op.status,
  );
}

/** Turns an applied changeset's undo into a new changeset and applies it. */
export async function applyUndo(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
): Promise<void> {
  const undo = await page.request.post(
    `/api/ai/chats/${chatId}/changesets/${changeset.id}/undo`,
  );
  expect(undo.status()).toBe(200);
  const undoChangeset = ((await undo.json()) as { data: Changeset }).data;
  expect(
    (await applyChangeset(page, { chatId, changeset: undoChangeset })).status(),
  ).toBe(200);
}
