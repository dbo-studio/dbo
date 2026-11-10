import { expect, type Page } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { ConnectionPage } from "../pages";
import { createTableSql } from "./ddl";

type Question = { id: number; name: string; chart: { type: string } };

/**
 * Saved reports through the API on a server engine: create, list, run with fresh
 * data, rename, refuse writes, delete. The table lives in the connection's own database.
 */
export async function checkQuestionsApi(page: Page, engine: DbEngine, connectionName: string, table: string): Promise<void> {
  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig(engine, connectionName));

  const connections = (await (await page.request.get("/api/connections")).json()) as {
    data: Array<{ id: number; name: string }>;
  };
  const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
  const raw = async (query: string): Promise<void> => {
    const response = await page.request.post("/api/query/raw", { data: { connectionId, query } });
    expect(response.status(), query).toBe(200);
  };

  await raw(createTableSql(engine, table, ["id INTEGER NOT NULL", "region VARCHAR(20)", "amount INTEGER"], "id"));
  try {
    await raw(`INSERT INTO ${table} VALUES (1, 'north', 10), (2, 'south', 20)`);

    const created = await page.request.post("/api/questions", {
      data: {
        connectionId,
        name: "Sales by region",
        sql: `SELECT region, SUM(amount) AS total FROM ${table} GROUP BY region ORDER BY region`,
        chart: { type: "bar", x: "region", y: ["total"] },
      },
    });
    expect(created.status()).toBe(200);
    const question = ((await created.json()) as { data: Question }).data;

    const listed = (await (await page.request.get(`/api/questions?connectionId=${connectionId}`)).json()) as { data: Question[] };
    expect(listed.data.map((item) => item.name)).toContain("Sales by region");

    await raw(`INSERT INTO ${table} VALUES (3, 'east', 5)`);
    const run = (await (await page.request.post(`/api/questions/${question.id}/run`)).json()) as {
      data: { rows: Array<Record<string, unknown>> };
    };
    expect(run.data.rows.map((row) => row.region)).toEqual(["east", "north", "south"]);

    const renamed = await page.request.patch(`/api/questions/${question.id}`, { data: { name: "Regional sales", chart: { type: "pie", x: "region", y: ["total"] } } });
    expect(((await renamed.json()) as { data: Question }).data).toMatchObject({ name: "Regional sales", chart: { type: "pie" } });

    const write = await page.request.patch(`/api/questions/${question.id}`, { data: { sql: `DELETE FROM ${table}` } });
    expect(write.status()).toBe(400);

    expect((await page.request.delete(`/api/questions/${question.id}`)).status()).toBe(200);
    const after = (await (await page.request.get(`/api/questions?connectionId=${connectionId}`)).json()) as { data: Question[] };
    expect(after.data.map((item) => item.id)).not.toContain(question.id);
  } finally {
    await raw(`DROP TABLE ${table}`);
  }
}
