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
        ├── ddl helpers    (allowlists, JoinQuoted, expression guard)
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
  helpers.go         # JoinQuoted, allowlists, expression guard
  quote/
    postgres.go      # double-quoted identifiers, escaped literals
    mysql.go         # backtick identifiers, backslash + quote literals
    sqlite.go        # double-quoted identifiers (embedded quotes doubled)
  postgres/
    planner.go
    table_create.go  # composed CREATE TABLE (TEMPORARY / UNLOGGED prefix)
    table_alter.go
    column_spec.go   # inline definition + comments
    column_alter.go  # ADD / ALTER / DROP / RENAME
    key.go
    foreign_key.go
  mysql/
    planner.go
    field_spec.go    # field spec, AUTO_INCREMENT, ENGINE/ROW_FORMAT
    field_alter.go   # CHANGE-based column edits
    table_create.go
    table_alter.go
    key.go
    index.go         # CREATE / DROP INDEX (edit = drop + recreate)
    foreign_key.go
  sqlite/
    planner.go       # composed CREATE TABLE + recreate flow
    columns.go
    key.go
    foreign_key.go
    indexes.go
```

## Statement phases

Plans are assembled in a fixed phase order, never in map-iteration order:

| Phase | Create table | Edit table |
|-------|--------------|------------|
| `table` | composed `CREATE TABLE` (columns + PK/UNIQUE inline), tablespace/persistence/owner, MySQL ENGINE/ROW_FORMAT | rename, tablespace/persistence/owner/comment, ENGINE/ROW_FORMAT |
| `columns` | — (inline) | ADD / CHANGE / DROP / RENAME + column comments |
| `keys` | — (inline) | ADD / DROP; definition edits drop + recreate |
| `indexes` | `CREATE INDEX` after create | CREATE / DROP INDEX (edit = drop + recreate) |
| `foreign_keys` | `ALTER TABLE ADD CONSTRAINT` after create | ADD / DROP / rename / deferrability alters; material changes drop + recreate |

Design decisions:

- **Foreign keys are always post-create `ALTER TABLE` statements** for PG and
  MySQL (avoids ordering/dependency issues inside `CREATE TABLE`); SQLite
  composes FKs inline because it recreates the table anyway.
- **MySQL column edits use `CHANGE old new <full_spec>`** — one coherent
  statement per edited row; length/scale/identity are part of the diff.
- **PG FK material changes (columns, target, actions) drop + recreate** the
  constraint; renames and deferrability toggles alter in place (using the
  new name after a rename).
- **SQLite edits recreate the table** (tmp table → copy old names to new
  names → drop → rename).
- Comments are quoted via `ddl/quote` literals; identifiers are always quoted.
  Keyword slots (ON UPDATE/ON DELETE, persistence, index ORDER) are allowlisted.

## Adding a new schema object tab

New object types (indexes/triggers/checks, see
`docs/prd/core-schema-completeness.md`) should extend the planner packages —
add a generator and a phase — rather than adding `fmt.Sprintf` handlers to the
driver `execute_*_command.go` files. The per-tab handlers that remain in the
drivers only cover non-planned actions (e.g. `DROP TABLE`).

## Related docs

- [`docs/prd/ddl-engine-refactor.md`](docs/prd/ddl-engine-refactor.md) — PRD,
  regression matrix, and milestones.
