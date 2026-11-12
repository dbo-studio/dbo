# Frontend performance: current state, fixes, benchmarks, verification

Status: baseline not yet measured. Every "Observed" statement below comes from reading the code on 2026-11-12 (branch `khodemobin/improve-design`) and a production build. Nothing here is a measurement until the benchmark tables in section 4 are filled in.

Scope: `frontend/` (React 19, React Compiler, Zustand, TanStack Query/Virtual, Monaco, MUI, Tauri webview). Three load cases drive this plan: a very large object tree, very large result tables, and a very long AI chat. The SQL editor and bundle size are included because they sit on the same hot paths.

A webview UI cannot match a GPU-native UI such as GPUI. The goal is smaller: the browser only ever holds what is on screen, and no user action costs O(total data).

## 1. What we have

### Already good (keep)

- React Compiler is enabled (`vite.config.ts`), so manual memoization is mostly unneeded.
- Zustand reads use selectors (about 585 selector reads against 3 whole-store reads).
- Data grid rows are virtualized (`useDataGridVirtualization`); row and cell components are memoized; row state uses `Set`/`Map` lookups (`useRowStateLookup`).
- Object tree is flattened and virtualized; children load lazily per node; search runs on the server.
- AI chat streaming is tuned: `MessageBlock` is memoized, markdown is split into a stable and a pending part, each chat has its own `AbortController`.
- Listener and observer cleanup is consistent. One `EventSource`, no unbounded polling.
- Closing a tab clears its IndexedDB data (`useRemoveTab` -> `clearTabData`).

### How the three load cases behave today

| Case | Virtualized | Paged or lazy | Main risk at scale |
| --- | --- | --- | --- |
| Tree | yes (overscan 12) | children per node | O(n) store rebuild on every expand |
| Table | rows only | server pages, default 100 rows | overscan, no column virtualization, IndexedDB writes |
| Chat | no | "load more" after 10 messages | per-token renders, unvirtualized list |

### Bundle (production build, measured)

| Chunk | Raw | Gzip |
| --- | --- | --- |
| `index` (entry) | 2.9 MB | 877 KB |
| `CustomIcon` (all lucide icons) | 1.27 MB | 346 KB |
| `editor.api` (Monaco) | 2.7 MB | 691 KB |
| `ts.worker` | 6.8 MB | 1.4 MB |
| PWA precache total | 26.8 MB (335 entries) | n/a |

## 2. What to fix

Priority is impact on the three load cases first. Each item lists the owner file and the fix. IDs are used by the benchmark and verification tables.

### High

**P1. IndexedDB `saveRows` is slow and runs too often.**
`frontend/src/core/indexedDB/indexedDB.service.ts` `saveRows`.
Deletes every row of the tab with a cursor, then awaits one `put` per row in a serial loop. The `debouncedSave*` helpers in `core/utils/indexedDbHelper.ts` are not debounced. `updateRow` rewrites the whole result set per cell edit. A query run writes the rows twice (`updateRows` in `dataRow.slice.ts`, then `debouncedSaveToIndexedDB` at `dataQuery.slice.ts:196`).
Fix: issue puts without awaiting each one and await `tx.done` once; write only the changed row in `updateRow`; remove the duplicate save; debounce for real. Apply the same to the edited, removed, unsaved and selected row savers.

**P2. Grid cache wiped on restore (CONFIRMED by e2e).**
`frontend/src/store/dataStore/data.store.ts:47`. `loadDataFromIndexedDB` calls `updateRows([])` first, which persists an empty set and wipes the stored rows, and then reads IndexedDB. Confirmed by `e2e/tests/sqlite/grid-persistence.spec.ts`: after a reload the grid shows "No results yet", rows and unsaved edits are gone. Restore never finds rows. This is a behavior change when fixed (grid comes back after reload), so it needs a product decision first.
Fix: read IndexedDB first, clear in-memory state without persisting.

**P3. Every SQL editor keystroke writes to IndexedDB and fires `onChange` twice.**
`frontend/src/routes/Query/Query.tsx:173` and `frontend/src/components/base/SqlEditor/SqlEditor.tsx:81,171`.
`handleUpdateState` calls `setValue` (re-renders the Query route) and `updateQuery` (one IndexedDB transaction) per keystroke. `onChange` is wired from both `onDidChangeModelContent` and the `<Editor onChange>` prop; the one from `onMount` compares against a stale `value`. `useInlineAITrigger` and `useSqlValidation` read `editorRef.current` during render and get `null` until a later re-render.
Fix: one change path; debounce the IndexedDB write (about 300 ms); hold the editor instance in state.

**P4. Bundle size.**
`CustomIcon.tsx:4` imports the whole lucide `icons` map. `main.tsx` does `import * as monaco from 'monaco-editor'` eagerly. Unused Monaco workers (ts, css, html) are precached. Recharts symbols appear in the entry chunk. Only 5 `lazy()` calls exist; Settings, Backup, Dashboard, Question and others are eager in `PanelItem.tsx`.
Fix: named or generated icon imports; import only `editor.api` plus sql/json languages; exclude unused workers from the PWA precache; find the eager recharts importer; lazy-load heavy routes.

**P5. Tree store does O(total nodes) work per action.**
`frontend/src/store/treeStore/tree.store.ts`, `ObjectTreeView/ObjectTreeView.tsx`, `ObjectTreeView/flattenTree.ts`.
`setNodeChildren` rebuilds the whole tree recursively on each expand. `expandedNodes` is an array (`includes`, spread). `flattenTree`, the `contentWidth` reduce and `rowIndex` (`findIndex`) are O(n) and re-run per change. `reloadTree` refetches loaded parents serially. A folder with thousands of children has only a cap, no paging.
Fix: normalized `Map<id, node>` plus `childIds`; `expanded` as a `Set`; `Map<id, index>` built once per flatten; parallel reload with a concurrency cap (about 6); paged children from the server for large folders.

### Medium

**P6. Grid DOM weight.** Overscan is `max(30, visibleRows x 3)`, so 100+ rows are mounted, each cell with its own hooks. No column virtualization. Cell display strings are recomputed per render and long values are not truncated.
Fix: overscan about 8-10; column virtualization; truncate long values in the cell and load the full value on open.

**P7. AI streaming writes the store and re-renders per token.** `useAiStream.ts`, `useAiSession.ts`. Each delta creates a new `sessions` object; `previewContent` is concatenated (O(n^2) over a long answer); `useAiSession()` returns the whole session.
Fix: buffer deltas and flush once per animation frame; narrow selectors so only the live preview subscribes to `previewContent`.

**P8. Shiki runs every frame while code streams.** `StreamingPreview.tsx`, `SyntaxHighlighter.tsx`. No cancel flag, so late results can overwrite newer HTML.
Fix: plain `<pre>` while streaming, highlight once at the end; add a cancel flag.

**P9. Chat list is not virtualized and heavy blocks mount eagerly.** `Messages.tsx`. Also `lastTurn.includes(message)` per block, and tool results with thousands of rows are stored whole in message text.
Fix: dynamic-measure virtualization with the last turn always mounted; `content-visibility: auto` as a first step; truncate stored tool results and fetch detail on demand.

**P10. `ChatMarkdown` segment keys remount DOM.** `getSegmentKey` includes content length and a `JSON.stringify` of the first table row. Use the segment index.

**P11. Wide `tabs` subscriptions.** `useSelectedTab`, `useConnectionTabs` subscribe to the whole `tabs` array and re-render on any tab mutation. Select by id or use `useShallow`.

### Low

- **P12.** `AppFooter.tsx:57` `useBrowseStatusStore()` has no selector.
- **P13.** The data store uses `devtools`; with Redux DevTools open it serializes all rows on each `set`. Disable for the data store.
- **P14.** Only the selected tab is mounted, so switching tabs remounts Monaco and the grid. Consider `Activity` for the last few tabs if switching feels slow.
- **P15.** `useShortcut` adds one `window` keydown listener per call site (23) and re-subscribes when `callback` is unstable. One central dispatcher is cleaner.

## 3. Principles for every change

1. One fix per commit. Each commit leaves the app working and all affected e2e specs green.
2. Measure before and after with the same fixtures, same machine, same build mode. No change is declared a win without a number.
3. No behavior change unless the item says so (P2 is the only item that may change behavior, and only after confirmation by test).
4. Keep the layering rules in `frontend/AGENTS.md` (base / common / layout / routes / store).
5. Frontend tests are e2e only (`frontend/AGENTS.md`). Benchmarks are Playwright specs under `e2e/`, not Vitest.

## 4. Benchmarks

### 4.1 Fixtures

Create once, reuse for every run. Generated by script, never committed as data.

| Fixture | Shape | Used for |
| --- | --- | --- |
| `perf_wide` | 50,000 rows x 100 columns, mixed types incl. long text and JSON | table, IndexedDB, grid DOM |
| `perf_tall` | 1,000,000 rows x 10 columns | paging, memory |
| `perf_schema` | 100,000 tables across 200 schemas (SQLite or PG), one folder with 5,000 children | tree |
| `perf_chat` | seeded chat with 500 messages: text, SQL diffs, tool calls, 20 result tables of 1,000 rows | chat |
| `perf_stream` | scripted SSE stream: 3,000 tokens over 20 s, plus one 400-line SQL code block | streaming |

Chat and stream fixtures use a mock AI provider in the e2e backend so runs are deterministic.

### 4.2 Metrics and how each is measured

| Metric | Tool | Notes |
| --- | --- | --- |
| Interaction latency (ms) | `performance.now()` around a user action in a Playwright test, median of 15 runs, p95 reported | action to next paint (`requestAnimationFrame` x2) |
| Frame time while scrolling (ms) | Chrome tracing via Playwright CDP, or `PerformanceObserver` for `long-animation-frame` | report p95 and count of frames over 50 ms |
| React commits and render time | React Profiler API in a dev-only harness, or `why-did-you-render` counts | count commits per action |
| JS heap (MB) | CDP `Performance.getMetrics` (`JSHeapUsedSize`) after forced GC | steady state and peak |
| DOM node count | `document.getElementsByTagName('*').length` | per load case |
| IndexedDB write time (ms) | timer around `indexedDBService` calls, logged in a perf build | per operation |
| Bundle size | `vite build` output, raw and gzip | track per chunk |
| Cold start (ms) | navigation timing to app-ready (boot splash removed) | cached and uncached |

Rules: production build (`vite build` + preview), Chromium headless via the existing Playwright setup, same machine, 3 warm-up runs discarded, report median and p95, record hardware and commit SHA. Keep a debug build for the profiler only.

### 4.3 Scenarios

| ID | Scenario | Measures |
| --- | --- | --- |
| B1 | Run query returning 50k x 100 (`perf_wide`), time to first rows visible | latency, heap, IndexedDB write ms |
| B2 | Scroll the grid top to bottom at constant speed | frame p95, long frames, DOM nodes |
| B3 | Edit one cell on a 50k-row result | latency, IndexedDB write ms |
| B4 | Type 200 characters in the SQL editor at 30 ms intervals | commits, IndexedDB transactions, latency |
| B5 | Expand a folder with 5,000 children in `perf_schema` | latency, commits |
| B6 | Expand 200 folders, then reload the tree | latency, request count |
| B7 | Keyboard-navigate 1,000 tree rows | frame p95 |
| B8 | Open `perf_chat`, scroll to top and back | latency, DOM nodes, heap |
| B9 | Stream `perf_stream` | commits per second, long frames, Shiki calls |
| B10 | App cold start | cold start ms, entry gzip |
| B11 | Open and close 30 tabs | heap growth, IndexedDB size |

### 4.4 Baseline (before) - to fill

Commit SHA: `ac185d79` plus uncommitted work. Machine: Apple M5 Pro, Chromium headless, production build served by `vite preview`, SQLite engine. 2 runs, median shown (p95 not meaningful at n=2; raise runs before comparing close results). Harness: `e2e/tests/sqlite/perf-baseline.spec.ts` (`PERF=1`, `E2E_PREVIEW=1`, `E2E_PREVIEW_DIR=<dist>`).

Finding: the app pages results at 100 rows (`shown: 100 rows`), so a 50k-row query loads 100 rows x 100 columns = about 24.8k DOM nodes. B1/B2 measure that page, not 50k rows in memory. Large-table cost is column count (no column virtualization), not row count.

| ID | Metric | Before (median) | Before (p95) |
| --- | --- | --- | --- |
| B1 | time to first rows (ms) | 862 | n/a |
| B1 | JS heap after GC (MB) | 94.6 | n/a |
| B1 | IndexedDB write (ms, 11 transactions) | 529 | n/a |
| B2 | frame p95 (ms) | 17 (0 frames over 50 ms) | 17 |
| B2 | DOM nodes | 24,788 | n/a |
| B3 | edit latency (ms, includes double-click delay) | 480 | n/a |
| B3 | IndexedDB write (ms, 4 transactions) | 26 | n/a |
| B4 | React commits | not measured | |
| B4 | IndexedDB transactions (200 chars) | 400 (2 per keystroke) | n/a |
| B5 | expand latency (ms) | | |
| B6 | expand + reload latency (ms) | | |
| B7 | frame p95 (ms) | | |
| B8 | DOM nodes | | |
| B8 | JS heap (MB) | | |
| B9 | commits per second | | |
| B9 | long frames | | |
| B10 | cold start (ms) | | |
| B10 | entry gzip (KB) | 877 | n/a |
| B11 | heap growth (MB) | | |

### 4.5 Results (after) - to fill per change

| Change | IDs | Before | After | Delta | Commit |
| --- | --- | --- | --- | --- | --- |
| P1 | IndexedDB write of N rows (in-browser microbench, Chromium, 20 columns) | 10k rows 291 ms, 50k rows 1514 ms (await per put) | 10k rows 95 ms, 50k rows 487 ms (queued puts) | -67% | rows saved once per query instead of twice. At the default 100-row page the gain is under 5 ms; it matters when the page limit is raised |
| P3 | B4 (IndexedDB transactions for 200 chars) | 400 | 1 | -99.8% | see git log |
| P4 | B10 | | | | |
| P5 | B5, B6, B7 | | | | |
| P6 | B1, B2 | first rows 862 ms, heap 94.6 MB, 24,812 DOM nodes, scroll p95 17 ms | 154 ms, 39.3 MB, 3,484 nodes, 17 ms | -82% time, -58% heap, -86% DOM | column virtualization for grids over 30 columns |
| P7, P8 | B9 | | | | |
| P9 | B8 | | | | |

Targets (to confirm after the baseline): no interaction over 100 ms at p95; scroll frames under 16 ms at p95 on `perf_wide`; entry chunk under 500 KB gzip; typing in the editor causes no more than one IndexedDB transaction per 300 ms.

## 5. Verifying the app still works

The risk is regressions in data handling (rows, edits, persistence) and in state shared across stores. Every change must pass these gates before merge.

### 5.1 Gates per change

1. `cd frontend && npm run lint && npm run types` (React Compiler lint included).
2. Affected e2e specs (table below), run with `cd e2e && npm test -- tests/<path>`.
3. Perf scenario for the item, compared against the baseline.
4. Manual smoke, section 5.3, on the web build.
5. Before release: full e2e for all engines in CI (`.github/workflows/e2e.yml`) and `npm run check:coverage`.

### 5.2 Existing e2e specs that guard each area

Specs live in `e2e/tests/`. Per-engine suites exist for `pg`, `mysql`, `sqlite`, `mssql`, `clickhouse`, `redis`, `mongo`; shared ones are in `shared/`.

| Area / change | Specs to run |
| --- | --- |
| P1, P2, P6 (grid, IndexedDB) | `shared/data-grid-typed-cells.spec.ts`, `shared/data-grid-fk-autocomplete.spec.ts`, `shared/workspace-dirty-tab.spec.ts`, `shared/tab-query-persistence-migration.spec.ts`, per-engine data-grid and `report-filters` specs, `shared/split-view.spec.ts` |
| P3 (SQL editor) | `shared/query-format.spec.ts`, `shared/editor-context.spec.ts`, `shared/keyboard-shortcuts.spec.ts`, `shared/saved-history.spec.ts`, `shared/tab-query-persistence-migration.spec.ts` |
| P4 (bundle, icons, lazy routes) | `shared/harness-smoke.spec.ts`, `shared/onboarding.spec.ts`, `shared/settings-theme.spec.ts`, `shared/database-diagram.spec.ts`, `shared/bottom-panels.spec.ts`, all routes opened once |
| P5 (tree) | `shared/fixture-browse.spec.ts`, `shared/workspace-tab-reorder.spec.ts`, per-engine tree and browse specs |
| P7-P10 (chat) | `shared/ai-chat-panel.spec.ts`, `shared/ai-chat-cancel.spec.ts`, `shared/ai-setup.spec.ts` |
| P11 (tabs) | `shared/workspace-tab-reorder.spec.ts`, `shared/workspace-dirty-tab.spec.ts`, `shared/split-view.spec.ts` |
| Auth and permissions (any store change) | `npm run test:auth` |

### 5.3 New regression tests to add before changing code

These cover behavior that is currently untested and that the fixes touch. Write them first, run them green on current code, then change the code.

| Test | Guards |
| --- | --- |
| Run a query, reload the page, the grid shows the same rows (and edited, removed, unsaved row markers) | P1, P2 |
| Edit a cell, discard, rows restore; edit, save, row persists | P1 |
| Type a query, reload, the query text is restored; type fast then close the tab immediately, no text loss | P3 |
| Tree: expand, collapse, expand restores descendants; rename keeps pin; reload keeps expanded folders | P5 |
| Tree search shows hits from unopened folders and restores state when cleared | P5 |
| Chat: stream a mock answer with prose, a code block and a table; final render equals pre-change render; cancel mid-stream leaves no live block | P7-P10 |
| Chat: switch chats during a stream; the other chat keeps streaming | P7 |
| Open 30 tabs, close all, IndexedDB `rows` store is empty for them | P14, B11 |

### 5.4 Manual smoke checklist (web and desktop)

- Connect, open tree, expand folders, search, pin, rename.
- Open a table, scroll, sort, filter, edit a cell, save, discard.
- Run a query, edit the query, reload, confirm text and result restore.
- Split view with two data tabs; each keeps its own rows.
- AI chat: send a message, stream, cancel, retry, switch chats, load more.
- Export, import, backup page, settings page, diagram, dashboard.
- Desktop: confirm the sidecar migrates the installed app's real database, so isolate `HOME` first (see the project note on desktop dev).

### 5.5 Rollback

Each fix is its own commit. If a gate fails and the cause is not clear within one iteration, revert that commit; do not stack fixes on a failing change.

## 6. Rollout order

1. Add the fixtures, the perf harness and the section 5.3 regression tests. Record the baseline (section 4.4). P2 confirmed; first test file `e2e/tests/sqlite/grid-persistence.spec.ts` (4 tests, green on current code, pins P2 behavior).
2. P1 and P6 overscan (largest table gain, small diffs).
3. P3 and P4 (typing path and startup).
4. P5 (tree store normalization), then P11.
5. P7, P8, P10, then P9 (chat).
6. Low items, then fill section 4.5 and publish the summary.

Exit criteria: all section 4.5 targets met or each miss explained, all gates green, no open regression, baseline and final tables committed in this file.

## 7. Not covered

Backend and Tauri sidecar performance, Redis/Mongo browse views, the dashboard and agent workspace routes, and mobile layouts were not reviewed. Add them after the first pass.
