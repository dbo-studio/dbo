# Object Form E2E — Continuation Handoff

This document lets a new session pick up where we left off without rediscovering every path from scratch.  
**Last updated:** 2026-06-27

---

## 1. Project goal

Stabilize **11 E2E tests** for Object Form (6 spec files) across PostgreSQL, MySQL, and SQLite:

| # | Spec file | Tests |
|---|-----------|-------|
| 1 | `object-form-table.spec.ts` | 6 (create/edit × 3 engines) |
| 2 | `object-form-postgres-lifecycle.spec.ts` | 1 |
| 3 | `object-form-postgres-schema-matview.spec.ts` | 1 |
| 4 | `object-form-postgres-edit-table.spec.ts` | 1 |
| 5 | `object-form-mysql-lifecycle.spec.ts` | 1 |
| 6 | `object-form-sqlite-lifecycle.spec.ts` | 1 |

**Definition of done:** `npm run test:e2e:object-form:serial` with `workers=1` → 11/11 green (or known flakes documented).

---

## 2. File map (where things live)

```
frontend/e2e/
├── tests/object-form-*.spec.ts      # test scenarios
├── helpers/
│   ├── objectFormPostgresLifecycle.ts
│   ├── objectFormPostgresExtended.ts
│   ├── objectFormMysqlLifecycle.ts
│   ├── objectFormSqliteLifecycle.ts
│   ├── objectFormTable.ts           # multi-engine create/edit smoke
│   └── connectionSetupLock.ts       # connection modal lock across workers
├── pages/
│   ├── ObjectFormPage.ts            # main POM — most fixes live here
│   ├── ObjectTreePage.ts
│   └── ConnectionPage.ts
├── fixtures/
│   ├── postgresObjectFormLifecycle.ts  # FIELDS, TABS, PREVIEW, names()
│   ├── mysqlObjectFormLifecycle.ts
│   ├── sqliteObjectFormLifecycle.ts
│   ├── objectFormScenarios.ts          # table smoke scenarios
│   ├── dbConfigs.ts                    # host/port/sqlite path
│   └── uniqueSuffix.ts                 # unique names per worker
├── playwright.config.ts             # timeout 300s, workers 2
└── README.md                        # run guide + troubleshooting

frontend/src/  (product changes for E2E)
├── routes/ObjectForm/
│   ├── ObjectForm.tsx               # data-workspace-tab-id, data-object-tab-id
│   ├── hooks/useFormSave.ts         # blur before save
│   └── components/SimpleForm/
│       ├── SimpleField.tsx          # immediate onChange for query fields
│       └── SimpleField.styled.ts    # height: 250 for SqlEditor
├── components/base/SqlEditor/
│   ├── SqlEditor.tsx                # editorHeight, dispose on unmount
│   └── types.ts
└── store/formObject/formObject.store.ts  # __FORM_OBJECT_STORE__ in DEV

backend/internal/database/mysql/
├── resolve_table_node.go            # fix nodeId for edit view
├── execute_view_command.go          # CREATE OR REPLACE VIEW
├── execute_view_command_test.go
├── execute_table_key_command_test.go
└── helpers.go                       # formatMysqlColumnType (VARCHAR)

backend/internal/database/sqlite/
└── execute_table_query_builder_test.go
```

---

## 3. Root-cause playbook

### Step 1 — Read the Playwright failure

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test --config e2e/playwright.config.ts \
  e2e/tests/object-form-mysql-lifecycle.spec.ts --workers=1 --reporter=line
```

Useful artifacts after a fail:

- `frontend/test-results/**/error-context.md` — page snapshot + stack
- `frontend/playwright-report/` — HTML report

### Step 2 — Classify the error

| Symptom | Layer | Where to look |
|---------|-------|---------------|
| `MuiBackdrop-root` intercepts click | Stale modal | `closeWorkspaceTab` without Yes confirm; open context menu |
| `The editor is not accessible` | Monaco | Too many workspace tabs; zero height; `fillGeneralQueryField` |
| Preview shows only `CancelExecute`, no SQL | Empty store | `fillQueryFieldViaStore`; wrong prefix in `updateGeneralField` |
| `Execute failed 500: Incorrect table name ''` | MySQL backend | `resolve_table_node.go` + `ExtractNode` in `core/helpers.go` |
| `relation "x" does not exist` (PG schema) | Bad SQL | Query must be `schema.table`, not just `table` |
| `column "email" already exists` | Orphan data from prior run | `uniqueTestSuffix`; missing cleanup |
| `nameInput` timeout on connection | ConnectionPage | `goto()` before setup; wait for name after `selectConnectionType` |
| `getByRole('button', { name: 'Edit table' })` not found | Workspace tab | `ensureWorkspaceTab(tableName, 'Edit table')` |
| Fail after a ~4 min MySQL test | Exhaustion | `docker restart dbo-studio-dev-api`; serial file order |

### Step 3 — Symptom → file (real examples)

**MySQL createView**

1. Error: `fillGeneralField` timeout + backdrop in snapshot  
2. Snapshot: modal “Are you sure you want to close this tab?”  
3. Cause: `closeWorkspaceTab` never clicked Yes  
4. Fix: confirm dialog handling in `ObjectFormPage.closeWorkspaceTab`

**Monaco**

1. Error: `textarea.inputarea` never attaches  
2. Snapshot: `textbox "The editor is not accessible at this time."`  
3. Cause: many open workspace tabs + Monaco `height: 100%` on parent with no height  
4. Fixes: `closeStaleWorkspaceTabs` + `editorHeight={250}` + store fallback

**MySQL editView execute 500**

1. Message: `Incorrect table name ''`  
2. Generated SQL: `` CREATE OR REPLACE VIEW ``.`view` `` → `node.Database` empty  
3. `ExtractNode("v_posts_xxx")` → `Database=v_posts_xxx, Table=""` (single segment)  
4. Fix: `resolveMysqlTableNode` for `EditViewAction` → `Database=default, Table=viewName`

### Step 4 — Store and save payload

Data path on save:

```
SimpleField.onChange → updateGeneralField(selectedTab.id, fieldId, value)
  → formDataByTab[`${workspaceTabId}_${innerTabId}`]
  → buildSavePayload() in buildSavePayload.ts
  → POST /fields/object/preview
```

**Important:** `updateGeneralField` first argument is **`selectedTab.id` (workspace tab id)**, not `objectTabId` (`${selectedTab.id}_${innerTab}`).

E2E reads `data-workspace-tab-id` on the `object-form` root.

Dev-only hook:

```ts
// formObject.store.ts — import.meta.env.DEV only
globalThis.__FORM_OBJECT_STORE__ = useFormObjectStore;
```

---

## 4. Key changes already made

### 4.1 E2E — `ObjectFormPage.ts`

| Method | Purpose |
|--------|---------|
| `fillGeneralQueryField` | Uses only `fillQueryFieldViaStore` — do not call Monaco after store (it can clear the query) |
| `fillQueryFieldViaStore` | `updateGeneralField(workspaceTabId, fieldId, sql)` via `__FORM_OBJECT_STORE__` |
| `closeWorkspaceTab` | Loop + click Yes on confirm dialog |
| `closeStaleWorkspaceTabs(keep)` | Close all tabs except one |
| `closeAllWorkspaceTabs` | Close every workspace tab |
| `ensureWorkspaceTab(title, alt?)` | Fallback for “Edit table” vs table name |

### 4.2 E2E — lifecycle helpers

- **MySQL `createView`:** `closeAllWorkspaceTabs()` before Create view; `closeStaleWorkspaceTabs('Create view')`  
- **PG/SQLite createView:** `closeStaleWorkspaceTabs('Create view')`  
- **PG extended:** view/matview query = `` `SELECT … FROM ${schemaName}.${tableName}` ``  
- **All edit table flows:** `ensureWorkspaceTab(tableName, 'Edit table')`  
- **PG `createDatabase`:** `closeAllWorkspaceTabs()` before action; poll until tab + input visible

### 4.3 Product

- `SqlEditor`: `editorHeight` prop; dispose on unmount  
- `SimpleField`: `editorHeight={250}`; immediate onChange for query fields  
- `useFormSave`: `document.activeElement.blur()` before save  
- `ObjectForm`: `data-workspace-tab-id`, `data-object-tab-id`

### 4.4 Backend

- `resolveMysqlTableNode`: handle `EditViewAction` / `DropViewAction` for single-segment nodeIds  
- `formatMysqlColumnType`: `VARCHAR(255)`  
- Unit tests: `execute_view_command_test.go`, `execute_table_key_command_test.go`, SQLite rebuild smoke

### 4.5 Test infrastructure

- `package.json` → `test:e2e:object-form:serial` with **explicit file order** (lighter specs first, MySQL lifecycle last)  
- `playwright.config.ts` → timeout 300000, workers 2  
- `connectionSetupLock.ts` → max wait 90s

---

## 5. Running tests

### Prerequisites

```bash
# frontend :3000, backend :8080, PG/MySQL containers
docker restart dbo-studio-dev-api   # after any Go change
cp frontend/e2e/.env.example frontend/e2e/.env
```

### Commands

```bash
cd frontend

# Recommended — serial with fixed order
npm run test:e2e:object-form:serial

# Single spec
npx playwright test --config e2e/playwright.config.ts \
  e2e/tests/object-form-mysql-lifecycle.spec.ts --workers=1

# Parallel (after serial is green)
npm run test:e2e:object-form:parallel
```

### Pass status (approximate, after fixes)

| Spec | Status |
|------|--------|
| `object-form-mysql-lifecycle` | ✅ Pass (single file) |
| `object-form-postgres-lifecycle` | ✅ Pass (single file; restart API if needed) |
| `object-form-table` MySQL | ✅ Pass |
| `object-form-postgres-edit-table` | ⚠️ Needs re-verify |
| `object-form-postgres-schema-matview` | ⚠️ After schema.table fix |
| `object-form-sqlite-*` | ⚠️ Connection path; API must write `/tmp` |
| **Full serial 11/11** | ⚠️ Often 4–7 pass; PG flakes after long MySQL run |

---

## 6. Environment constraints

### MySQL

- Each test creates an isolated database (`e2e_db_${suffix}` or `e2e_obj_db_${suffix}`) via Object Form — no writes to shared `default`.
- E2E connects as `root` (override with `MYSQL_TEST_USER` / `MYSQL_TEST_PASSWORD`) so `CREATE DATABASE` works; tables/views are only created inside the per-run database.

### PostgreSQL

- Lifecycle creates a separate DB (`e2e_db_${suffix}`) — cleaner than MySQL.  
- Matview/view in a custom schema: SQL must be schema-qualified.

### SQLite

- Default path: `/tmp/dbo-e2e-*.db` — must be writable **inside the API container**.  
- If connection modal opens but `input[name="name"]` is missing → type selector step not finished.

### PanelItem — only one tab mounted

`frontend/src/components/common/Panels/PanelItem/PanelItem.tsx` mounts only `selectedTab`.  
Unclosed workspace tabs do not leak Monaco instances but clutter the UI and cause tooltip/backdrop issues.

---

## 7. Remaining work (priority)

1. **Stable 11/11 serial** — after `docker restart`; on fail try spec order or `beforeEach` with `page.goto('/')`  
2. **SQLite connection** — shared DB path between host and container (env var in `.env`)  
3. **PG edit-table** — duplicate column when setup is incomplete; review spec cleanup  
4. **`fillQueryCell`** (array query) — still Monaco-only; apply store pattern if a spec needs it  
5. **Remove `__FORM_OBJECT_STORE__`** — replace with hidden `data-testid` input or mandatory commit on save (product)  
6. **Parallel stabilize** — `workers=2` after serial is green

---

## 8. New session checklist

```text
[ ] docker ps — PG, MySQL, API up
[ ] docker restart dbo-studio-dev-api
[ ] frontend dev server :3000
[ ] git diff — check latest changes on ObjectFormPage / resolve_table_node
[ ] One green spec: mysql-lifecycle --workers=1
[ ] Full serial: npm run test:e2e:object-form:serial
[ ] On fail: error-context.md → section 3 table
```

---

## 9. Original plan reference

Initial plan: `.cursor/plans/object_form_e2e_remaining_4b273ae3.plan.md` (phases 1–6).  
This handoff fills in that plan with **discovered paths** and **current status**.

---

## 10. Sample Cursor prompt to continue

```
Continue Object Form E2E from frontend/e2e/OBJECT_FORM_E2E_HANDOFF.md
Goal: 11/11 on test:e2e:object-form:serial
Run serial first, debug failures using error-context.md
```
