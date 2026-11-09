# Testing

DBO Studio uses **Playwright e2e tests only** for automated product behavior. Do not add new unit/integration tests under `backend/` or `frontend/` for user-visible features.

Full reference: [`e2e/README.md`](../../e2e/README.md).

## Architecture

Each `npm test` run boots an **ephemeral stack**:

```text
npm test
  └─ e2e/scripts/run-e2e.mjs
       ├─ start-stack.mjs
       │    ├─ go run . serve  (random APP_PORT, temp APP_DATABASE_PATH)
       │    └─ vite            (random VITE_PORT, proxies to ephemeral API)
       ├─ playwright test
       └─ teardown
```

Your daily app data (`~/Library/Application Support/dbo/…` on macOS) is never touched.

## Prerequisites

| Requirement | Setup |
| ----------- | ----- |
| Go toolchain | Builds/runs backend via `go run . serve` |
| Frontend deps | `cd frontend && npm install` |
| Sample DBs | `docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql` |
| TLS sample (SSL tests) | `docker compose -f docker-compose.dev.yml up -d sample-pgsql-ssl` |
| Playwright browser | `cd e2e && npx playwright install chromium` |

```bash
cp e2e/.env.example e2e/.env
cd e2e && npm install
```

Default e2e `.env` targets `127.0.0.1` and compose-published ports (`45432` Postgres, `43306` MySQL, `45433` SSL Postgres). Full variable list: [Configuration](../deployment/configuration.md#e2e-e2eenv).

## Running tests

**Always** run via `npm test` (or `npm run test:*`) — never bare `npx playwright test` (requires `PLAYWRIGHT_API_URL` from the harness).

```bash
cd e2e

npm test                          # all projects (postgres + mysql + sqlite)
npm run test:pg                   # shared + postgres
npm run test:mysql
npm run test:sqlite
npm run test:ui                   # Playwright UI mode (all engines)
npm test -- tests/shared/connections.spec.ts   # single spec
```

From `frontend/`: `npm run test:e2e` forwards to this package.

### Host OS requirement

Playwright must run on the **real machine** (Chromium launch, port bind, Docker on `127.0.0.1`). Do not run e2e inside restricted sandboxes.

Defaults: `workers=1`, `maxFailures=1`, traces/screenshots/videos on failure. Override workers with `PLAYWRIGHT_WORKERS`.

## Directory layout

```text
e2e/
├── fixtures/     # configs, unique names
├── helpers/      # multi-step flows, safeCleanup
├── pages/        # Page Object Model
├── scripts/      # start-stack, run-e2e
├── tests/
│   ├── shared/   # cross-engine UI (runs under postgres project)
│   ├── pg/
│   ├── mysql/
│   └── sqlite/
└── playwright.config.ts
```

## Writing tests

Follow [`.cursor/rules/e2e-qa.mdc`](../../.cursor/rules/e2e-qa.mdc) and the `e2e-playwright` skill:

- One user-visible flow per spec file
- `test.step()` for each meaningful action
- `getByRole` / `getByTestId` locators; web-first `expect`
- `uniqueTestSuffix` + `withConnectionCleanup` for connection-creating tests
- Update the feature matrix in `e2e/README.md` when adding coverage

## CI

`.github/workflows/tests.yml` runs on push/PR to `master`, `release`, and `dev`:

- **go-static-checks** — `go mod tidy`, `golangci-lint` on `backend/`
- **front-quality** — Prettier check on `frontend/`

`.github/workflows/e2e.yml` runs on the same branches:

- **coverage-guard** — `npm run check:coverage`. Every shared suite must run on every engine in `e2e/coverage/capabilities.mjs`, or carry an `EXEMPT` reason. `TODO` entries are known gaps: add the spec, then delete the entry.
- **e2e matrix** — one job per engine and shard (`--shard=i/n`), each with its own sample DBs and ephemeral stack. `fail-fast: false`, `PLAYWRIGHT_MAX_FAILURES=0`, so every failure shows.
- `retries: 1` in CI with `failOnFlakyTests`: a test that passes only on retry fails the run.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| `PLAYWRIGHT_API_URL is not set` | Ran `playwright test` directly — use `npm test` |
| Connection refused to PG/MySQL | Sample containers down or wrong ports in `e2e/.env` |
| Stale Monaco / backdrop errors | Workspace tabs left open — use `closeAllWorkspaceTabs` helpers |
