# E2E Coverage Gap Report

Living plan for DBO Studio Playwright coverage. Use this document to decide **what to test next**, not as a code-coverage percentage.

**Audience:** humans + coding agents implementing `e2e/` specs.  
**Related:** [`e2e/README.md`](../e2e/README.md), [`e2e-per-engine-implementation.md`](./e2e-per-engine-implementation.md) (how to implement per-DB suites), [`.cursor/rules/e2e-qa.mdc`](../.cursor/rules/e2e-qa.mdc), [`.cursor/skills/e2e-playwright/SKILL.md`](../.cursor/skills/e2e-playwright/SKILL.md).  
**Last audited:** 2026-08-08 (QA cleanup: split mega-tests, ActionBar, dirty-tab, MCP, MySQL/SQLite chrome smoke).

---

## Confidence policy

A green `cd e2e && npm test` is a **DB/web regression gate**, not proof of the full product.

| Scope | If e2e green |
|-------|----------------|
| Core PG DB GUI + Object Form ×3 + query CRUD ×3 | High confidence (~70–80%) |
| AI send/stream + Desktop/Tauri shell | **Not claimed** — manual release checklist |

**Accepted out of automated e2e:** AI with real providers; Tauri file pickers / updater.

**Scenario standard:** one assertable user scenario per `test()`. Use `test.step` for readability inside a scenario. Prefer independent tests + shared helpers; use `serial` only for intentional Object Form lifecycles.

---

## How an agent should use this doc

1. Pick the highest unfinished **Priority** item in [Backlog](#backlog-implement-these).
2. Follow e2e QA rules: ephemeral stack via `cd e2e && npm test`, POM/helpers/fixtures, `uniqueTestSuffix`, `withConnectionCleanup`, `test.step`.
3. Mirror the closest existing spec (see [Patterns to copy](#patterns-to-copy)).
4. When done: mark the backlog row `[x]`, update the matrix, and `e2e/README.md` feature matrix.
5. Do **not** chase Istanbul/JS line coverage as success criteria.

---

## Coverage strategy (product decisions)

| Layer | Depth required? | Driver policy |
|-------|-----------------|---------------|
| **Object Form** | Yes — deep | Across PostgreSQL, MySQL, SQLite |
| **Query** (SQL editor + result grid) | Yes — deep | Per engine |
| **Data browser** | Yes — deep on PG; smoke on MySQL/SQLite | PG deep; chrome smoke exists |
| **Everything else** | Smoke / happy path | One engine (PostgreSQL) |

Depth labels: `—` / `smoke` / `happy` / `lifecycle` / `deep`.

---

## Current suite snapshot

See [`e2e/README.md`](../e2e/README.md) feature matrix for the live list. Highlights after 2026-08-08 cleanup:

- Removed: `query-edit-*`, `object-form-table`, `ai-chat-stream` (renamed)
- Split: import-export, typed-cells, edit-table (serial), schema-matview (serial), data-browser, query-crud Full CRUD
- Added: `workspace-dirty-tab`, `mcp-panel`, `connections-mysql-sqlite-smoke`, ActionBar Columns/Inline Query/Query Preview, `ai-chat-panel`

POMs include `WorkspacePage`; SettingsPage covers MCP tab.

---

## Feature × Driver × Depth matrix

### DB-critical

| Feature | PostgreSQL | MySQL | SQLite | Notes |
|---------|------------|-------|--------|-------|
| Connections CRUD / menus / test | `deep` | `smoke` | `smoke` | `connections-mysql-sqlite-smoke` |
| Connection SSL | `happy`–`deep` | `—` | `n/a` | `connection-ssl` |
| Query SQL CRUD + result grid edit | `deep` | `deep` | `deep` | discard/remove folded into `query-crud-*` |
| Query status bar | `deep` | `—` | `—` | |
| Data browser filter/sort/page | `deep` | `smoke` | `smoke` | ActionBar Columns/Inline/Preview on PG |
| Import / Export | `happy` | `—` | `—` | split scenarios |
| Typed cells / Quick Look | `deep` | `deep` | `—` | split scenarios |
| Object Form lifecycle + deep edit | `deep` | `deep` | `deep` | serial small tests |
| Object Form schema + matview | `lifecycle` | `n/a` | `n/a` | |

### Non-DB

| Feature | Depth | Notes |
|---------|-------|-------|
| Saved / history | `happy`–`deep` | PG |
| Settings theme / panels / sidebars | `happy` / `smoke` | |
| Workspace dirty tab | `happy` | |
| AI panel open | `smoke` | no LLM |
| MCP panel | `smoke`–`happy` | no LLM |
| AI send/stream/providers | `—` | accepted out of e2e |
| Desktop/Tauri | `—` | accepted out of e2e |

---

## Backlog (implement these)

### Done (recent)

- [x] Split mega-tests (import-export, typed-cells, edit-table, schema-matview, data-browser, query-crud)
- [x] Merge/delete `query-edit-*` into `query-crud-*`
- [x] Delete `object-form-table` smoke
- [x] Data ActionBar Columns / Inline Query / Query Preview
- [x] Dirty-tab confirm
- [x] MCP panel smoke
- [x] MySQL + SQLite connection + data-browser smoke
- [x] Rename AI panel smoke

### Optional / later

- [ ] Appearance font / editor theme persistence
- [ ] Tree Copy name
- [ ] AI Explain toolbar (needs mock/provider strategy)
- [ ] AI chat send/stream mock (only if regressions justify harness)
- [ ] Safe Mode / import-export smoke on one non-PG engine
- [ ] More backend unit tests for drivers/SQL generation

### Explicitly out of scope

- SQL Server until Add Connection + driver are real
- Desktop-only Update dialog / Tauri WebDriver
- Multiplying engines for AI/Settings/theme
- Real-provider AI e2e in CI

---

## Patterns to copy

| New work | Copy from |
|----------|-----------|
| Independent scenarios + helper setup | `tests/import-export.spec.ts`, `helpers/importExport.ts` |
| Serial Object Form phases | `tests/object-form-postgres-lifecycle.spec.ts` |
| Data browser ActionBar | `tests/data-browser.spec.ts`, `pages/DataBrowserPage.ts` |
| Settings / MCP | `tests/mcp-panel.spec.ts`, `pages/SettingsPage.ts` |
| Dirty tab | `tests/workspace-dirty-tab.spec.ts`, `pages/WorkspacePage.ts` |

### Implementation checklist

```
- [ ] uniqueTestSuffix + withConnectionCleanup
- [ ] One scenario per test(); test.step inside
- [ ] Locators: role → label → testid
- [ ] await expect(…).… web-first
- [ ] cd e2e && npm test -- tests/<file>.spec.ts green
- [ ] Update this report + e2e/README.md matrix
```

### Run commands

```bash
docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql
cd e2e
npm test -- tests/<file>.spec.ts
```

Never run bare `npx playwright test` without `npm test` / `run-e2e`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-08 | QA cleanup: split megas, remove query-edit + object-form-table, add ActionBar/dirty-tab/MCP/MySQL-SQLite smoke; confidence policy; AI/Desktop out of e2e. |
| 2026-08-06 | P0/P1 backlog: data-browser, query-crud mysql/sqlite, object-form edit, import-export, query-format. |
| 2026-07-25 | Initial gap audit. |
