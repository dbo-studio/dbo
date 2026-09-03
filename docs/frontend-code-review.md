# Frontend Codebase Review (Project-Wide)

**Scope:** Entire `frontend/` application (`src/`), not a specific branch or feature.  
**Approx size:** ~540 TS/TSX files, ~34k lines.  
**Date:** 2026-08-21  

This document reviews code style, naming, security, dead code, performance, bugs/risk patterns, implementation approach, large components, and design-system consistency — with a short **how to fix** for each theme.

---

## 1. Executive summary

The frontend is a mature React + TypeScript + MUI + Zustand app with clear layering (`base` / `common` / `layout` / `routes` / `store` / `api` / `core`). Conventions in `frontend/AGENTS.md` are mostly followed. TypeScript ESLint is strict (`no-explicit-any`, unsafe-* rules).

**Biggest systemic risks as the app grows:**

1. **Feature concentration** — DataGrid, AiChatPanel, AddConnection, ObjectForm, and large stores absorb most complexity.
2. **Inconsistent conventions** — hook naming (`.hook.ts` vs plain), store folder naming, styled vs heavy `sx`.
3. **Client persistence surface** — SQL text in `localStorage`, settings persist without `partialize`, IndexedDB for grid data.
4. **List/tree scale** — DataGrid is virtualized; ObjectTree, histories, saved queries, chat messages are not.
5. **Debug noise** — dozens of `console.debug('🚀 …')` leftovers in production paths.
6. **No folder-boundary ESLint** — architecture is convention-only; easy to erode as contributors grow.

**Overall grade:** Solid foundation; needs deliberate hygiene and size guards before the next growth wave.

---

## 2. Map of the codebase

| Area | ~Files | ~Lines | Role |
|------|--------|--------|------|
| `src/components/` | 309 | 20.5k | UI — `base/` (84), `common/` (199), `layout/` (26) |
| `src/routes/` | 70 | 4.0k | Pages — `Data`, `ObjectForm`, `Query` |
| `src/core/` | 63 | 4.6k | Theme, utils, API client, IndexedDB, db helpers, enums |
| `src/store/` | 40 | 2.8k | Zustand domains + slices |
| `src/api/` | 27 | 1.0k | Domain HTTP clients |
| `src/hooks/` | 16 | 0.8k | Shared hooks |
| `src/types/` | 14 | 0.4k | Shared types |
| `src/locales/` | 2 | 0.4k | `en.json` only |

**Hottest product surfaces (by size):** DataGrid (~4.0k), AiChatPanel (~3.1k), AddConnection (~1.8k), Settings (~1.6k), ObjectTreeView (~1.0k), SqlEditor (~1.3k), DateTimePicker (~0.8k).

```text
routes/  →  common feature UI  →  base primitives
                ↓
            store (Zustand)  ←→  api/ + core/api (axios)
                ↓
            core/theme, utils, indexedDB, db
```

---

## 3. Largest files (size budget)

Treat **~350 lines** as a soft “split soon” signal and **~400+** as “must plan extraction”.

| Lines | Path |
|------:|------|
| 442 | `components/common/DataGrid/DataGrid.styled.ts` |
| 420 | `components/base/DateTimePicker/DateTimePicker.tsx` |
| 417 | `components/common/DataGrid/DataValuePanel/DataValuePanel.tsx` |
| 390 | `components/common/DataGrid/DataGridContextMenu/DataGridContextMenu.tsx` |
| 387 | `core/indexedDB/indexedDB.service.ts` |
| 363 | `components/common/AddConnection/Postgresql/Postgresql.tsx` |
| 340 | `store/formObject/formObject.store.ts` |
| 327 | `components/common/AddConnection/Mysql/Mysql.tsx` |
| 309 | `components/common/AiChatPanel/utils/chatTableContent.ts` |
| 304 | `components/common/DataGrid/DataGridTableCell/DataGridTableCell.tsx` |
| 297 | `store/dataStore/slices/dataQuery.slice.ts` |
| 280 | `store/treeStore/tree.store.ts` |
| 280 | `components/common/AiChatPanel/hooks/useAiChat.ts` |
| 273 | `layout/AppHeader/SafeModeMenu/SafeModeMenu.tsx` |
| 253 | `routes/Query/Query.tsx` |

**How to fix (summary):**

- Split by **responsibility**, not by line count alone: styles → sections; context menu → action handlers; AddConnection PG/MySQL → shared field groups + engine-specific diffs.
- Cap new PRs: no net growth of files already >400 lines without an extraction step.
- Keep palette files large if they are pure data; they are low risk compared to interactive components.

---

## 4. Code style

### What works

- Prettier + type-checked ESLint (`recommendedTypeChecked`, `@eslint-react`, TanStack Query).
- Almost no `as any` / explicit `any` in `src/` (enforced).
- Feature colocation (component + `*.styled.ts` + hooks next to feature).

### Issues

| Issue | Evidence | How to fix |
|-------|----------|------------|
| `exhaustive-deps` disabled globally | `eslint.config.mts` | Re-enable as `warn`, then fix hot paths; or enable only for `hooks/` + new files via override |
| `react-compiler` plugin installed but unused | `package.json` vs eslint config | Enable when ready, or remove unused dep |
| Ban-ts-comment bypasses | `@ts-ignore` ×4, `@ts-expect-error` ×6 | Prefer proper typing; document the few IndexedDB edge cases |
| Debug logging style | ~56 `console.debug`, many with `🚀` | Replace with structured logger or delete; ban rocket debug in lint (`no-console` with allowlist for `error`) |
| Filename with leading space | `Modal/ResizableModal/ ResizableModal.styled.ts` | Rename file (git mv) |

---

## 5. Naming & folder conventions

### Canonical (from AGENTS.md)

- Components: `PascalCase` folders + `Component.tsx`
- Functions/hooks/vars: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Styles: `Component.styled.ts`

### Violations / drift

| Pattern | Problem | How to fix |
|---------|---------|------------|
| `useFoo.hook.ts` vs `useFoo.ts` | Two hook naming schemes (~13 `.hook.ts` files mixed with plain hooks) | Pick one: prefer `useFoo.ts` everywhere; rename `.hook.ts` in a chore PR |
| Duplicate RemoveTab hooks | `useRemoveTab.ts` and `useRemoveTab.hook.ts` | Merge into one export; delete the other |
| Store folder names | `aiStore`, `tabStore` vs `formObject`, `confirmModal` | Standardize on `*Store` folder + `*.store.ts` (or document exception for tiny stores) |
| Nested `Connections/Connections/` | Redundant nesting | Flatten when next touching Connections |
| Duplicate ChatContext styled names | Same styled filename under two folders | Rename to match component (`ChatContextItem.styled.ts` vs modal item) |
| `indexdbHelper` vs `indexedDB/` | Spelling inconsistency | Rename helper to `indexedDbHelper` |
| Default vs named exports | ~124 default component exports vs few named | Prefer named exports for tree-shaking clarity in new code; migrate gradually |

---

## 6. Security

### Current model

- Axios in `core/api/api.ts`: `withCredentials: true`, base URL from `VITE_PUBLIC_SERVER_URL`.
- Session via cookies (no Bearer token in FE).
- AI API keys entered in Settings and sent to backend — not persisted as raw secrets in a dedicated FE vault (verify backend storage).

### Findings

| Severity | Topic | Detail | How to fix |
|----------|--------|--------|------------|
| Medium | SQL in `localStorage` | Tab queries under `dbo_tab_queries` | Prefer IndexedDB (already used elsewhere) or encrypted/desktop-only store; never log query bodies |
| Medium | Settings persist whole store | `settingStore` persist without `partialize` | `partialize` only durable prefs; exclude ephemeral password-prompt flags |
| Medium | Markdown without link hardening | `ChatMarkdown`, `UpdateDialog` use `react-markdown` (no `rehype-raw` — good) | Add custom `a` renderer: `rel="noopener noreferrer"`, allow only `http(s)` |
| Low–Med | `dangerouslySetInnerHTML` | Only `SyntaxHighlighter.tsx` (Shiki HTML) | Keep single sink; ensure input is code text only; consider DOMPurify if themes ever become user-supplied |
| Low | Release notes markdown | Server-controlled `release.body` | Same link hardening; treat as untrusted for `javascript:` URLs |
| Info | MCP regenerate token | Returned to UI once | Ensure UI does not write token to persist/localStorage; show once + copy |

**Not found:** `eval`, raw `innerHTML`, `document.write`, sessionStorage secrets.

---

## 7. Dead code & hygiene

| Signal | Approx | How to fix |
|--------|--------|------------|
| `console.*` | ~96 calls | Sweep `🚀` debug; keep intentional `console.error` behind a small logger |
| TODO/FIXME/HACK | 0 | Good — use issues instead of code TODOs |
| Unused-looking exports | Heuristic ~80 (many types/styled) | Run knip/`ts-prune` periodically; delete confirmed dead (`findTreeNode` was flagged unused) |
| `.DS_Store` under src | 4 | Add to `.gitignore` if missing; delete files |
| Empty folders | 0 | Good |

**How to fix (process):**

1. One chore PR: remove rocket `console.debug` / leftover logs.
2. Add `knip` or `ts-prune` to CI monthly (warn-only first).
3. Forbid committing `.DS_Store`.

---

## 8. Performance

### Already good

- DataGrid uses `@tanstack/react-virtual`.
- Chat tables capped (`MAX_ROWS` / `MAX_COLUMNS`).
- Most Zustand usage uses selectors (~319 selective vs ~3 whole-store).

### Hotspots

| Area | Risk | How to fix |
|------|------|------------|
| `ObjectTreeView` / recursive `TreeNode` | Full tree render, no virtualization | Virtualize or window large trees; memo node rows; avoid whole-store tree subscriptions |
| Histories / SavedQueries / Connections lists | Unbounded `.map` | Virtual list when count > ~100 |
| AiChat messages / chat history | Re-render on stream ticks | Narrow store selectors; virtualize long threads; isolate streaming preview from message list |
| Whole-store hooks | `useTreeStore()` / `useConfirmModalStore()` without selector in a few hooks | Always `useX(s => s.field)` or shallow compare |
| `DataGrid.styled.ts` 442 lines | Maintainability / CSS-in-JS weight | Split by subcomponent styled files |
| `exhaustive-deps: off` | Stale closures / extra effects | Fix deps in hot hooks rather than keeping global off |

---

## 9. Bugs & risk patterns (systemic)

These are recurring *patterns*, not one-off branch bugs.

| Pattern | Where it shows up | How to fix |
|---------|-------------------|------------|
| Dual sources of truth | Tab metadata in Zustand persist + query text in separate `localStorage` key | Single persistence strategy per concern; document ownership |
| Stream / async races | AI chat send/cancel/fallback (panel hooks) | Abort previous controller; cancel must abort fallback HTTP; ignore late results |
| Imperative store reads in effects | Syncing tab/tree/AI context | Prefer pure resolvers + thin effects; unit-test pure parts only if policy allows — project is **e2e-only** for FE tests, so lock behavior with Playwright |
| Engine-specific ID parsing | Tree `nodeId` formats differ PG/MySQL/SQLite | Centralize in `core/db` and keep parity with backend `ExtractNode` |
| Soft locks without unlock UX | Editor context lock flags | Always provide reset path or document “new tab clears lock” |
| Error swallowed into fallback | AI stream → silent non-stream retry | Fallback only for known unsupported cases; surface other errors |

---

## 10. Implementation approach (architecture)

### Strengths

- Clear API domains under `src/api/<domain>`.
- Zustand slice composition with `devtools` on major stores.
- `base` primitives vs `common` features vs `routes` page wiring.
- Theme registry + multiple palettes under `core/theme`.
- React Query for server state; Zustand for UI/session state — generally correct split.

### Weaknesses

| Issue | How to fix |
|-------|------------|
| No ESLint `no-restricted-imports` for layers (`routes` ↛ deep into another feature’s internals) | Add path rules: `routes` → `common`/`base`/`hooks`/`store`/`api`; `base` must not import `common` |
| Business logic growing inside large components | Extract hooks (`useX`) and pure utils under feature folder |
| `core/db` emerging next to ad-hoc parsers elsewhere | Make `core/db` the single place for engine capabilities + nodeId parsing; re-export temporarily then delete duplicates |
| E2E-only testing policy (`AGENTS.md`) | Keep e2e for UX; for pure logic (parsers, resolvers) either allow a tiny `node:test` exception in `core/` or encode every rule in Playwright — pick one and document |
| AI feature growing as a second app inside `AiChatPanel` | Treat as a bounded context: `api/ai*`, `store/aiStore`, `components/.../AiChatPanel` with internal README of stream protocol |

---

## 11. Large components — split guide

| Component / module | Split strategy |
|--------------------|----------------|
| `DataGrid` (+ styled, cell, context menu, value panel) | Already folder-split; next: move context-menu actions to `actions/`, split styled by region (table, overlays, editors) |
| `DateTimePicker` | Separate calendar grid, time fields, and popover shell |
| `AddConnection` PG/MySQL | Shared `ConnectionFields` + engine-specific sections; shared validation schema |
| `useAiChat` / stream hooks | `useAiChatSession`, `useAiChatSend`, `useAiChatPagination` |
| `formObject.store` | Slices by load / edit / save / dirty like `dataStore` |
| `SafeModeMenu` | Menu UI vs policy explanation vs API mutation hook |
| `Query.tsx` | Keep orchestration thin; move autocomplete/context sync to hooks (already partially done) |

---

## 12. Design system conflicts

### Current system

- MUI + custom theme (`core/theme`, palettes, overrides).
- **102** `*.styled.ts` files (preferred for structure).
- **~92** TSX files also use `sx={` (~197 occurrences) for one-off tweaks.

### Conflicts / drift

| Conflict | How to fix |
|----------|------------|
| Styled for chrome, long `sx` blocks in same feature | Rule of thumb: if `sx` > ~15 lines or reused twice → move to `*.styled.ts` |
| `DataValuePanel` heavy `sx` | Highest `sx` density — convert to styled |
| Inconsistent spacing/direction props (`direction={'row'}` vs `direction="row"`) | Prettier/ESLint stylistic consistency; prefer unquoted where possible |
| Base vs common leakage | Document: new primitives go to `base/`; product composites to `common/`; pages only in `routes/` |
| Icon/typography tokens | Prefer theme palette/typography keys (`textText`, captions) over hard-coded colors in new UI |

---

## 13. Store architecture snapshot

| Store | Notes |
|-------|--------|
| `aiStore` | Multi-slice — good; watch streaming subscriptions |
| `dataStore` | Multi-slice — good; ties to IndexedDB |
| `tabStore` | Persist + separate query localStorage — dual persistence risk |
| `treeStore` | Persist with partialize — good pattern to copy |
| `settingStore` | Persist **without** partialize — fix |
| `connectionStore` | Connection selection |
| `formObject` | Large monolith store — candidate for slices |
| `confirmModal`, `safeModePassword` | Small UI stores — OK |

**How to fix:** Adopt a store checklist for new domains: slices if >200 lines; `partialize` if persisted; never subscribe without selector in React components/hooks.

---

## 14. Prioritized roadmap (how to execute)

### P0 — do soon (hygiene + safety)

1. Remove `🚀` / noisy `console.debug` from production paths.
2. `partialize` `settingStore` persist.
3. Harden markdown links (`ChatMarkdown`, `UpdateDialog`).
4. Fix store hooks that subscribe without selectors.
5. Rename broken filename with leading space under `ResizableModal`.

### P1 — growth control (1–2 sprints)

1. Standardize hook naming (`useX.ts` only).
2. Split or freeze growth of DataGrid / DateTimePicker / AddConnection / DataValuePanel.
3. Virtualize ObjectTree (or lazy-render collapsed branches more aggressively).
4. Add ESLint import boundaries for `base`/`common`/`routes`.
5. Single strategy for tab query persistence.

### P2 — structural quality

1. Knip/ts-prune dead export cleanup.
2. AiChat stream cancellation/abort/delete API correctness pass.
3. Document FE architecture in `frontend/AGENTS.md` (layers + persist rules + size budget).
4. Decide unit-test exception for pure `core/` logic vs e2e-only forever.

---

## 15. Suggested team rules (short)

```text
1. New UI: base primitive OR common feature folder — never dump in routes.
2. Prefer Component.styled.ts over long sx.
3. Zustand: always select; persist always partialize.
4. Files >400 lines need extraction plan in the same PR.
5. No new console.debug; no secrets in localStorage.
6. Engine-specific DB rules live in core/db only.
7. User-visible behavior → e2e; do not invent a second test stack without updating AGENTS.md.
```

---

## 16. Verification commands

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd e2e && npm test -- tests/<affected>.spec.ts
```

Optional hygiene:

```bash
# find rocket debug leftovers
rg "🚀" frontend/src

# find whole-store hooks (manual review)
rg "use(Tree|ConfirmModal|Tab|Ai|Data|Setting)Store\(\)" frontend/src

# find dangerouslySetInnerHTML sinks
rg "dangerouslySetInnerHTML" frontend/src
```

---

## 17. What is already in good shape

- Strict TypeScript ESLint profile (almost no `any`).
- Cookie credential model instead of tokens in JS.
- Virtualized DataGrid.
- Theme system with multiple palettes and overrides.
- Domain API modules + React Query.
- Zustand slices on the heaviest stores.
- Colocated feature folders and widespread `*.styled.ts`.
- Zero TODO/FIXME litter.

---

*This review is intentionally project-wide. Feature-specific PR reviews should still be done per change set; use this doc as the standing quality bar for frontend growth.*
