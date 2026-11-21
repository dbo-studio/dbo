# E2E coverage gaps

Living notes for what is **not** fully automated yet and known guard failures. The authoritative inventory of spec files is [`e2e/SPEC-CATALOG.md`](../e2e/SPEC-CATALOG.md). Suite-to-engine requirements are in [`e2e/coverage/capabilities.mjs`](../e2e/coverage/capabilities.mjs); run `cd e2e && npm run check:coverage`.

## Accepted out of automated e2e

See [`e2e/README.md`](../e2e/README.md): real LLM provider streams; Tauri/native file dialogs (manual release checklist).

## CI scope

- `npm run test:auth` exercises auth scenarios but is **not** in default CI yet.
- NoSQL capability tags: `check-coverage` requires every `contract.Capability` / `ToolID` on Redis and Mongo drivers to appear on at least one spec header line (`// @cap: … @tool: …`). Fix failing tags in `e2e/tests/mongo/*.spec.ts` when the guard reports GAPs.

## Matrix vs files

The feature matrix in [`e2e/README.md`](../e2e/README.md) lists **scenario groups** and flagship flows. It is not one row per spec file (~270 specs). Use `SPEC-CATALOG.md` to see every file.

## Shared SQL suites on sqlite

- **Background jobs:** `sqlite/background-jobs.spec.ts` calls `defineBackgroundJobsTests("sqlite")` (plus `sqlite/background-queries.spec.ts` for extra edge cases).
- **Dashboard sharing (API):** `sqlite/dashboard-sharing.spec.ts` calls `defineDashboardSharingTests("sqlite")` (UI share links: `sqlite/dashboard-share.spec.ts`).