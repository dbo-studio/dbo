import { expect, type APIResponse, type Page } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";

export interface Job {
  id: number;
  type: string;
  status: string;
  error: string;
  message: string;
}

export interface Artifact {
  id: number;
  jobId: number;
  method: string;
  tool: string;
  status: string;
  size: number;
  checksum: string;
  fileName: string;
  error: string;
}

interface Envelope<T> {
  data: T;
  message?: string;
}

export async function connectionIdByName(
  page: Page,
  name: string,
): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as Envelope<
    Array<{ id: number; name: string }>
  >;
  const found = body.data.find((item) => item.name === name);
  expect(found, `connection ${name}`).toBeDefined();
  return found!.id;
}

export async function waitForJob(
  page: Page,
  jobId: number,
  timeoutMs = 90_000,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  let last: Job | undefined;
  while (Date.now() < deadline) {
    const response = await page.request.get(`/api/jobs/${jobId}`);
    expect(response.ok()).toBeTruthy();
    last = ((await response.json()) as Envelope<Job>).data;
    if (["completed", "failed", "canceled"].includes(last.status)) {
      return last;
    }
    // Poll interval; the job worker ticks every few seconds.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`job ${jobId} still ${last?.status ?? "unknown"}`);
}

/** Where the engine keeps the objects a whole-database job targets. */
export function scopeFor(engine: DbEngine): {
  database?: string;
  schema?: string;
} {
  if (engine === "postgresql") {
    return { database: "default", schema: "public" };
  }
  if (engine === "mysql") {
    return { database: "default" };
  }
  return {};
}

export async function startJob(
  page: Page,
  path: string,
  data: Record<string, unknown>,
): Promise<number> {
  const response = await page.request.post(path, { data });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as Envelope<{ jobId: number }>;
  return body.data.jobId;
}

export async function runBackup(
  page: Page,
  connectionId: number,
  engine: DbEngine,
  note = "",
): Promise<Artifact> {
  const jobId = await startJob(page, "/api/backups", {
    connectionId,
    note,
    ...scopeFor(engine),
  });
  const job = await waitForJob(page, jobId);
  expect(job.status, job.error).toBe("completed");
  const history = await listHistory(page, connectionId);
  const artifact = history.find((item) => item.jobId === jobId);
  expect(artifact?.status).toBe("completed");
  return artifact!;
}

export async function listHistory(
  page: Page,
  connectionId: number,
): Promise<Artifact[]> {
  const response = await page.request.get(
    `/api/backups/history?connectionId=${connectionId}`,
  );
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as Envelope<Artifact[]>).data;
}

export async function rawQuery(
  page: Page,
  connectionId: number,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await page.request.post("/api/query/raw", {
    data: { connectionId, query },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as Envelope<{
    data: Array<Record<string, unknown>>;
  }>;
  return body.data.data;
}

export async function expectError(
  response: APIResponse,
  status: number,
  messagePart: string,
): Promise<void> {
  expect(response.status()).toBe(status);
  const body = (await response.json()) as { message?: string };
  expect(body.message ?? "").toContain(messagePart);
}
