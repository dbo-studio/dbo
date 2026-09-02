---
name: e2e-playwright
description: >-
  Write, review, and debug DBO Studio Playwright e2e tests like a QA team.
  Covers ephemeral stack (run-e2e), POM/helpers/fixtures, unique names, always-run
  cleanup, locators, and Trace Viewer debugging. Use when editing e2e/, adding
  Playwright specs, fixing flaky UI tests, or the user mentions e2e, Playwright,
  object-form tests, or QA flows.
---

# DBO E2E / Playwright (QA Workflow)

## Quick Start

1. Read [`e2e/README.md`](../../../e2e/README.md) and follow `.cursor/rules/e2e-qa.mdc`
2. Mirror an existing similar spec (connections vs object-form lifecycle)
3. Implement: fixture names → POM methods → helper flow → `test.step` spec → cleanup
4. Run on the **host OS** (Shell `required_permissions: ["all"]`, never sandbox): `cd e2e && npm test -- tests/<file>.spec.ts`
5. On failure: open HTML report / Trace Viewer under `e2e/test-results/`

## Stack (always)

```
npm test → scripts/run-e2e.mjs
  → start-stack (random API + Vite, APP_DATABASE_PATH in temp dir)
  → playwright test
  → teardown
```

- Do **not** assume `localhost:8080` / `3000` are the e2e targets.
- Sample DBs: `docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql`
- Hosts/ports: `e2e/.env` (see `.env.example`) — `127.0.0.1`, not Docker DNS names.

## QA writing checklist

```
- [ ] Feature matrix row planned (user flow, not implementation detail)
- [ ] uniqueTestSuffix(testInfo) for all created resources
- [ ] withConnectionCleanup(page, connectionName, …) around the body
- [ ] Object drops / DB cleanup in try/finally for lifecycle specs
- [ ] test.step names readable as a manual QA script
- [ ] Locators: role → label → testid (never raw CSS class hashes)
- [ ] await expect(locator).… web-first assertions only
- [ ] npm test -- tests/<spec>.spec.ts green
- [ ] e2e/README.md matrix updated
```

## Where code goes

| Need | Put it in | Example |
|------|-----------|---------|
| Click / fill / assert one screen | `pages/*.ts` | `ConnectionPage.createConnection` |
| Multi-step domain flow | `helpers/*.ts` | `createUsersTable`, `cleanupPostgresLifecycle` |
| Names / engine config / tables | `fixtures/*.ts` | `getDbConfig`, `postgresLifecycleNames` |
| Always-run connection teardown | `helpers/safeCleanup.ts` | `withConnectionCleanup` |
| Scenario script | `tests/*.spec.ts` | `test.step` sequence only |

## Patterns to copy

**Independent smoke** — `tests/harness-smoke.spec.ts`, `tests/connections.spec.ts`

**Lifecycle with cleanup on failure** — `tests/object-form-postgres-lifecycle.spec.ts`:

```ts
await withConnectionCleanup(page, names.connectionName, async () => {
  try {
    await test.step('…', async () => { /* … */ });
    await test.step('Cleanup', async () => {
      await cleanupPostgresLifecycle(page, names);
    });
  } catch (err) {
    try {
      await cleanupPostgresLifecycle(page, names);
    } catch (cleanupErr) {
      console.warn('[e2e] cleanup after failure:', cleanupErr);
    }
    throw err;
  }
});
```

**Object Form query fields** — use `ObjectFormPage.fillGeneralQueryField` (Zustand DEV store). Do not reintroduce Monaco-only fills for general query fields.

## Debugging failures

1. Read list reporter step that failed
2. Open screenshot / video under `e2e/test-results/`
3. `npx playwright show-trace e2e/test-results/.../trace.zip`
4. Prefer fixing product `data-testid` / role labels over brittle locators
5. If tree/autocomplete hangs: sample DB may be polluted with orphan `e2e_*` objects — use unique names; do not point at personal app DB

## Do NOT

- Run Playwright in the Cursor sandbox — always Shell `required_permissions: ["all"]` (see `.cursor/rules/e2e-host-os.mdc`)
- Run Playwright without `run-e2e` / `npm test`
- Truncate or reset the developer's daily DBO instance
- Add `waitForTimeout` or raise retries to hide flakes
- Put business flow logic in specs or selectors in fixtures
- Parallelize (`workers>1`) until per-worker DB isolation exists
- Add unit/integration tests under `frontend/` or `backend/` — e2e is the only new automated coverage

## Playwright essentials

Condensed best practices: [`reference-playwright.md`](reference-playwright.md) (from [playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)).
