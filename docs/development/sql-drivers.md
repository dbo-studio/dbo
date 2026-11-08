# Adding a host/port SQL driver

SQL Server and ClickHouse run on one driver, `backend/internal/database/generic/`. A **dialect** supplies what differs;
tree, data browser, query running, edit-by-primary-key, autocomplete, diagram, AI metadata and table structure are shared.
Use it for any server that has catalog views and a Go `database/sql` driver with a gorm dialector.

## Pieces

| Piece | Where |
| --- | --- |
| Dialect interface (`Quote`, `Paginate`, catalog queries, `Editable`, ...) | `generic/dialect.go` |
| Dialects | `mssql/`, `clickhouse/` (own packages; register in `init`, blank-imported by `database/repository.go`) |
| Connection type constants, `IsHostSQL` | `contract/database_enum.go` |
| DSN builders | `connection/host_sql_connection.go` |
| Connection form | `frontend/src/components/common/AddConnection/HostSql/` |
| Picker entries, driver id | `frontend/src/core/db/connectionAliases.ts` |
| E2E | `e2e/helpers/hostSqlSuite.ts`, `e2e/tests/<engine>/` |

## Steps

1. Add the type constant, add it to `ValidConnectionTypes` and `IsHostSQL`.
2. Add `Open<Engine>Connection` in `connection/host_sql_connection.go` and a case in `ConnectionManager.GetConnection`.
   Create/update/ping reuse the MySQL option shape (`host`, `port`, `username`, `password`, `database`, `ssl`, `ssh`).
3. Write the dialect and `RegisterDialect(<type>, ...)`. A **namespace** is the level above tables: a schema (SQL Server) or a database (ClickHouse).
   Node ids are `<namespace>.<table>`. `Editable()` false makes grids read-only and rejects writes.
4. Frontend: alias in `connectionAliases.ts`, icon in `public/icons/` and `CustomIcon/types.ts`, engine entry in `engineCapabilities.ts`.
5. Add the engine to `HOST_SQL` in `e2e/helpers/hostSql.ts`, a seed in `docs/sample_db/`, a compose service, and a `tests/<engine>/` spec that calls `defineHostSqlTests`.

## Limits (v0)

- No object forms: creating/editing/dropping tables, views, indexes is not implemented (`GetFormTabs` is empty; only `executeSql` runs).
- No schema dump, so no SQL backup/export of structure for these engines.
- SQL Server has no `LIMIT`: raw queries are cut at the page size and have no later pages; the editor has no schema picker, statements use the login's default schema.
- ClickHouse is read-only in the grid (no transactions, no row-level keys); native protocol only (port 9000 / 9440 with TLS; `prefer` means plain).
- SQL Server: one database per connection (the `database` field); the tree shows its schemas.
- ClickHouse `Array(UInt8)` values reach the browser as a string (the driver returns `[]uint8`, which is read as bytes).

## E2E

Like the other engines, `npm run test:mssql` / `test:clickhouse` use the sample containers from `docker-compose.dev.yml`
(`docker compose -f docker-compose.dev.yml up -d sample-mssql sample-clickhouse`; ports `41433` / `49000`, override with
`MSSQL_TEST_PORT` / `CLICKHOUSE_TEST_PORT`). The harness starts no database. The first `sample-mssql` start pulls a
linux/amd64 image (emulated on Apple silicon, ~1 min to boot); wait for it to be healthy before running the tests.
