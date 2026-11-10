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
    index.go         # CREATE / DROP INDEX (edit = drop + recreate)
    check.go         # ADD / DROP CONSTRAINT ... CHECK
    trigger.go       # CREATE / DROP / RENAME TRIGGER
    sequence.go      # standalone form + table tab share one builder
    routine.go       # functions / procedures
  mysql/
    planner.go
    field_spec.go    # field spec, AUTO_INCREMENT, ENGINE/ROW_FORMAT
    field_alter.go   # CHANGE-based column edits
    table_create.go
    table_alter.go
    key.go
    index.go         # CREATE / DROP INDEX (edit = drop + recreate)
    foreign_key.go
    trigger.go       # CREATE / DROP TRIGGER (edit = drop + recreate)
    routine.go       # functions / procedures (edit = drop + recreate)
    check.go         # ADD / DROP CHECK (edit = validate under a temp name, drop, add)
    event.go         # scheduled events (edit = one ALTER EVENT with changed clauses)
  sqlite/
    planner.go       # composed CREATE TABLE + recreate flow
    columns.go
    key.go
    foreign_key.go
    indexes.go       # in place, or all re-created after a table recreate
    triggers.go      # same
    checks.go        # inline table-level CHECK constraints
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
| `checks` | PG / MySQL: `ADD CONSTRAINT ... CHECK` after create; SQLite: inline in `CREATE TABLE` | PG / MySQL: ADD / DROP; expression or name change drops + recreates (MySQL validates the new check under a temp name first); SQLite: recreates the table |
| `triggers` | PG / MySQL / SQLite: `CREATE TRIGGER` after create | PG: rename / comment in place, other changes drop + recreate; MySQL / SQLite: drop + recreate |
| `sequences` | PG: `CREATE SEQUENCE` + `OWNED BY` | `ALTER SEQUENCE` in place; DROP for deleted rows |

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
  names → drop → rename). The exception is an edit that only touches the
  Indexes or Triggers tab, which runs in place. A recreate loses the table's
  indexes, triggers and checks, so the driver reads the unchanged ones back
  from the database (the form submits changed rows only), follows column
  renames/drops, and the planner creates them again. Partial and expression
  indexes, and triggers with an `UPDATE OF` column list, are not editable and
  are not preserved by a recreate.
- **MySQL UNIQUE constraints are unique indexes**: the Keys tab lists them and
  the Indexes tab leaves them out. The Checks tab only exists on servers that
  enforce checks (MySQL 8.0.16+, MariaDB 10.2.1+); MariaDB drops with
  `DROP CONSTRAINT`, MySQL with `DROP CHECK`.
- Comments are quoted via `ddl/quote` literals; identifiers are always quoted.
  Keyword slots (ON UPDATE/ON DELETE, persistence, index ORDER) are allowlisted.

## Object families outside the table form

These objects have their own tree container and a single-object Object Form
(general tab, `{new, old}` payload), handled by a `handle*Commands` function in
the driver that delegates SQL building to the `ddl` packages where one exists:

| Object | Engines | Tree container | Edit strategy |
|--------|---------|----------------|---------------|
| Enum type | PG | Types | rename + `ADD VALUE`; removing or reordering labels is rejected |
| Sequence | PG | Sequences (plus table `Sequences` tab) | `ALTER SEQUENCE` in place |
| Function / procedure | PG, MySQL | Functions, Procedures | PG: `CREATE OR REPLACE` when the signature is unchanged, else drop + create; MySQL: drop + create |
| Scheduled event | MySQL | Events | one `ALTER EVENT` with only the changed clauses (schedule, rename, status, completion, comment, body) |
| Materialized view | PG | Materialized Views | in-place `ALTER`; a changed query drops + recreates; `Refresh` actions (with / without data) |

Drops are always `RESTRICT`. PG routines are addressed by name in the tree, so
overloaded routines are not distinguishable yet.

New action names must also be added to `sqlguard.ClassifyAction`, otherwise
safe mode treats them as unknown.

## Adding a new schema object tab

New object types (indexes/triggers/checks, see
`docs/prd/core-schema-completeness.md`) should extend the planner packages —
add a generator and a phase — rather than adding `fmt.Sprintf` handlers to the
driver `execute_*_command.go` files. The per-tab handlers that remain in the
drivers only cover non-planned actions (e.g. `DROP TABLE`).

## Related docs

- [`docs/prd/ddl-engine-refactor.md`](docs/prd/ddl-engine-refactor.md) — PRD,
  regression matrix, and milestones.
