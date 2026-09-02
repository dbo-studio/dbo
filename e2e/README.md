# E2E Tests (Playwright)

Isolated Playwright suite for DBO Studio. Each `npm test` run boots an **ephemeral backend** (random port + temp SQLite) and a Vite frontend that proxies `/api` to that backend. Your personal app DB (`~/Library/Application Support/dbo/...`) is never used.

**Agents:** follow [`.cursor/rules/e2e-qa.mdc`](../.cursor/rules/e2e-qa.mdc) and the [`e2e-playwright`](../.cursor/skills/e2e-playwright/SKILL.md) skill when writing or fixing tests.

**Per-engine completeness + speed:** see [`docs/e2e-per-engine-implementation.md`](../docs/e2e-per-engine-implementation.md). Gaps: [`docs/e2e-coverage-gap-report.md`](../docs/e2e-coverage-gap-report.md).

CI runs three parallel jobs (`e2e-postgres` / `e2e-mysql` / `e2e-sqlite`) via `.github/workflows/tests.yml`.

## Architecture

```
npm test
  └─ scripts/run-e2e.mjs
       ├─ start-stack.mjs
       │    ├─ go run . serve  (APP_PORT=random, APP_DATABASE_PATH=/tmp/dbo-e2e-*/dbo.db)
       │    └─ vite            (VITE_PORT=random, API_PROXY_TARGET=ephemeral API)
       ├─ playwright test
       └─ teardown (kill processes, rm temp dir)
```

## Prerequisites

| Service             | Notes                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Go toolchain        | Builds/runs backend via `go run . serve`                                   |
| Frontend deps       | `cd frontend && npm install` (Vite is started from there)                  |
| Sample DBs          | `docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql` |
| TLS sample (SSL e2e)| `docker compose -f docker-compose.dev.yml up -d sample-pgsql-ssl` (port 5433) |
| Playwright browsers | `cd e2e && npx playwright install chromium`                                |

```bash
cp e2e/.env.example e2e/.env
# defaults use 127.0.0.1 + published compose ports
cd e2e && npm install
```

## Running

```bash
cd e2e

npm test                          # all projects (postgres + mysql + sqlite)
npm run test:pg                   # tests/shared + tests/pg
npm run test:mysql                # tests/mysql
npm run test:sqlite               # tests/sqlite
npm run test:ui                   # Playwright UI — all engines (pg + mysql + sqlite + shared)
npm run test:ui:mysql             # UI filtered to MySQL only (also :pg / :sqlite)
npm test -- tests/sqlite/object-form-sqlite-edit-table.spec.ts
npm test -- tests/shared/connections.spec.ts
```

Object Form is **not** a separate aggregate script. It is deep coverage **inside** each engine suite (`test:pg` / `test:mysql` / `test:sqlite`). Do not reintroduce `test:object-form` that concatenates all engines into one serial job.

From `frontend/`: `npm run test:e2e` forwards to this package.

Defaults: `workers=1`, `maxFailures=1`, traces/screenshots/videos on failure. Override workers with `PLAYWRIGHT_WORKERS`.

HTML report: `e2e/playwright-report/` after a run.

## Feature matrix

Prefer **one assertable scenario per `test()`**. Mega-files are split into small named tests (serial only for Object Form lifecycles / edit-table chains).

| Feature                  | Spec                                          | Flow                                                    |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Harness smoke            | `shared/harness-smoke.spec.ts`                | ephemeral API + FE reachable (no sample DB)             |
| Connections              | `shared\|mysql\|sqlite/connections.spec.ts`   | create/edit/dup/reorder/refresh/menu/ping via shared suite |
| Safe Mode                | `shared\|mysql\|sqlite/safe-mode.spec.ts`     | menu + alert/safe gates + grid Save confirm ×3            |
| Query status bar         | `pg\|mysql\|sqlite/query-statusbar.spec.ts`   | discard/add/remove/refresh + pagination + edit gate ×3  |
| Query guards             | `pg\|mysql\|sqlite/query-guards.spec.ts`      | cancel Stop + raw SELECT page size / user LIMIT ×3      |
| Data grid context menus  | `pg\|mysql\|sqlite/data-grid-context-menus.spec.ts` | empty/cell/header/Safe Mode menus ×3              |
| Query CRUD               | `pg/query-crud.spec.ts`                       | split: select / inline edit / discard+remove / SQL update+delete / JOIN |
| Query CRUD MySQL         | `mysql/query-crud-mysql.spec.ts`              | same split + JOIN + editor `USE` database               |
| Query CRUD SQLite        | `sqlite/query-crud-sqlite.spec.ts`            | same split + JOIN                                       |
| Query format             | `shared/query-format.spec.ts`                 | Beatify / format messy SQL                              |
| SQL editor context       | `shared/editor-context.spec.ts`               | PG/MySQL/SQLite: select visibility + autofill           |
| Data browser             | `pg\|mysql\|sqlite/data-browser.spec.ts`      | filter/sort/page/columns/inline/preview via shared suite |
| Import / Export          | `pg\|mysql\|sqlite/import-export.spec.ts`     | CSV/JSON/SQL export+import, round-trip, continue-on-error |
| Object Form multi-col FK | `*/object-form-multi-column-fk.spec.ts`       | Add composite FK on edit ×3 |
| Connection SSL           | `pg/connection-ssl.spec.ts`                   | SSL tab UI + Require on sample-pgsql-ssl + bad CA fail  |
| Data grid typed cells    | `shared/data-grid-typed-cells.spec.ts`        | MySQL+PG; SQLite n/a (no typed editors yet)             |
| Data grid FK autocomplete| `shared/data-grid-fk-autocomplete.spec.ts`    | PG+MySQL+SQLite single-col pick/paste; SQLite composite fill; NOT NULL hides NULL |
| Saved / history          | `shared/saved-history.spec.ts`                | history, save, run, copy                                |
| Settings / theme         | `shared/settings-theme.spec.ts`               | theme persistence, panels, sidebar                      |
| Keyboard shortcuts       | `shared/keyboard-shortcuts.spec.ts`           | cheatsheet groups/filter, Alt+/ open, grid Save/Refresh tooltips |
| Workspace dirty tab      | `shared/workspace-dirty-tab.spec.ts`          | dirty Cancel / Yes / clean close                        |
| AI chat panel            | `shared/ai-chat-panel.spec.ts`                | Assistant panel + composer (no LLM)                     |
| MCP panel                | `shared/mcp-panel.spec.ts`                    | Settings AI → MCP controls + enable toggle (no LLM)     |
| Object Form PG lifecycle | `pg/object-form-postgres-lifecycle.spec.ts`   | serial: connect → DB → tables → FK → view → edit → drop |
| Object Form PG edit      | `pg/object-form-postgres-edit-table.spec.ts`  | serial deep column/FK drop+re-add+rename / key edits    |
| Object Form PG schema    | `pg/object-form-postgres-schema-matview.spec.ts` | serial schema, matview, rename, drop schema          |
| Object Form MySQL        | `mysql/object-form-mysql-lifecycle.spec.ts`   | serial: connect → DB → tables → FK → view → edit → drop |
| Object Form MySQL edit   | `mysql/object-form-mysql-edit-table.spec.ts`  | serial FK rename+actions / index drop+re-add / keys     |
| Object Form SQLite       | `sqlite/object-form-sqlite-lifecycle.spec.ts` | serial: connect → tables → FK → view → edit → drop      |
| Object Form SQLite edit  | `sqlite/object-form-sqlite-edit-table.spec.ts`| serial FK edit (SET NULL+DEFERRABLE) / column / keys    |
| Object Form SQLite STRICT | `sqlite/object-form-sqlite-table-options.spec.ts` | STRICT + WITHOUT ROWID create                        |
| Object Form generated col | `pg|sqlite/object-form-generated-column.spec.ts` | Add generated column on edit (STORED / VIRTUAL)     |
| Database diagram (ERD)   | `shared/database-diagram.spec.ts`             | PG/MySQL/SQLite: open ERD, FK edges, related highlight, PNG export, Source DBML |

**Accepted out of automated e2e:** AI send/stream with real providers; Tauri/desktop native dialogs (manual release checklist).


## Directory layout

```
e2e/
├── fixtures/     # configs, scenario tables, unique names
├── helpers/      # lifecycle flows + safeCleanup
├── pages/        # Page Object Model
├── scripts/      # start-stack / run-e2e
├── tests/
│   ├── shared/   # UI chrome + multi-engine once (runs with postgres project)
│   ├── pg/       # PostgreSQL DB-critical
│   ├── mysql/    # MySQL DB-critical
│   └── sqlite/   # SQLite DB-critical
├── utils/        # global.setup (resets ephemeral app DB only)
└── playwright.config.ts
```

## Isolation notes

- `POST /api/config/reset` runs in `global.setup` against the **ephemeral** API only.
- Specs use `uniqueTestSuffix` and `withConnectionCleanup` so failed tests still remove connection rows.
- Object Form lifecycle specs use `test.describe.configure({ mode: "serial" })` so each phase is a trackable test; `afterAll` still attempts full object cleanup on failure.
- PG/MySQL still use shared `sample-*` containers with unique object names (dedicated e2e DB compose is a follow-up).
- MySQL publish in `docker-compose.dev.yml` is `3307:3306`.

## Troubleshooting

| Symptom                         | Likely cause                                                    |
| ------------------------------- | --------------------------------------------------------------- |
| `PLAYWRIGHT_API_URL is not set` | Ran `playwright test` directly; use `npm test`                  |
| Connection refused to PG/MySQL  | Sample containers not up, or wrong host/port in `.env`          |
| SQLite object-form fails        | Backend cannot write `/tmp/dbo-e2e-*.db`                        |
| Stale Monaco / backdrop errors  | Workspace tabs left open — helpers call `closeAllWorkspaceTabs` |
| View query empty in preview     | `fillGeneralQueryField` must use Zustand store hook (DEV)       |
| `test:ui` only lists postgres   | Playwright UI Mode checks the first project by default. Use `npm run test:ui` (single `e2e` project). To filter one engine: `npm run test:ui:mysql` (or `:pg` / `:sqlite`). |

Restart is not required for Go changes when using `go run` per e2e start; each run compiles fresh.
