import { expect, type APIResponse, type Page } from "@playwright/test";
import type { FakeLlm } from "./fakeLlm";

export type ChangesetOp = Record<string, unknown>;

export type ChangesetOpState = { position: number; status: string; error?: string; op: string } & ChangesetOp;

export type Changeset = { id: number; connectionId: number; ops: ChangesetOpState[]; undoSql: string[] };

export type ProposedChangeset = { chatId: number; changeset: Changeset };

/**
 * Makes the agent propose `ops` through the fake LLM, so the changeset is
 * persisted by the real propose_schema_change tool.
 */
export async function proposeChangeset(
  page: Page,
  llm: FakeLlm,
  connectionId: number,
  ops: ChangesetOp[],
  contextOpts?: { database?: string; schema?: string },
): Promise<ProposedChangeset> {
  const created = await page.request.post("/api/ai/chats", { data: { connectionId, title: "changeset chat" } });
  const chatId = ((await created.json()) as { data: { id: number } }).data.id;

  llm.script = { name: "propose_schema_change", args: { ops } };
  const sent = await page.request.post("/api/ai/chat/stream", {
    data: { connectionId, chatId, message: "change the schema", mode: "agent", contextOpts },
  });
  const events = (await sent.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; data?: Changeset });
  const proposal = events.find((event) => event.type === "diagram_diff");
  expect(proposal?.data, "the agent proposed a changeset").toBeDefined();

  return { chatId, changeset: proposal?.data as Changeset };
}

export function applyChangeset(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
  confirmed = false,
): Promise<APIResponse> {
  return page.request.post(`/api/ai/chats/${chatId}/changesets/${changeset.id}/apply`, { data: { confirmed } });
}

export function reviewChangeset(
  page: Page,
  { chatId, changeset }: ProposedChangeset,
  status: "accepted" | "rejected" | "pending",
  position?: number,
): Promise<APIResponse> {
  return page.request.patch(`/api/ai/chats/${chatId}/changesets/${changeset.id}`, { data: { status, position } });
}

export async function undoSql(page: Page, proposal: ProposedChangeset): Promise<string[]> {
  return (await storedChangeset(page, proposal))?.undoSql ?? [];
}

async function storedChangeset(page: Page, { chatId, changeset }: ProposedChangeset): Promise<Changeset | undefined> {
  const response = await page.request.get(`/api/ai/chats/${chatId}/changesets`);
  const body = (await response.json()) as { data: Changeset[] };

  return body.data.find((item) => item.id === changeset.id);
}

export async function changesetStatuses(page: Page, proposal: ProposedChangeset): Promise<string[]> {
  return ((await storedChangeset(page, proposal))?.ops ?? []).map((op) => op.status);
}
