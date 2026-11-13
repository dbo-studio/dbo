import { expect, type APIResponse, type Page } from "@playwright/test";
import { ConnectionPage } from "../pages";

export const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
export const headers = { "X-Client-Mode": "web" };

export const redisHost = process.env.REDIS_TEST_HOST ?? "127.0.0.1";
export const redisPort = process.env.REDIS_TEST_PORT ?? "46379";
export const mongoHost = process.env.MONGO_TEST_HOST ?? "127.0.0.1";
export const mongoPort = process.env.MONGO_TEST_PORT ?? "47017";

type Kind = "redis" | "mongo";

/** Creates a connection through the real New connection form and returns its id. */
export async function createNoSqlConnection(page: Page, kind: Kind, name: string): Promise<number> {
  const cp = new ConnectionPage(page);
  await cp.goto();
  await cp.waitForReady();
  await cp.openNewConnectionModal();
  await cp.selectConnectionType(kind === "redis" ? "Redis" : "MongoDB");
  await cp.nameInput.fill(name);
  await cp.hostInput.fill(kind === "redis" ? redisHost : mongoHost);
  await page.locator('input[name="port"]').fill(kind === "redis" ? redisPort : mongoPort);
  await cp.testConnection();
  await cp.submitConnection();
  await cp.openSwitcher();
  await cp.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });

  const list = await page.request.get(`${apiUrl()}/connections`, { headers });
  const body = (await list.json()) as { data: { id: number; name: string }[] };
  return body.data.find((c) => c.name === name)!.id;
}

export async function connectionInfo(page: Page, id: number) {
  const res = await page.request.get(`${apiUrl()}/connections`, { headers });
  const body = (await res.json()) as {
    data: { id: number; type: string; info: string; options: Record<string, unknown> }[];
  };
  return body.data.find((c) => c.id === id)!;
}

export async function ping(page: Page, type: string, options: Record<string, unknown>) {
  const res = await page.request.post(`${apiUrl()}/connections/ping`, { data: { type, options }, headers });
  return { status: res.status(), body: (await res.json()) as { message?: string; data?: { category?: string; serverVersion?: string } } };
}

export const j = async (res: APIResponse): Promise<any> => (await res.json()).data;

/** API item shape for each Redis key type. */
export const KINDS = {
  string: { view: "text", value: "hello" },
  hash: { view: "fields", value: { a: "1", b: "2" } },
  list: { view: "list", value: ["x", "y", "z"] },
  set: { view: "set", value: ["p", "q"] },
  zset: { view: "set", value: [{ member: "m1", score: 1 }, { member: "m2", score: 2.5 }] },
} as const;

export const nosql = (page: Page, connectionId: number, containerId: string) => ({
  get: (itemId: string) =>
    page.request.get(`${apiUrl()}/nosql/item`, { params: { connectionId, containerId, itemId }, headers }),
  insert: (item: Record<string, unknown>, confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/item`, { data: { connectionId, containerId, item, confirmed }, headers }),
  save: (itemId: string, change: Record<string, unknown>, confirmed = true) =>
    page.request.put(`${apiUrl()}/nosql/item`, { data: { connectionId, containerId, itemId, change, confirmed }, headers }),
  remove: (itemIds: string[], confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/items/delete`, { data: { connectionId, containerId, itemIds, confirmed }, headers }),
  browse: (params: Record<string, string | number> = {}) =>
    page.request.get(`${apiUrl()}/nosql/browse`, { params: { connectionId, containerId, ...params }, headers }),
  member: (itemId: string, op: Record<string, unknown>, confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/item/member`, { data: { connectionId, containerId, itemId, op, confirmed }, headers }),
  window: (itemId: string, params: Record<string, string | number> = {}) =>
    page.request.get(`${apiUrl()}/nosql/item/window`, { params: { connectionId, containerId, itemId, ...params }, headers }),
  tree: (itemId: string, path: string[] = [], params: Record<string, number> = {}) =>
    page.request.get(`${apiUrl()}/nosql/item/tree`, { params: { connectionId, containerId, itemId, path: JSON.stringify(path), ...params }, headers }),
  setField: (itemId: string, path: string[], value: string, typeHint = "", confirmed = true) =>
    page.request.put(`${apiUrl()}/nosql/item/field`, { data: { connectionId, containerId, itemId, path, value, typeHint, confirmed }, headers }),
  unsetField: (itemId: string, path: string[], confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/item/field/unset`, { data: { connectionId, containerId, itemId, path, confirmed }, headers }),
  cli: (input: string, confirmed = false) =>
    page.request.post(`${apiUrl()}/nosql/tools/cli/run`, { data: { connectionId, input, confirmed }, headers }),
});
