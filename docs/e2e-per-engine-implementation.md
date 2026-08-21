# E2E Per-Engine Implementation Guide

How to make DBO Studio Playwright coverage **complete per database engine** without making the suite slower. Use this as the implementation playbook; use [`e2e-coverage-gap-report.md`](./e2e-coverage-gap-report.md) for “what is missing,” and [`e2e/README.md`](../e2e/README.md) for day-to-day run commands.

**Audience:** humans and coding agents changing `e2e/`.  
**Related:** [`.cursor/rules/e2e-qa.mdc`](../.cursor/rules/e2e-qa.mdc), [`.cursor/skills/e2e-playwright/SKILL.md`](../.cursor/skills/e2e-playwright/SKILL.md).

---

## 1. Goals

| Goal | Meaning |
|------|---------|
| **Completeness** | Every user-visible DB operation that the product supports for an engine has at least one e2e scenario that asserts **correct DDL/UI outcome**, not just “preview opened.” |
| **Speed** | Full gate wall-clock stays acceptable by running engines in **parallel jobs/projects**, not by skipping coverage. |
| **Isolation** | Never poison the developer’s daily app DB; never share mutable object names across workers. |
| **Maintainability** | One flow definition where possible; thin per-engine specs; no three copy-pasted mega-helpers. |

Non-goals:

- Line/Istanbul coverage as success criteria.
- Tripling UI chrome tests (theme, AI panel, MCP) across engines.
- Real LLM providers or Tauri native dialogs in CI.

---

## 2. Product policy (what “per DB” means)

### 2.1 Must be deep ×3 (PostgreSQL, MySQL, SQLite)

| Layer | Why |
|-------|-----|
| Object Form create / edit / drop | Driver SQL generation differs; SQLite often **rebuilds** tables. |
| Query CRUD + result grid edit | Dialect + editable result rules differ. |
| Data grid FK autocomplete | Already ×3; keep parity. |

### 2.2 Deep on PG; smoke or deep on others (product choice)

| Layer | Default policy | When to deepen MySQL/SQLite |
|-------|----------------|-----------------------------|
| Data browser (filter/sort/page/ActionBar) | PG deep; others smoke | After Object Form + query CRUD gaps are closed |
| Import / Export | PG happy | If format/path bugs appear on other engines |
| Typed cells / Quick Look | PG + MySQL deep; SQLite optional | When SQLite typed editors ship |
| Safe Mode / query status bar | PG | If gating logic becomes engine-specific |

### 2.3 Once only (any one engine, usually PG)

Settings/theme, workspace dirty tab, AI panel (no LLM), MCP panel, harness smoke, query format (unless dialect-specific).

---

## 3. Target architecture

```text
                    CI / local full gate
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   project: postgres  project: mysql  project: sqlite
   + shared/ui once   (DB-critical)   (DB-critical)
```

### 3.1 Playwright projects (recommended)

Three engine projects + optional shared project:

| Project | `testMatch` / tags | Workers (job) | Notes |
|---------|-------------------|---------------|-------|
| `postgres` | `tests/pg/**` or `@postgres` | 1 initially | Includes schema/matview Object Form |
| `mysql` | `tests/mysql/**` or `@mysql` | 1 | Needs `sample-mysql` |
| `sqlite` | `tests/sqlite/**` or `@sqlite` | 1 | File DB under `/tmp/dbo-e2e-*.db` |
| `shared` (optional) | `tests/shared/**` | 1 | Theme, dirty tab, AI/MCP, harness |

Run locally:

```bash
cd e2e
npm test -- --project=sqlite
npm test -- --project=postgres
npm test -- --project=mysql
npm test                         # all projects (CI / full gate)
```

### 3.2 npm scripts (target)

```json
{
  "test": "node scripts/run-e2e.mjs",
  "test:pg": "node scripts/run-e2e.mjs --project=postgres",
  "test:mysql": "node scripts/run-e2e.mjs --project=mysql",
  "test:sqlite": "node scripts/run-e2e.mjs --project=sqlite",
  "test:shared": "node scripts/run-e2e.mjs --project=shared"
}
```

**Do not** add `test:object-form` (or any cross-engine aggregate for Object Form / query CRUD). Object Form is part of each engine’s deep suite: `test:pg` already includes PG Object Form; `test:mysql` includes MySQL Object Form; etc. A combined Object Form job serializes three engines and fights the parallel CI design.

`run-e2e.mjs` already boots ephemeral API + Vite; projects only filter which specs run against that stack.

### 3.3 CI matrix (speed)

Prefer **three parallel CI jobs** over one job with `workers=3` on a shared API:

| Job | Command | Services |
|-----|---------|----------|
| e2e-pg | `npm run test:pg` (+ shared if desired) | `sample-pgsql` (+ SSL sample if SSL specs included) |
| e2e-mysql | `npm run test:mysql` | `sample-mysql` |
| e2e-sqlite | `npm run test:sqlite` | none (file DB) |

Wall clock ≈ max(job times), not sum — typically ~⅓ of a single serial full suite when jobs are balanced.

**Do not** raise `PLAYWRIGHT_WORKERS` on one shared ephemeral backend until each worker has isolated app state **and** unique object names (SQLite already uses unique files; PG/MySQL need unique DB/table names — already via `uniqueTestSuffix`). The skill/README still require caution: shared sample containers remain a flake source if names collide.

---

## 4. Directory / tagging layout

### Option A — folders (clearest for agents)

```text
e2e/tests/
  shared/                 # harness, theme, dirty-tab, AI, MCP
  pg/
    connections.spec.ts
    object-form-lifecycle.spec.ts
    object-form-edit-table.spec.ts
    object-form-schema-matview.spec.ts
    query-crud.spec.ts
    data-browser.spec.ts
    …
  mysql/
    object-form-lifecycle.spec.ts
    object-form-edit-table.spec.ts
    query-crud.spec.ts
    …
  sqlite/
    object-form-lifecycle.spec.ts
    object-form-edit-table.spec.ts
    query-crud.spec.ts
    …
```

Helpers/fixtures stay shared under `e2e/helpers/` and `e2e/fixtures/` with engine parameters where possible.

### Option B — tags (less moving files)

Keep current flat `tests/*.spec.ts`, annotate:

```ts
test.describe('Object Form SQLite edit table', { tag: ['@sqlite'] }, () => {
  // …
});
```

Projects filter with `grep: /@sqlite/`. Optional tags like `@object-form` may help search inside one engine, but they must **not** drive a cross-engine npm script.

**Recommendation:** Option A for new work; migrate existing specs incrementally. Tags can coexist during migration.

---

## 5. Isolation rules (non-negotiable)

Unchanged from e2e QA rules; restated for per-engine work:

1. Always run via `cd e2e && npm test` / `run-e2e` so `PLAYWRIGHT_API_URL` points at the ephemeral API.
2. Never target the developer’s Application Support SQLite or a daily `:8080` backend.
3. Every created connection/table/DB/view uses `uniqueTestSuffix(testInfo)`.
4. Wrap connection-creating tests with `withConnectionCleanup` (or Object Form `afterAll` cleanup that still runs on failure).
5. Object Form lifecycle/edit suites stay `test.describe.configure({ mode: 'serial' })` **within** an engine.
6. Parallelism is **across engines (jobs/projects)**, not across dependent Object Form steps.

---

## 6. Object Form completeness matrix (implement against this)

Legend: ✅ covered · ⚠️ weak assertion / partial · ❌ missing · n/a not in product UI for that engine.

### 6.1 Create / lifecycle

| Operation | PG | MySQL | SQLite |
|-----------|----|-------|--------|
| Create table + columns + PK | ✅ | ✅ | ✅ |
| Create table + FK | ✅ | ✅ | ✅ |
| Create with index | ❌ | ✅ | n/a (Indexes tab commented out) |
| Add column (edit) | ✅ | ✅ | ✅ |
| Create / edit / drop view | ✅ / ⚠️ | ✅ | ✅ |
| Create database | ✅ | ✅ | n/a |
| Schema + materialized view | ✅ | n/a | n/a |

### 6.2 Edit table (highest bug risk)

| Operation | PG | MySQL | SQLite |
|-----------|----|-------|--------|
| Set NOT NULL / default | ✅ | ✅ | ✅ |
| Drop column | ✅ | ✅ | ✅ |
| Rename table | ✅ | ✅ | ✅ |
| Change column type | ✅ | ✅ | ❌ |
| Column / table comment | ✅ | ✅ | n/a |
| Drop FK | ✅ | ✅ | ✅ |
| **Add FK on edit** | ❌ | ❌ | ✅ |
| Edit FK (actions / rename) | ❌ | ❌ | ❌ |
| Add / drop UNIQUE | ✅ | ✅ | ✅ |
| Add index on edit | n/a | ❌ (drop only today) | n/a |
| Generated / STRICT / WITHOUT ROWID / TEMP | ❌ | n/a | ❌ |
| Multi-column FK | ❌ | ❌ | ❌ |
| Deferrable FK | n/a | n/a | ❌ |

### 6.3 P0 backlog (same class as the SQLite recreate FK bug)

1. **PostgreSQL + MySQL: Add FK on edit** — assert preview contains real `ALTER … ADD CONSTRAINT … FOREIGN KEY` (or engine-equivalent), then execute.
2. **SQLite: change column type** — assert recreate DDL includes **all columns** + `INSERT INTO` + new type.
3. **Strengthen every SQLite recreate preview** — never assert only `/CREATE TABLE/i`.
4. **MySQL: Add index on edit** if Indexes tab is user-facing for edit.
5. FK edge cases ×3: ON UPDATE/DELETE, multi-column FK (once single-column add/drop is solid).

Update [`e2e-coverage-gap-report.md`](./e2e-coverage-gap-report.md) when each row flips to ✅.

---

## 7. Assertion standards (why coverage “missed” the FK bug)

### 7.1 Anti-pattern

```ts
// BAD — broken SQLite recreate still matches
await objectForm.assertPreviewContains(/CREATE TABLE/i);
```

Broken example that still passes that check:

```sql
CREATE TABLE "__tmp_ai_chat_messages" (
  FOREIGN KEY ("chat_id") REFERENCES "ai_chats" ("id"),
  CONSTRAINT "PRIMARY" PRIMARY KEY ("id")
)
```

### 7.2 SQLite recreate standard

For any edit that rebuilds a table (FK add/drop, column drop/type, many key changes), preview must match a shape like:

1. `CREATE TABLE "__tmp_…"` with **named data columns** (e.g. `"user_id"`, `"id"`)
2. `INSERT INTO "__tmp_…" (…) SELECT … FROM "original"` when data must be preserved
3. `DROP TABLE "original"`
4. `ALTER TABLE "__tmp_…" RENAME TO "original"`

Example fixture pattern (already used for SQLite add FK):

```ts
addForeignKey: /CREATE TABLE[\s\S]*"user_id"[\s\S]*FOREIGN KEY[\s\S]*INSERT INTO/i,
```

Prefer column names that exist in the scenario fixtures so the regex fails if columns were dropped from DDL generation.

### 7.3 PostgreSQL / MySQL ALTER standard

Assert the **specific** DDL fragment for the operation:

| Operation | Assert at least |
|-----------|-----------------|
| Add FK | `ADD CONSTRAINT` + `FOREIGN KEY` + target table |
| Drop FK | `DROP CONSTRAINT` / `DROP FOREIGN KEY` |
| Change type | `ALTER COLUMN … TYPE` / `MODIFY COLUMN` |
| Add UNIQUE | `ADD CONSTRAINT` + `UNIQUE` |

Execute must return HTTP 200; tree node for the table must still be visible afterward.

### 7.4 Backend unit tests for DDL helpers

UI e2e is slow; pure SQL builders should have table-driven Go tests (example: `extractTableNameFromDDL` case preservation). Rule of thumb:

- **Parser / name / merge bugs** → backend unit test first.
- **Form → preview → execute path** → e2e per engine.

---

## 8. Code structure patterns

### 8.1 Shared flow, thin per-engine wrapper

Prefer:

```ts
// helpers/objectFormEditFk.ts
export async function editTableAddForeignKey(
  page: Page,
  engine: 'postgresql' | 'mysql' | 'sqlite',
  args: { tableName: string; usersTable: string; fkName: string },
): Promise<void> {
  // shared UI steps; engine-specific preview regex from fixtures
}
```

```ts
// tests/sqlite/object-form-edit-table.spec.ts
test('Add foreign key on posts table', async () => {
  await editTableAddForeignKey(page, 'sqlite', { … });
});
```

Avoid three divergent copies of the same click sequence unless UI fields truly differ (MySQL index tab, PG comments, etc.).

### 8.2 Serial Object Form suites

Keep the proven pattern:

- `beforeAll`: browser context + unique names
- serial tests: connect → create → edit ops → cleanup
- `afterAll`: cleanup on failure + close context

Do **not** fold all engines into one serial file; that blocks parallel projects.

### 8.3 Independent specs elsewhere

Query CRUD, FK autocomplete, typed cells: one scenario per `test()`, own connection + cleanup, safe for future intra-engine workers.

### 8.4 Fixtures

| File role | Contents |
|-----------|----------|
| `*ObjectFormLifecycle.ts` | Field IDs, tab IDs, **preview regexes**, name factories |
| `dbConfigs.ts` | Connection configs per engine |
| `uniqueSuffix.ts` | Worker-safe suffixes |

Preview regexes are part of the contract — treat them as first-class coverage, not afterthoughts.

---

## 9. Migration plan (phased)

### Phase 0 — Document + scripts (this doc)

- [x] Write this guide
- [x] Remove obsolete `test:object-form` aggregate (Object Form lives inside each engine)
- [ ] Add `test:pg` / `test:mysql` / `test:sqlite` scripts (forward `--project` through `run-e2e.mjs` if needed)
- [ ] Add Playwright projects in `playwright.config.ts`
- [ ] Link from `e2e/README.md` and gap report

### Phase 1 — Close P0 Object Form gaps (completeness)

- [ ] PG: Add FK on edit + strong preview assert
- [ ] MySQL: Add FK on edit + strong preview assert
- [ ] SQLite: Change column type + recreate assert
- [ ] Tighten remaining SQLite recreate asserts (`dropColumn`, `setNotNull`, etc.)

### Phase 2 — Layout / CI speed

- [ ] Move or tag specs into per-engine projects
- [ ] CI matrix: three jobs
- [ ] Optional `shared` project for UI chrome

### Phase 3 — Deepen non–Object Form (only if product asks)

- [ ] MySQL/SQLite data-browser depth
- [ ] Import-export on one non-PG engine
- [ ] SQLite typed cells when product supports them

Each phase is independently shippable. Do not block P0 coverage on a folder move.

---

## 10. Implementing a new per-engine scenario (checklist)

```text
- [ ] Identify engine + operation in §6 matrix
- [ ] Prefer extending shared helper; only fork UI when fields differ
- [ ] uniqueTestSuffix + cleanup
- [ ] One assertable scenario per test(); test.step for readability
- [ ] Preview assert matches DDL shape for that engine (§7)
- [ ] confirmExecute succeeds; tree/UI sanity check
- [ ] cd e2e && npm test -- --project=<engine> … green
- [ ] Update §6 / gap report / e2e/README feature matrix
```

---

## 11. Anti-patterns

| Don’t | Do instead |
|-------|------------|
| One mega serial suite for all engines | Per-engine serial + parallel jobs |
| `test:object-form` aggregating PG+MySQL+SQLite | Object Form inside `test:pg` / `test:mysql` / `test:sqlite` |
| `workers>1` on shared mutable sample DBs without unique names | Unique names always; parallelize via CI jobs first |
| Assert only `/CREATE TABLE/i` on SQLite edits | Columns + INSERT + operation-specific fragment |
| Triple theme/AI/MCP tests | Keep in `shared` |
| Copy-paste 300-line helpers ×3 | Parameterize by engine |
| Run bare `npx playwright test` | Always `npm test` / `run-e2e` |
| Mark “Object Form SQLite exists” as complete | Mark operations in §6 ✅ only when asserted |

---

## 12. Local developer workflow

```bash
# Sample DBs (PG/MySQL)
docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql

cd e2e
cp .env.example .env   # once
npx playwright install chromium

# Fast loop while fixing SQLite Object Form
npm run test:sqlite -- tests/object-form-sqlite-edit-table.spec.ts

# Full engine after a driver change (includes that engine's Object Form + query CRUD + …)
npm run test:pg
npm run test:mysql
npm run test:sqlite
```

Until projects exist, pass the engine’s files explicitly — never a cross-engine Object Form bag:

```bash
npm test -- tests/object-form-sqlite-*.spec.ts
npm test -- tests/object-form-postgres-*.spec.ts
npm test -- tests/object-form-mysql-*.spec.ts
```
---

## 13. Definition of done for “per-engine e2e”

The suite is “done enough” for a release gate when:

1. §6.2 P0 rows are ✅ for all engines that support the operation.
2. SQLite recreate paths use strong preview asserts (§7.2).
3. `test:pg`, `test:mysql`, and `test:sqlite` each pass in isolation.
4. CI runs those three in parallel (or equivalent projects).
5. Shared UI chrome is not duplicated ×3.
6. Gap report last-audited date and matrices match reality.

---

## 14. Historical lesson (SQLite add FK)

Root cause: `extractTableNameFromDDL` uppercased the table name; quoted `PRAGMA table_info("NAME")` is case-sensitive → empty columns → recreate DDL with only FK/PK.

Why e2e missed it:

- Lifecycle **created** tables with FK already present (no edit-add path).
- Edit suite only **dropped** FK.
- Preview used `/CREATE TABLE/i`.

Fix pattern for the future: **operation coverage** + **DDL-shape asserts** + **unit tests for parsers**.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-20 | Initial per-engine implementation guide (architecture, matrices, assertion standards, migration phases). |
| 2026-08-20 | Drop `test:object-form` aggregate; Object Form is deep coverage inside each engine project only. |
