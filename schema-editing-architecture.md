# Schema Editing Architecture

This document describes how the Object Form turns a saved payload into DDL
statements, and how the shared DDL planner layer keeps preview SQL and
executed SQL identical.

## Flow

```
Object Form payload (general + array tabs)
        │
        ▼
Driver repository (PreviewExecute / Execute share buildExecuteQueries)
        │  for CreateTableAction / EditTableAction:
        ▼
BuildTablePlan (per engine, implements ddl.TablePlanBuilder)
        │
        ├── ddl/quote      (dialect identifier / literal quoting)
        └── engine planner (ddl/postgres | ddl/mysql | ddl/sqlite)
        │
        ▼
ddl.Plan ([]Statement)  ──►  PreviewExecute (returns SQL list)
                        └──►  Execute (runs the same list)
```

- Payload shape (unchanged contract): `general` plus `table_columns`,
  `table_keys`, `table_foreign_keys`, `table_indexes` (SQLite uses its own
  field ids; MySQL indexes live in `table_indexes`).
- `PreviewExecute` and `Execute` both call the same `BuildTablePlan`, so the
  statement list shown in the preview modal is exactly what executes.

## Package layout

```text
backend/internal/database/ddl/
  contract.go        # Statement{SQL, Phase}, Plan, TablePlanBuilder
  quote/
    postgres.go      # double-quoted identifiers, escaped literals
    mysql.go         # backtick identifiers, escaped literals
    sqlite.go        # double-quoted identifiers (legacy stripping behavior)
  postgres/          # planner for PG table create/edit
    planner.go       # TableInput + row accessors
    table_create.go  # composed CREATE TABLE + inline PK/UNIQUE/EXCLUDE
    table_alter.go   # edit phases orchestration
    column.go        # column spec + ADD/ALTER/DROP/RENAME + comments
    key.go           # PRIMARY KEY / UNIQUE / EXCLUDE constraints
    foreign_key.go   # ADD / DROP / RENAME / recreate-on-change
  mysql/             # planner for MySQL table create/edit
    planner.go
    field_spec.go    # phpMyAdmin-style shared field spec + literal quoting
    table_create.go  # single composed CREATE TABLE
    table_alter.go   # CHANGE-based columns, keys, indexes, FKs
    index.go         # CREATE / DROP INDEX
    foreign_key.go   # ADD / DROP / rebuild-on-change
  sqlite/            # planner for SQLite table create/edit
    planner.go       # composed CREATE TABLE + recreate flow
    columns.go       # column / key / FK definitions + filters
    indexes.go       # index statements
```

## Statement phases

Plans are assembled in a fixed phase order, never in map-iteration order:

| Phase | Create table | Edit table |
|-------|--------------|------------|
| `table` | composed `CREATE TABLE` (columns + PK/UNIQUE inline), tablespace/persistence/owner | rename, tablespace/persistence/owner/comment |
| `columns` | — (inline) | ADD / CHANGE / DROP / RENAME + column comments |
| `keys` | — (inline) | ADD / DROP CONSTRAINT (PK, UNIQUE) |
| `indexes` | `CREATE INDEX` after create | CREATE / DROP INDEX (edit = drop + recreate) |
| `foreign_keys` | `ALTER TABLE ADD CONSTRAINT` after create | ADD / DROP / rename / deferrability alters; material changes drop + recreate |

Design decisions:

- **Foreign keys are always post-create `ALTER TABLE` statements** for PG and
  MySQL (avoids ordering/dependency issues inside `CREATE TABLE`); SQLite
  composes FKs inline because it recreates the table anyway.
- **MySQL column edits use `CHANGE old new <full_spec>`** — one coherent
  statement per edited row; Postgres-style `ALTER COLUMN ... SET DEFAULT`
  fragments are never emitted for MySQL.
- **PG FK material changes (columns, target, actions) drop + recreate** the
  constraint; renames and deferrability toggles alter in place.
- **SQLite edits recreate the table** (tmp table → copy → drop → rename);
  the driver owns tmp-table-name reservation because it needs DB access.
- Comments are quoted via `ddl/quote` literals; identifiers are always quoted
  (reserved words and mixed case are safe).

## Adding a new schema object tab

New object types (indexes/triggers/checks, see
`docs/prd/core-schema-completeness.md`) should extend the planner packages —
add a generator and a phase — rather than adding `fmt.Sprintf` handlers to the
driver `execute_*_command.go` files. The per-tab handlers that remain in the
drivers only cover non-planned actions (e.g. `DROP TABLE`).

## Related docs

- [`docs/prd/ddl-engine-refactor.md`](docs/prd/ddl-engine-refactor.md) — PRD,
  regression matrix, and milestones.
