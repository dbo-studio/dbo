import { expect, type Page } from "@playwright/test";
import { getHostSqlConfig, type HostSqlEngine } from "../fixtures/dbConfigs";
import { ConnectionPage } from "../pages";

const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const headers = { "X-Client-Mode": "web" };

/** What differs per engine in the shared suite. Row counts come from docs/sample_db/shop_*.sql. */
export const HOST_SQL: Record<
  HostSqlEngine,
  {
    label: string;
    /** Tree namespace holding the sample tables: a schema (SQL Server) or database (ClickHouse). */
    namespace: string;
    pageViews: number;
    editable: boolean;
    /** Rows change through ALTER TABLE ... UPDATE/DELETE (no transactions, no row identity). */
    mutations: boolean;
    foreignKeys: boolean;
  }
> = {
  mssql: { label: "SQL Server", namespace: "dbo", pageViews: 5000, editable: true, mutations: false, foreignKeys: true },
  clickhouse: { label: "ClickHouse", namespace: "shop", pageViews: 40000, editable: true, mutations: true, foreignKeys: false },
};

/** Row counts both seeds produce. */
export const SEED = { categories: 10, customers: 2000, products: 500, orders: 8000, orderItems: 16001 };

export async function createHostSqlConnection(
  page: Page,
  engine: HostSqlEngine,
  name: string,
): Promise<number> {
  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.createConnection(getHostSqlConfig(engine, name));

  const res = await page.request.get(`${apiUrl()}/connections`, { headers });
  const body = (await res.json()) as { data: { id: number; name: string }[] };
  return body.data.find((c) => c.name === name)!.id;
}

async function call<T>(page: Page, method: "get" | "post", path: string, data?: unknown): Promise<{ status: number; body: T }> {
  const res = await page.request[method](`${apiUrl()}${path}`, { headers, ...(data ? { data } : {}) });
  return { status: res.status(), body: (await res.json()) as T };
}

type Rows = Record<string, unknown>[];
type Column = { name: string; mappedType: string; editable: boolean; isPrimaryKey: boolean; isForeignKey: boolean; type: string };

export async function raw(page: Page, connectionId: number, query: string, extra: Record<string, unknown> = {}) {
  const { status, body } = await call<{ data: { data: Rows; columns: Column[]; editable?: boolean } }>(page, "post", "/query/raw", {
    connectionId,
    query,
    ...extra,
  });
  expect(status, JSON.stringify(body)).toBe(200);
  return body.data;
}

export async function scalar(page: Page, connectionId: number, query: string): Promise<unknown> {
  const { data } = await raw(page, connectionId, query);
  // Raw rows also carry the grid's dbo_index / editable bookkeeping keys.
  const key = Object.keys(data[0]).find((k) => k !== "dbo_index" && k !== "editable")!;
  return data[0][key];
}

export async function run(page: Page, connectionId: number, nodeId: string, extra: Record<string, unknown> = {}) {
  const { status, body } = await call<{ data: { query: string; data: Rows; columns: Column[] }; message: string }>(
    page,
    "post",
    "/query/run",
    { connectionId, nodeId, limit: 100, page: 1, ...extra },
  );
  return { status, ...body };
}

export async function update(page: Page, connectionId: number, nodeId: string, change: Record<string, unknown>) {
  return call<{ data: { query: string[]; rowAffected: number } | null; message: string }>(page, "post", "/query/update", {
    connectionId,
    nodeId,
    ...change,
  });
}

export async function tree(page: Page, connectionId: number, parentId = "") {
  const { body } = await call<{ data: { children: { id: string; name: string; type: string }[] } }>(
    page,
    "get",
    `/tree?connectionId=${connectionId}${parentId ? `&parentId=${encodeURIComponent(parentId)}` : ""}`,
  );
  return body.data.children;
}

export async function diagram(page: Page, connectionId: number, schema: string) {
  const { body } = await call<{ data: { nodes: { id: string; columns: { name: string }[] }[]; edges: { source: string; target: string }[] } }>(
    page,
    "get",
    `/schema/diagram?connectionId=${connectionId}&schema=${schema}&database=${schema}`,
  );
  return body.data;
}

export async function autocomplete(page: Page, connectionId: number, scope: { database?: string; schema?: string } = {}) {
  const qs = new URLSearchParams({ connectionId: String(connectionId), ...scope });
  const { body } = await call<{
    data: { databases: string[]; schemas: string[]; tables: string[]; views: string[]; columns: Record<string, string[]> };
  }>(page, "get", `/query/autocomplete?${qs.toString()}`);
  return body.data;
}

export async function ping(page: Page, type: string, options: Record<string, unknown>) {
  return call<{ data: { serverVersion?: string; latencyMs?: number } | { category?: string } | null; message: string }>(
    page,
    "post",
    "/connections/ping",
    { type, options },
  );
}

type ExecResult = { status: number; body: { data?: { nodeId?: string; queries?: string[] } | null; message?: string } };

/** Object Form calls: nodeId is `<ns>.tableContainer` to create, `<ns>.<name>` to edit. */
export async function objectExecute(page: Page, connectionId: number, nodeId: string, action: string, params: unknown, preview = false): Promise<ExecResult> {
  const suffix = preview ? "/preview" : "";
  const res = await page.request.post(
    `${apiUrl()}/tree/${encodeURIComponent(nodeId)}/tabs/${action}/fields/object${suffix}?connectionId=${connectionId}`,
    { headers, data: params },
  );
  return { status: res.status(), body: (await res.json()) as ExecResult["body"] };
}

export async function objectDetail(page: Page, connectionId: number, nodeId: string, action: string, tab: string) {
  const { body } = await call<{
    data: { general: { id: string; value: unknown }[]; schema: { id: string }[]; data: Record<string, unknown>[] };
  }>(page, "get", `/tree/${encodeURIComponent(nodeId)}/tabs/${action}/fields/${tab}/object?connectionId=${connectionId}`);
  return body.data;
}

export async function treeNodes(page: Page, connectionId: number, parentId: string) {
  const { body } = await call<{
    data: { children: { id: string; name: string; type: string; contextMenu: { title: string; name: string }[] }[]; contextMenu: { title: string }[] };
  }>(page, "get", `/tree?connectionId=${connectionId}&parentId=${encodeURIComponent(parentId)}`);
  return body.data;
}

export async function objectTabs(page: Page, connectionId: number, nodeId: string, action: string): Promise<string[]> {
  const { body } = await call<{ data: { id: string }[] }>(page, "get", `/tree/${encodeURIComponent(nodeId)}/tabs/${action}?connectionId=${connectionId}`);
  return body.data.map((t) => t.id);
}

/** Runs a statement that should fail; returns the server's message, or null when it succeeded. */
export async function rawError(page: Page, connectionId: number, query: string): Promise<string | null> {
  const { data, columns } = await raw(page, connectionId, query);
  const isCommand = columns.map((c) => c.name).join() === "Query,Message,Duration";
  return isCommand && data[0]?.Message !== "OK" ? String(data[0].Message) : null;
}

/** A refused request: 4xx (not a crash) with a human-readable message, optionally matching `pattern`. */
export function expectClientError(res: { status: number; body?: unknown; message?: string }, pattern?: RegExp): void {
  const body = (res.body ?? res) as { message?: string };
  const message = String(body.message ?? res.message ?? "");
  expect(res.status, message).toBeGreaterThanOrEqual(400);
  expect(res.status, message).toBeLessThan(500);
  expect(message.trim().length, "error needs a message").toBeGreaterThan(0);
  if (pattern) expect(message).toMatch(pattern);
}
