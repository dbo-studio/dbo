# E2E Tests (Playwright)

End-to-end tests for the DBO app using Playwright. The main focus is **Object Form** (creating and editing database objects from the UI), plus complementary scenarios (connections, queries, settings).

## Prerequisites

| Service | Default URL |
|---------|-------------|
| Frontend (Vite) | `http://localhost:3000` |
| Backend API | `http://localhost:8080/api` |
| PostgreSQL | `localhost:5432` (PG scenarios) |
| MySQL | per `e2e/.env` (MySQL scenarios) |

```bash
cp frontend/e2e/.env.example frontend/e2e/.env
# edit as needed
```

**Restart the backend** after Go changes.

## Running tests

```bash
cd frontend

# all tests
npm run test:e2e

# Full Object Form suite — parallel across files (recommended)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:object-form:parallel

# Object Form suite with default workers
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:object-form

# Debug one failing lifecycle file only
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test --config e2e/playwright.config.ts \
  e2e/tests/object-form-postgres-lifecycle.spec.ts --workers=1
```

Use `--workers=1` only when debugging a single flaky lifecycle file, not for normal runs. Lifecycle specs use `describe.configure({ mode: 'serial' })` **inside** each file (steps share state). Different spec files run safely in parallel because each uses unique connection/database names (`Date.now()` suffix).

Worker count: set `PLAYWRIGHT_WORKERS` or use the npm scripts above. Default is 4 locally, 2 on CI.

UI mode:

```bash
npx playwright test --ui --config e2e/playwright.config.ts e2e/tests/object-form-postgres-lifecycle.spec.ts
```

## Directory layout

```
e2e/
├── fixtures/          # constants, unique names, field/tab IDs
├── helpers/           # reusable lifecycle flows
├── pages/             # Page Object Model
├── tests/             # *.spec.ts files
├── utils/             # global setup
└── playwright.config.ts
```

---

## Object Form — overview

| Layer | Role |
|-------|------|
| **Spec** | Serial scenario; each `test.step` shows up in the report |
| **Helper** | Connect, fill form, save → preview → execute, assert tree |
| **Fixture** | `POSTGRES_LIFECYCLE_FIELDS`, `POSTGRES_LIFECYCLE_PREVIEW`, `e2e_*` names with time suffix |
| **POM** | `ConnectionPage`, `ObjectTreePage`, `ObjectFormPage` |

### Key test IDs (UI)

| Element | test ID |
|---------|---------|
| Object form root | `object-form` |
| Inner form tab | `object-form-tab-{tabId}` |
| Array cell | `object-form-cell-{row}-{fieldId}` |
| General field | `object-form-field-{fieldId}` |
| Delete row | `object-form-delete-row-{rowIndex}` |
| Save / execute | `object-form-save`, `object-form-execute` |
| SQL preview modal | `object-form-preview-modal` |
| Workspace tab | `workspace-tab-{slug}` |
| Tree node | `tree-node-{slug}` |
| Context menu item | `context-menu-item-{slug}` |

### Stabilization notes

- After **Create database**, the workspace tab is **renamed to the database name**. Close that tab before **Create schema** so a fresh tab opens.
- FK column multiselect on create table: when options are empty, use the creatable path (`Create "user_id"`).
- Query cells (Monaco): type via keyboard on `.monaco-editor`, not the hidden textarea. Use `fillGeneralQueryField` for view/matview query fields on the **general** tab.
- MUI tabs can be blocked by tooltips; `selectTab` uses `force: true` and `Escape`.
- Table save payload uses the **`general`** key for table metadata (`relname`, `description`, …), not a separate `table` tab.

---

## PostgreSQL Object Form — scenarios

### 1. Smoke lifecycle — `object-form-postgres-lifecycle.spec.ts`

Flow: connect → new database → `public` → full cleanup.

| Step | Menu action | Preview assert |
|------|-------------|----------------|
| Connect | — | — |
| Create database | Create database | `CREATE DATABASE` |
| Create users table | Create table | `CREATE TABLE`, `PRIMARY KEY` |
| Create posts table | Create table + FK | `CREATE TABLE`, `FOREIGN KEY` / `REFERENCES` |
| Create view | Create view | `CREATE VIEW` |
| Edit users table | Edit table → new column | `ADD COLUMN` |
| Cleanup | Drop view / tables / database | — |

**Helper:** `helpers/objectFormPostgresLifecycle.ts`  
**Fixture:** `fixtures/postgresObjectFormLifecycle.ts` → `postgresLifecycleNames()`

---

### 2. Schema + matview + edit — `object-form-postgres-schema-matview.spec.ts`

Covers objects and SQL types not in the base lifecycle; uses a **custom schema** (not `public`).

| Step | Action | Preview assert |
|------|--------|----------------|
| Create database | Create database | `CREATE DATABASE` |
| Create schema | Create schema | `CREATE SCHEMA` |
| Create table in schema | Create table | `CREATE TABLE`, `ADD COLUMN` |
| Create materialized view | Create materialized view | `CREATE MATERIALIZED VIEW` |
| Create view | Create view | `CREATE VIEW` |
| Edit database | Edit database → comment | `COMMENT ON DATABASE` |
| Rename schema | Edit schema | `ALTER SCHEMA` + `RENAME TO` |
| Edit view | Edit view | `CREATE OR REPLACE VIEW` |
| Cleanup | drop matview → view → table → schema → database | drop patterns |

**Helper:** `helpers/objectFormPostgresExtended.ts`  
**Fixture:** `postgresExtendedNames()`

---

### 3. Deep edit table — `object-form-postgres-edit-table.spec.ts`

Setup on the **`default`** database and **`public`** schema (no new database).

| Step | Scenario | Preview assert |
|------|----------|----------------|
| Setup | users + posts (FK) + `notes` column | `CREATE TABLE`, `ADD COLUMN` |
| Set NOT NULL | toggle `not_null` on email | `SET NOT NULL` |
| Set default | `column_default` | `SET DEFAULT` |
| Set comment | `comment` | `COMMENT ON COLUMN` |
| Drop FK | delete row on Foreign Keys tab | `DROP CONSTRAINT` |
| Drop column | delete row on Columns tab | `DROP COLUMN` |
| Rename table | general `relname` | `ALTER TABLE` + `RENAME TO` |
| Table comment | general `description` | `COMMENT ON TABLE` |
| Change column type | `data_type` text → varchar | `ALTER COLUMN` + `TYPE` |
| Add UNIQUE key | Keys tab → new row | `ADD CONSTRAINT` + `UNIQUE` |
| Drop key | Keys tab → delete row | `DROP CONSTRAINT` |
| Cleanup | drop tables + connection | — |

---

### 4. Simple create/edit table (multi-engine) — `object-form-table.spec.ts`

Parameterized for **PostgreSQL, MySQL, SQLite**: one table with two columns, then edit with an extra column.

**Fixture:** `fixtures/objectFormScenarios.ts` → `CREATE_TABLE_SCENARIOS`, `EDIT_TABLE_SCENARIOS`

---

### Approximate PostgreSQL Object Form coverage

| Metric | Before | After |
|--------|--------|-------|
| Active menu actions | ~7/13 | ~11/13 |
| SQL statement types | ~35–40% | **~70%** |
| Table tabs exercised | Columns + FK | **Columns + FK + Keys** |

**Intentionally out of scope**

- Indexes / Triggers / Checks (menu disabled on PG)
- Edit materialized view
- `ALTER DATABASE RENAME`

---

## MySQL / SQLite Object Form

| Spec | Content |
|------|---------|
| `object-form-mysql-lifecycle.spec.ts` | DB → tables → FK → view → edit column → edit view → cleanup |
| `object-form-sqlite-lifecycle.spec.ts` | Same flow without create database |
| `object-form-table.spec.ts` | create/edit table for all three engines |

**Helpers:** `objectFormMysqlLifecycle.ts`, `objectFormSqliteLifecycle.ts`, `objectFormTable.ts`

---

## Other E2E scenarios

| Spec | Topic |
|------|-------|
| `connections.spec.ts` | Connection CRUD, refresh, context menu, schema via SQL |
| `query-crud.spec.ts` | INSERT/UPDATE/DELETE and JOIN in the editor |
| `saved-history.spec.ts` | Saved queries and History |
| `settings-theme.spec.ts` | Theme, settings panels, sidebar |
| `ai-chat-stream.spec.ts` | AI chat streaming |

---

## Page Objects (summary)

### `ObjectFormPage`

| Method | Purpose |
|--------|---------|
| `waitForReady()` | `object-form` visible + loading finished |
| `selectTab(tabId)` | Inner form tab (Columns, FK, Keys, …) |
| `ensureWorkspaceTab(title)` | Switch workspace tab (e.g. "Create schema") |
| `closeWorkspaceTab(title)` | Close a workspace tab |
| `fillGeneralField` / `fillGeneralQueryField` | Fill general-tab fields (including view query) |
| `fillArrayCell` | Fill array-tab cells |
| `selectMultiSelectOptions` | FK/keys columns (creatable) |
| `fillQueryCell` | Monaco SQL in array rows (legacy) |
| `deleteArrayRow` | Remove FK/column/key row |
| `save()` / `confirmExecute()` | Preview + execute with HTTP status assert |

### `ObjectTreePage`

`expandPath`, `runTreeAction`, `dropObject` — schema tree and context menu.

### `ConnectionPage`

`setupConnection`, `deleteConnection` — from `fixtures/dbConfigs.ts`.

---

## PostgreSQL field ID reference

Field IDs are shared between frontend and API (`relname`, `column_name`, `nspname`, …).

```ts
// fixtures/postgresObjectFormLifecycle.ts
POSTGRES_LIFECYCLE_FIELDS   // datname, nspname, relname, column_name, name (keys), …
POSTGRES_LIFECYCLE_TABS     // database, schema, table_columns, table_keys, …
POSTGRES_LIFECYCLE_PREVIEW  // RegExp for SQL preview asserts
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| FK multiselect timeout | Wait for `/dynamic`; use creatable option |
| Create schema tab does not open | Close renamed database tab before Create schema |
| `relation "tablecontainer" does not exist` | Stale backend; needs `resolveCreateTableNode` + restart |
| Schema preview never opens | `buildSavePayload` must emit a `schema` payload |
| Table missing in custom schema tree | `CREATE TABLE` must be schema-qualified; re-expand tree |
| Edit view fails on MySQL/SQLite | Use `fillGeneralQueryField`, not `fillQueryCell(0, …)` |

HTML report: `frontend/playwright-report/`  
Failure screenshots/traces: `frontend/test-results/`
