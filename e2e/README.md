# E2E Tests (Playwright)

Isolated Playwright suite for DBO Studio. Each `npm test` run boots an **ephemeral backend** (random port + temp SQLite) and a Vite frontend that proxies `/api` to that backend. Your personal app DB (`~/Library/Application Support/dbo/...`) is never used.

**Agents:** follow [`.cursor/rules/e2e-qa.mdc`](../.cursor/rules/e2e-qa.mdc) and the [`e2e-playwright`](../.cursor/skills/e2e-playwright/SKILL.md) skill when writing or fixing tests.

**Per-engine completeness + speed:** see [`docs/e2e-per-engine-implementation.md`](../docs/e2e-per-engine-implementation.md). Gaps: [`docs/e2e-coverage-gap-report.md`](../docs/e2e-coverage-gap-report.md).

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

npm test                          # headless, fail-fast, list reporter
npm run test:ui                   # Playwright UI mode
npm test -- tests/object-form-sqlite-edit-table.spec.ts   # one file (prefer per-engine when projects exist)
npm test -- tests/connections.spec.ts
```

Object Form is **not** a separate aggregate script. It is deep coverage **inside** each engine suite (`test:pg` / `test:mysql` / `test:sqlite` once those projects exist). Do not reintroduce `test:object-form` that concatenates all engines into one serial job.

From `frontend/`: `npm run test:e2e` forwards to this package.

Defaults: `workers=1`, `maxFailures=1`, traces/screenshots/videos on failure. Override workers with `PLAYWRIGHT_WORKERS`.

HTML report: `e2e/playwright-report/` after a run.

## Feature matrix

Prefer **one assertable scenario per `test()`**. Mega-files are split into small named tests (serial only for Object Form lifecycles / edit-table chains).

| Feature                  | Spec                                          | Flow                                                    |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Harness smoke            | `harness-smoke.spec.ts`                       | ephemeral API + FE reachable (no sample DB)             |
| Connections              | `connections.spec.ts`                         | create / edit / duplicate / reorder / refresh / context menu / schema via SQL / ping diagnostics |
| Connection SSL           | `connection-ssl.spec.ts`                      | SSL tab UI + Require on sample-pgsql-ssl + bad CA fail  |
| Connections MySQL/SQLite | `connections-mysql-sqlite-smoke.spec.ts`      | create connection + seed + open Data table (smoke)      |
| Safe Mode                | `safe-mode.spec.ts`                           | menu modes, SQL gates + grid Save confirm               |
| Query CRUD               | `query-crud.spec.ts`                          | split: select / inline edit / discard+remove / SQL update+delete / JOIN |
| Query CRUD MySQL         | `query-crud-mysql.spec.ts`                    | same split + JOIN                                       |
| Query CRUD SQLite        | `query-crud-sqlite.spec.ts`                   | same split + JOIN                                       |
| Query format             | `query-format.spec.ts`                        | Beatify / format messy SQL                              |
| Query status bar         | `query-statusbar.spec.ts`                     | PG: discard/add/remove/refresh + page next/limit + gate |
| SQL editor context       | `editor-context.spec.ts`                      | PG/MySQL/SQLite: select visibility + autofill           |
| Data browser             | `data-browser.spec.ts`                        | open / filter / sort / pagination / Columns / Inline Query / Query Preview |
| Data grid context menus  | `data-grid-context-menus.spec.ts`             | empty Add/Refresh; copy matrix; set/dup/delete; filter =/≠/NULL; sort/hide; Safe Mode |
| Import / Export          | `import-export.spec.ts`                       | split: export CSV/JSON/SQL, filtered, import formats, round-trip, continue-on-error |
| Data grid typed cells    | `data-grid-typed-cells.spec.ts`               | MySQL+PG: split per editor/cue/Quick Look               |
| Data grid FK autocomplete| `data-grid-fk-autocomplete.spec.ts`           | PG+MySQL+SQLite single-col pick/paste; SQLite composite fill; NOT NULL hides NULL |
| Query guards             | `query-guards.spec.ts`                        | cancel Stop + raw SELECT page size / user LIMIT         |
| Saved / history          | `saved-history.spec.ts`                       | history, save, run, copy                                |
| Settings / theme         | `settings-theme.spec.ts`                      | theme persistence, panels, sidebar                      |
| Keyboard shortcuts       | `keyboard-shortcuts.spec.ts`                  | cheatsheet groups/filter, Alt+/ open, grid Save/Refresh tooltips |
| Workspace dirty tab      | `workspace-dirty-tab.spec.ts`                 | dirty Cancel / Yes / clean close                        |
| AI chat panel            | `ai-chat-panel.spec.ts`                       | Assistant panel + composer (no LLM)                     |
| MCP panel                | `mcp-panel.spec.ts`                           | Settings AI → MCP controls + enable toggle (no LLM)     |
| Object Form PG lifecycle | `object-form-postgres-lifecycle.spec.ts`      | serial: connect → DB → tables → FK → view → edit → drop |
| Object Form PG edit      | `object-form-postgres-edit-table.spec.ts`     | serial deep column/FK/key edits                         |
| Object Form PG schema    | `object-form-postgres-schema-matview.spec.ts` | serial schema, matview, rename, drop schema             |
| Object Form MySQL        | `object-form-mysql-lifecycle.spec.ts`         | serial: connect → DB → tables → FK → view → edit → drop |
| Object Form MySQL edit   | `object-form-mysql-edit-table.spec.ts`        | serial deep column/FK/key/index edits                   |
| Object Form SQLite       | `object-form-sqlite-lifecycle.spec.ts`        | serial: connect → tables → FK → view → edit → drop      |
| Object Form SQLite edit  | `object-form-sqlite-edit-table.spec.ts`       | serial deep column/FK drop+re-add/key edits             |
| Database diagram (ERD)   | `database-diagram.spec.ts`                    | PG/MySQL/SQLite: open ERD, FK edges, related highlight, PNG export |

**Accepted out of automated e2e:** AI send/stream with real providers; Tauri/desktop native dialogs (manual release checklist).


## Directory layout

```
e2e/
├── fixtures/     # configs, scenario tables, unique names
├── helpers/      # lifecycle flows + safeCleanup
├── pages/        # Page Object Model
├── scripts/      # start-stack / run-e2e
├── tests/        # *.spec.ts
├── utils/        # global.setup (resets ephemeral app DB only)
└── playwright.config.ts
```

## Isolation notes

- `POST /api/config/reset` runs in `global.setup` against the **ephemeral** API only.
- Specs use `uniqueTestSuffix` and `withConnectionCleanup` so failed tests still remove connection rows.
- Object Form lifecycle specs use `test.describe.configure({ mode: "serial" })` so each phase is a trackable test; `afterAll` still attempts full object cleanup on failure.
- PG/MySQL still use shared `sample-*` containers with unique object names (dedicated e2e DB compose is a follow-up).
- MySQL publish in `docker-compose.dev.yml` is `3307:3307`; if host MySQL e2e cannot connect, map `3307:3306` instead.

## Troubleshooting

| Symptom                         | Likely cause                                                    |
| ------------------------------- | --------------------------------------------------------------- |
| `PLAYWRIGHT_API_URL is not set` | Ran `playwright test` directly; use `npm test`                  |
| Connection refused to PG/MySQL  | Sample containers not up, or wrong host/port in `.env`          |
| SQLite object-form fails        | Backend cannot write `/tmp/dbo-e2e-*.db`                        |
| Stale Monaco / backdrop errors  | Workspace tabs left open — helpers call `closeAllWorkspaceTabs` |
| View query empty in preview     | `fillGeneralQueryField` must use Zustand store hook (DEV)       |

Restart is not required for Go changes when using `go run` per e2e start; each run compiles fresh.
