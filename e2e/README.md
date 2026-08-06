# E2E Tests (Playwright)

Isolated Playwright suite for DBO Studio. Each `npm test` run boots an **ephemeral backend** (random port + temp SQLite) and a Vite frontend that proxies `/api` to that backend. Your personal app DB (`~/Library/Application Support/dbo/...`) is never used.

**Agents:** follow [`.cursor/rules/e2e-qa.mdc`](../.cursor/rules/e2e-qa.mdc) and the [`e2e-playwright`](../.cursor/skills/e2e-playwright/SKILL.md) skill when writing or fixing tests.

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
npm run test:object-form          # Object Form suite only
npm test -- tests/connections.spec.ts
```

From `frontend/`: `npm run test:e2e` forwards to this package.

Defaults: `workers=1`, `maxFailures=1`, traces/screenshots/videos on failure. Override workers with `PLAYWRIGHT_WORKERS`.

HTML report: `e2e/playwright-report/` after a run.

## Feature matrix

| Feature                  | Spec                                          | Flow                                                    |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Harness smoke            | `harness-smoke.spec.ts`                       | ephemeral API + FE reachable (no sample DB)             |
| Connections              | `connections.spec.ts`                         | create / edit / refresh / context menu / schema via SQL / ping diagnostics |
| Connection SSL           | `connection-ssl.spec.ts`                      | SSL tab UI + Require on sample-pgsql-ssl + bad CA fail  |
| Safe Mode                | `safe-mode.spec.ts`                           | menu modes, SQL gates + grid Save confirm               |
| Query CRUD               | `query-crud.spec.ts`                          | SQL create/insert/update/select + multi-table JOIN      |
| Query status bar         | `query-statusbar.spec.ts`                     | PG: discard/add/remove/refresh + page next/limit + gate |
| Query edit MySQL         | `query-edit-mysql.spec.ts`                    | smoke edit/discard/remove on result grid                |
| Query edit SQLite        | `query-edit-sqlite.spec.ts`                   | smoke edit/discard/remove on result grid                |
| Query guards             | `query-guards.spec.ts`                        | cancel Stop + raw SELECT page size / user LIMIT         |
| Saved / history          | `saved-history.spec.ts`                       | history, save, run, copy                                |
| Settings / theme         | `settings-theme.spec.ts`                      | theme persistence, panels, sidebar                      |
| AI chat smoke            | `ai-chat-stream.spec.ts`                      | open assistant panel                                    |
| Object Form smoke        | `object-form-table.spec.ts`                   | create/edit table × PG/MySQL/SQLite                     |
| Object Form PG lifecycle | `object-form-postgres-lifecycle.spec.ts`      | DB → tables → FK → view → edit → drop                   |
| Object Form PG edit      | `object-form-postgres-edit-table.spec.ts`     | deep column/FK edits                                    |
| Object Form PG schema    | `object-form-postgres-schema-matview.spec.ts` | schema, matview, rename                                 |
| Object Form MySQL        | `object-form-mysql-lifecycle.spec.ts`         | full lifecycle                                          |
| Object Form SQLite       | `object-form-sqlite-lifecycle.spec.ts`        | full lifecycle                                          |

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
- Object Form lifecycle specs also attempt full object cleanup on failure.
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
