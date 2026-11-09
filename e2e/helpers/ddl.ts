import type { DbEngine } from "../fixtures/dbConfigs";

/** CREATE TABLE for a plain table of `cols` ("name TYPE", ANSI types). ClickHouse needs an engine and order key. */
export function createTableSql(engine: DbEngine, table: string, cols: string[], key?: string): string {
  const defs = key && engine !== "clickhouse" ? [...cols, `PRIMARY KEY (${key})`] : cols;
  const tail = engine === "clickhouse" ? ` ENGINE = MergeTree ORDER BY ${key ?? "tuple()"}` : "";
  return `CREATE TABLE ${table} (${defs.join(", ")})${tail}`;
}
