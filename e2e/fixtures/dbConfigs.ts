import type { ConnectionConfig } from "../pages";

export type DbEngine = "postgresql" | "mysql" | "sqlite";

export function getDbConfig(
  engine: DbEngine,
  name: string,
  sqlitePath?: string,
): ConnectionConfig {
  switch (engine) {
    case "postgresql":
      return {
        name,
        host: process.env.PGSQL_TEST_HOST ?? "127.0.0.1",
        port: process.env.PGSQL_TEST_PORT ?? "5432",
        username: process.env.PGSQL_TEST_USER ?? "default",
        password: process.env.PGSQL_TEST_PASSWORD ?? "secret",
        type: "PostgreSQL",
      };
    case "mysql":
      return {
        name,
        host: process.env.MYSQL_TEST_HOST ?? "127.0.0.1",
        port: process.env.MYSQL_TEST_PORT ?? "3307",
        database: "default",
        username: process.env.MYSQL_TEST_USER ?? "default",
        password: process.env.MYSQL_TEST_PASSWORD ?? "secret",
        type: "MySQL",
      };
    case "sqlite":
      return {
        name,
        host: sqlitePath ?? `/tmp/dbo-e2e-${Date.now()}.db`,
        port: "",
        username: "",
        password: "",
        type: "SQLite",
      };
  }
}
