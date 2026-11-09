import type { ConnectionConfig } from "../pages";

export type HostSqlEngine = "mssql" | "clickhouse";
export type DbEngine = "postgresql" | "mysql" | "sqlite" | HostSqlEngine;

export function getDbConfig(
  engine: DbEngine,
  name: string,
  sqlitePath?: string,
): ConnectionConfig {
  switch (engine) {
    case "mssql":
    case "clickhouse":
      return getHostSqlConfig(engine, name);
    case "postgresql":
      return {
        name,
        host: process.env.PGSQL_TEST_HOST ?? "127.0.0.1",
        port: process.env.PGSQL_TEST_PORT ?? "45432",
        database: "default",
        username: process.env.PGSQL_TEST_USER ?? "default",
        password: process.env.PGSQL_TEST_PASSWORD ?? "secret",
        type: "PostgreSQL",
      };
    case "mysql":
      return {
        name,
        host: process.env.MYSQL_TEST_HOST ?? "127.0.0.1",
        port: process.env.MYSQL_TEST_PORT ?? "43306",
        database: "default",
        username: process.env.MYSQL_TEST_USER ?? "root",
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

/** TLS-required Postgres (sample-pgsql-ssl). Defaults to port 45433. */
export function getSslPostgresConfig(name: string): ConnectionConfig {
  return {
    name,
    host: process.env.PGSQL_SSL_TEST_HOST ?? "127.0.0.1",
    port: process.env.PGSQL_SSL_TEST_PORT ?? "45433",
    database: "default",
    username: process.env.PGSQL_SSL_TEST_USER ?? "default",
    password: process.env.PGSQL_SSL_TEST_PASSWORD ?? "secret",
    type: "PostgreSQL",
    ssl: {
      mode: "require",
    },
  };
}

/** SSH bastion (sample-sshd) that can reach sample-pgsql / sample-mysql by service name. */
export function getSshBastionConfig(): {
  host: string;
  port: string;
  username: string;
  password: string;
} {
  return {
    host: process.env.SSH_TEST_HOST ?? "127.0.0.1",
    port: process.env.SSH_TEST_PORT ?? "42222",
    username: process.env.SSH_TEST_USER ?? "tunnel",
    password: process.env.SSH_TEST_PASSWORD ?? "secret",
  };
}

/** Postgres as seen from inside the bastion network (not reachable from the host by this name). */
export function getBastionOnlyPostgresConfig(name: string): ConnectionConfig {
  return {
    ...getDbConfig("postgresql", name),
    host: "sample-pgsql",
    port: "5432",
  };
}

/**
 * SQL Server / ClickHouse sample containers from docker-compose.dev.yml; the fallbacks are its default ports.
 */
export function getHostSqlConfig(
  engine: HostSqlEngine,
  name: string,
): ConnectionConfig {
  if (engine === "mssql") {
    return {
      name,
      host: process.env.MSSQL_TEST_HOST ?? "127.0.0.1",
      port: process.env.MSSQL_TEST_PORT ?? "41433",
      database: "shop",
      username: process.env.MSSQL_TEST_USER ?? "sa",
      password: process.env.MSSQL_TEST_PASSWORD ?? "Secret_pass1",
      type: "SQL Server",
    };
  }
  return {
    name,
    host: process.env.CLICKHOUSE_TEST_HOST ?? "127.0.0.1",
    port: process.env.CLICKHOUSE_TEST_PORT ?? "49000",
    database: "shop",
    username: process.env.CLICKHOUSE_TEST_USER ?? "default",
    password: process.env.CLICKHOUSE_TEST_PASSWORD ?? "secret",
    type: "ClickHouse",
  };
}
