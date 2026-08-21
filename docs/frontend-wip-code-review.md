# Frontend WIP Code Review

**Branch:** `khodemobin/dbo-135-context-menus-data-grid-must-actions`  
**Date:** 2026-08-21  
**Scope:** Editor session context (`core/db`, sync hooks, Query leading), related AI auto-context wiring, e2e context-menus + editor-context specs.

**Out of scope for this PR commit:** `docs/prd/**`, `docs/e2e-*.md`, `.cursor/settings.json`, and the broader AI streaming stack (except the WIP line in `useAiAutoContext`).

---

## 1. Executive summary

The new `resolveEditorContext` layer is directionally correct: pure function, engine capabilities, gap-fill cascade, and unit tests. Cross-connection sibling tab leakage is already fixed via `siblingObjectNodeIds` + `matchConnectionId`.

Before merge, fix these High issues:

1. Locking database change with empty schema blocks catalog/`public` fill.
2. `parseObjectNodeId` does not match backend `ExtractNode` for 1–2 segment IDs.
3. AI auto-context keeps stale DB/schema via `||` fallback.
4. e2e Safe Mode bypasses POM and uses `force` / fixed sleeps; editor lock test is weak.

Security: no new Critical/High XSS or auth issues in this diff. Markdown remains text-safe (`react-markdown` without `rehype-raw`).

---

## 2. Architecture (current)

```text
focusedNodeId (tree)
siblingObjectNodeIds (same connection)
connectionDatabase / lastUsed / autocomplete catalog
        │
        ▼
  resolveEditorContext (pure)
        │
        ▼
  EditorTab.database / schema / contextLocked / contextSource
        │
        ├──► getEditorSessionContext()
        │         ├── runRawQuery / autocomplete
        │         ├── inline AI provider
        │         └── useAiAutoContext → aiStore.context
        └──► QueryEditorLeading selects (manual lock)
```

| Piece | Role | Status |
|-------|------|--------|
| `core/db/resolveEditorContext.ts` | Pure resolver | Good; keep |
| `core/db/engineCapabilities.ts` | PG/MySQL/SQLite UI + fill rules | Good |
| `core/db/parseObjectNodeId.ts` | Tree nodeId → DB/schema | **Mismatch with backend** |
| `siblingObjectNodeIds.ts` | Connection-scoped siblings | Fixed / good |
| `useSyncEditorContext.ts` | Apply resolve to unlocked (and stale-drop locked) tabs | Good; watch deps |
| `useEditorSessionContext.ts` | Session getter for callers | Good; placement under `hooks/` is awkward |
| `QueryEditorLeading.tsx` | Manual DB/schema + lock | **Lock-on-DB bug** |

---

## 3. Findings by severity

### Critical / High

#### H1 — Lock with empty schema after database change

**Where:** `frontend/src/routes/Query/QueryEditorActionBar/QueryEditorLeading/QueryEditorLeading.tsx` (`handleDatabaseChange`)

**Problem:** Sets `database`, `schema: ''`, `contextLocked: true`. Locked path in `resolveEditorContext` does not gap-fill from catalog / `preferredSchema` (`public`). User is stuck with empty schema; queries and AI get incomplete context.

**How to fix (summary):**

- Prefer: on database change only, set `contextLocked: false` (or leave unlocked) so the next sync can fill schema from catalog / engine default, then lock when the user explicitly picks a schema.
- Or: after DB change, if engine has `preferredSchema` and it exists in catalog, set schema to that value in the same update, then lock.
- Or: lock only in `handleSchemaChange`; database change clears schema but stays unlocked until schema is chosen or autofilled.
- Extend unit/e2e: change DB → expect schema autofilled (e.g. `public`) without manual schema pick.

---

#### H2 — `parseObjectNodeId` ≠ backend `ExtractNode`

**Where:** `frontend/src/core/db/parseObjectNodeId.ts` vs `backend/internal/database/core/helpers.go` (`postgresqlNode`, `mysqlNode`)

**Problem:** Parser is engine-agnostic. Backend rules:

| Engine | Segments | Backend meaning |
|--------|----------|-----------------|
| PostgreSQL | 1 | database |
| PostgreSQL | 2 | database + schema |
| PostgreSQL | 3 | database + schema + table/object |
| MySQL | 1 | database |
| MySQL | 2 | database + table |
| SQLite | any | table (no DB/schema) |

Frontend today treats 2 segments as `database + objectName` (schema empty) and 1 segment as `objectName` only → `fromNodeId` returns null for bare database nodes. Tree focus on DB/schema nodes often fails to autofill.

**How to fix (summary):**

- Change signature to `parseObjectNodeId(engine, nodeId)` (or pass capabilities).
- Mirror backend switch per engine; keep container suffixes (`tableContainer`, etc.).
- Thread `engine` through `fromNodeId` / `resolveEditorContext` (already has `input.engine`).
- Add table-driven unit tests next to `resolveEditorContext.test.ts` covering PG/MySQL/SQLite + containers.
- Re-check ObjectForm / `buildObjectDefinitionSummary` callers after signature change.

---

#### H3 — Stale AI context via `||`

**Where:** `frontend/src/components/common/AiChatPanel/hooks/useAiAutoContext.ts`

**Problem:**

```ts
nextContext.database = session.database || context.database;
nextContext.schema = session.schema || context.schema;
```

Empty/`undefined` from session (correct for SQLite or cleared context) keeps previous AI `contextOpts` → wrong tools/chat binding after connection/engine switch.

**How to fix (summary):**

- Assign directly from `getEditorSessionContext()`:

```ts
nextContext.database = session.database;
nextContext.schema = session.schema;
```

- When not on a Query tab, clear or leave AI DB/schema according to product rules (do not resurrect old values with `||`).
- Optionally reset `manualOverrideRef` on connection/tab change so auto table add works again.

---

#### H4 — e2e Safe Mode / sleeps / weak lock coverage

**Where:**

- `e2e/tests/data-grid-context-menus.spec.ts` (Safe Mode step)
- `e2e/pages/DataGridPage.ts` (`wait(300)`)
- `e2e/tests/editor-context.spec.ts` (“Manual schema change stays locked”)

**Problems:**

- Safe Mode uses inline locators instead of `SafeModePage.selectMode` (which waits for API + toast).
- Cell open uses `force: true` (hides overlay/menu issues).
- Fixed `wait(300)` violates e2e-qa (prefer UI/network assertions).
- Lock step re-selects the same `public` schema — does not prove lock against autofill.

**How to fix (summary):**

- Call `safeMode.selectMode(...)` (or equivalent POM that waits for update).
- Open context menu via existing POM helpers without `force` unless a documented overlay requires it.
- Replace new sleeps with `expect(...).toBeVisible()` / response waits.
- Lock test: select a **non-default** schema (or create one), trigger sync (tree focus / reopen editor), assert schema unchanged and still locked.

---

### Medium

| ID | Topic | Where | How to fix (summary) |
|----|--------|--------|----------------------|
| M1 | Mixed PR scope | Branch mixes context-menus + editor-context | Split PRs or document both clearly in PR body; do not commit `docs/prd/**` / gap reports / `.cursor/settings.json` with product code |
| M2 | Session getter under `hooks/` | `useEditorSessionContext.ts` used from stores/helpers | Move pure `getEditorSessionContext` to `@/core/db` (or store helper); keep React hook as thin wrapper |
| M3 | setState during render | `QueryEditorLeading` local DB/schema sync | Prefer `key={tabId}` remount, or sync in `useEffect`, or derive display values from tab when not mid-edit |
| M4 | Persist map growth | `editorContextByConnection` in settingStore | Prune entry when connection is deleted; optional `partialize` if other settings should not grow unbounded |
| M5 | Tree only gap-fills | `resolveEditorContext` + tree wiring | Product decision: document “gap-fill only” or implement overwrite when unlocked + focused node changes; align e2e expectations |
| M6 | Design system mix | `QueryEditorLeading` heavy `sx` on `Stack` | Move layout to colocated `*.styled.ts` matching Query action bar patterns |
| M7 | `contextSource` attribution | gap-fill in resolve | Set source to the candidate that last changed a field; cover in unit tests |

---

### Low

| ID | Topic | How to fix (summary) |
|----|--------|----------------------|
| L1 | Extra barrel types barely used outside package | Keep for public API of `core/db` or export only used symbols |
| L2 | `wait(300)` elsewhere in DataGridPage | Gradually replace with menu/grid assertions |
| L3 | No unlock UI after manual lock | Add “reset context” / unlock control, or unlock on new Query tab only (document behavior) |
| L4 | Unknown engine → both capabilities false | When adding engine aliases, map them in `engineCapabilities` |

---

## 4. Review dimensions checklist

### Code style

- Matches frontend Prettier/ESLint conventions in new `core/db` files.
- Prefer early returns already used in resolve; keep that style.
- Avoid `console.debug` noise if any appears in related AI paths (pre-existing).

### Naming (files / folders / variables)

- `PascalCase` components, `camelCase` functions — OK.
- `core/db/` fits existing `core/` layout.
- Prefer renaming confusing ChatContext folder pairs only if touching AI UI in a follow-up (out of scope here).

### Security

- Sibling cross-connection leak: **fixed** (`siblingObjectNodeIds`).
- No credential logging in this WIP.
- AI markdown: no raw HTML pipeline in current stack; optional hardening later (`rel="noopener noreferrer"` on links).
- Persisted `editorContextByConnection` stores names only (acceptable for desktop single-user).

### Dead code

- Locked branch inside `resolveEditorContext` is used by sync (stale-drop while locked) — not dead.
- Duplicate `connectionDatabase` was extracted to `core/db/connectionDatabase.ts` — good.
- Do not ship untracked roadmap docs with this feature.

### Performance

- Sync effect deps still include whole `selectedTab` / `catalog` object identity — acceptable short-term; stabilize catalog reference in `Query.tsx` if profiling shows churn.
- Narrow AI `streaming` subscriptions is a separate AI-panel follow-up.

### Bugs

- See H1–H3 (product bugs) and H4 (test gaps that hide product bugs).

### Implementation approach

- Pure resolver + React sync hook is the right split; keep it.
- Gap-fill vs overwrite must be an explicit product rule (M5).
- Engine-aware parsing belongs next to capabilities, not as a generic string split.

### Large components

- `QueryEditorLeading` is still manageable; extract styled stacks if it grows.
- `AiChatPanel` / `useAiChat` size and stream races are **follow-up** (see §6).

### Design system conflicts

- Prefer colocated styled components over long inline `sx` in Query chrome (M6).
- Keep MUI `SelectInput` / existing tokens (`textText`, captions) — do not invent a parallel pattern.

---

## 5. What to keep

- `resolveEditorContext` purity + `node:test` coverage.
- `getEngineCapabilities` driving UI visibility and empty session fields.
- `siblingObjectNodeIds` connection filter.
- Locked tabs still run capability filter + `dropStale`.
- Editor context testids and e2e matrix row in `e2e/README.md`.
- Capability-aware `getEditorSessionContext` for query/AI callers.

---

## 6. Out-of-scope AI streaming debt (separate pass)

| Issue | Fix summary |
|-------|-------------|
| New stream does not abort previous | `abort()` previous `AbortController` before creating a new one in `sendStream` |
| Cancel does not abort non-stream fallback | Keep fallback controller in a ref; abort on cancel; ignore late `addMessage` |
| Delete chat only updates store | Call `api.aiChat.deleteChat` with rollback on failure |
| `handleLoadMore` mutates array + stale page | Immutable concat/prepend; functional page update |
| Broad `streaming` store subscription | Selectors for preview/thinking only; isolate list re-renders |
| Silent fallback on every stream error | Fallback only for 404/unsupported |

---

## 7. Recommended fix order

1. **H1** — Database change lock / schema fill (user-visible).
2. **H2** — Engine-aware `parseObjectNodeId` + unit tests (tree autofill correctness).
3. **H3** — `useAiAutoContext` direct assign (AI binding correctness).
4. **H4** — e2e POM / lock assertion / drop fixed sleeps.
5. **M1** — PR hygiene (no unrelated docs).
6. Medium items M2–M7 as time allows in the same PR or a follow-up.

---

## 8. Verification

```bash
# Unit (resolver / parser)
cd frontend && node --import tsx --test src/core/db/*.test.ts

# Lint
cd frontend && npm run lint

# E2E (affected specs only)
cd e2e && npm test -- tests/editor-context.spec.ts
cd e2e && npm test -- tests/data-grid-context-menus.spec.ts
```

Manual smoke:

1. PG: open editor → expect default DB + `public`.
2. Change database → schema should refill or unlock until filled (per chosen H1 fix).
3. Focus tree database / schema / table nodes → editor context updates when unlocked (after H2).
4. Two connections: Data tab on A, Query on B → B must not inherit A’s DB/schema.
5. Switch to SQLite → AI/editor must not keep PG database/schema names.

---

## 9. PR checklist (this WIP)

- [ ] H1–H4 addressed or explicitly waived with reason
- [ ] No `docs/prd/**` / e2e gap reports / `.cursor/settings.json` in the feature commit
- [ ] `npm run lint` clean for touched frontend files
- [ ] Affected e2e specs green via `cd e2e && npm test -- …`
- [ ] PR description lists both context-menus and editor-context if kept in one branch
