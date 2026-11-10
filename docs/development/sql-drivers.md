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
5. Add the engine to `HOST_SQL` in `e2e/helpers/hostSql.ts`, a seed in `docs/sample_db/`, a compose service, and the `tests/<engine>/` specs the coverage guard lists (`npm run check:coverage` in `e2e/`).

## What is supported

| Area | SQL Server | ClickHouse |
| --- | --- | --- |
| Tree: tables, views | yes | yes |
| Create/drop schema (SQL Server) or database (ClickHouse) from the tree | yes | yes |
| Stored procedures and functions (tree, create/edit/drop) | yes | no (ClickHouse has none) |
| Data browser, raw queries, autocomplete, diagram | yes | yes |
| Grid edits (by primary key) | yes | no, read-only (`Editable()` is false) |
| Object Form: create/edit/drop table and view | yes | yes |
| Keys, indexes, checks | yes | indexes and checks; no unique keys |
| Foreign keys, triggers | yes | refused with a reason |
| Schema dump, export (CSV/JSON/SQL), import | yes | yes |
| Backup (built-in SQL dump) and restore (statement replay) | yes | yes |
| Transactions (failed save rolls back) | yes | no |
| AI chat/agent, `table_stats` | yes | yes |
| `explain_query` | no (needs a session-level `SET SHOWPLAN`) | yes |
| SSH tunnel, TLS | yes | yes; native protocol only (9000, 9440 with TLS) |

## Limits

- Backup is DBO's built-in SQL dump (no `pg_dump`/`mysqldump`). Restore replays it statement by statement into the connection's own database, stops at the first failing statement (not atomic) and needs the objects not to exist yet; restoring into a new database and the restore test (drill) are not available. SQL Server dumps do not carry IDENTITY.
- Schema/database drop never cascades on SQL Server (a schema with objects is refused); `default`, `system`, `dbo` and `db_*` can never be dropped. ClickHouse drops a database with its tables.
- Routines are edited as their whole `CREATE` statement (one statement, no `GO`); the form turns it into `CREATE OR ALTER`. Sequences, events, user types and materialized views are not in the tree.
- Generated columns are not in the Object Form (only PostgreSQL and SQLite). Ones made in the editor work and are computed by the server.
- SQL Server has no `LIMIT`: raw queries are cut at the page size and have no later pages; the editor has no schema picker, statements use the login's default schema.
- SQL Server: one database per connection (the `database` field); the tree shows its schemas.
- ClickHouse: `Array(UInt8)` values reach the browser as a string (the driver returns `[]uint8`, which is read as bytes).

Every item above has a test that asserts the refusal or the behavior: `e2e/helpers/hostSqlSuite.ts`, `hostSqlExtraSuite.ts`, `hostSqlTunnelSuite.ts`, and the matrix in `e2e/coverage/capabilities.mjs`.

## E2E

Like the other engines, `npm run test:mssql` / `test:clickhouse` use the sample containers from `docker-compose.dev.yml`
(`docker compose -f docker-compose.dev.yml up -d sample-mssql sample-clickhouse`; ports `41433` / `49000`, override with
`MSSQL_TEST_PORT` / `CLICKHOUSE_TEST_PORT`). The harness starts no database. The first `sample-mssql` start pulls a
linux/amd64 image (emulated on Apple silicon, ~1 min to boot); wait for it to be healthy before running the tests.
