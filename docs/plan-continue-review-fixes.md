# Continue Review Fixes (from Phase 3 closeout)

Continuation of `.zcode/plans/plan-sess_1902d181-fb02-4edc-9c67-60d83368dd3c.md`. Phases 1–2 are shipped. Phase 3 is in-progress in the working tree.

**Blocker:** a post-commit review of `99321592` + `fb8298f8` + the uncommitted Phase 3 tree found leftover P0/P1 holes. Those land first (Phase 2.5 below). Do **not** start Phase 3 closeout, frontend, or docs until 2.5 is committed and green.

**Already shipped**

| Phase | Commit | Scope |
|-------|--------|--------|
| 1 — Backend P0 security | `99321592` | Session validation, `APP_AUTH_TOKEN`, CORS, SavePath, Safe Mode on `/query/run`, filter/sort allow-list, sqlguard CTEs, AI key mask+encrypt, job `owner_id`, import cap, MCP constant-time |
| 2 — Jobs & concurrency | `fb8298f8` | Real cancel, atomic claim, panic recover, graceful shutdown, I/O off ConnectionManager lock, transactional import, DSN escape, server timeouts |

**Phase 3 already done in the working tree (do not redo)**

Dead-code delete, typo renames, zap logger repair, `PasswordHydrator`, `fiber.Ctx` out of services (`FileDownload`), full `serviceX` package rename, query types moved to `contract`, route normalize, explicit DI for repositories + handlers + most services.

**Decisions unchanged:** one conventional commit per phase on `dev`; lint/fmt + build green; user-visible behavior gets Playwright in `e2e/`; machine git identity; no `--author`.

---

## Phase 2.5 — Review leftovers (do first, before everything)

Fixes for holes left by Phase 1/2 and one Phase 3 layering regression. Smallest correct change per item; no drive-by refactors. One conventional commit (or two if the e2e hunk wants its own `test:` commit).

### Must-fix (P0 / correctness)

1. **`InlineQuery` still interpolates raw SQL** (`postgres/mysql/sqlite/run_query.go`). Filters/sorts are allow-listed; `InlineQuery` is pasted into `WHERE %s`. `Run()` only classifies a probe — any `ClassRead` payload (`UNION`, subqueries, `OR 1=1`) passes. Restrict to a single validated predicate (reuse filter-operator allow-list), or drop the raw string and accept only structured `Filters`. Also quote catalog PK names in the default `ORDER BY` (same files, currently unquoted).

2. **Export `SavePath` not constrained to `exports/`.** Plan said reject absolute/`..` and force `exports/`. Current `validateSavePath` only rejects `..`; desktop + processor still `MkdirAll`/`WriteFile` any absolute path. Web must keep `SavePath` empty. Processor must re-validate: refuse anything outside `exports/` unless desktop **and** already validated. `GET /jobs/:id/result` must refuse `FilePath` outside `exports/` (no `os.ReadFile` of an arbitrary path).

3. **Job cancel can lose to a completion write.** Progress ticks are column-scoped, but `updateJobStatus(…, completed)` is `UPDATE … SET status=? WHERE id=?` with no `AND status='running'`. Race: `isCancelled` false → user cancel → completion overwrites. Make terminal writes conditional (`WHERE status='running'`). `JobService.Cancel` must use `UpdateFields`, not full `Save()` on a stale row (Save can wipe `result`/`progress`).

4. **Shutdown does not persist “canceled”.** `Shutdown()` calls `workerCancel()` then `CancelAllJobs()` on the already-canceled `workerCtx`. GORM fails with `context.Canceled`; jobs stay `running` until next boot. Use `context.WithoutCancel` (or `Background`) for those terminal DB writes.

5. **AI key encrypt can store plaintext; responses leak last-4.** `encryptAIKey` returns the plain pointer on missing cipher key or AES failure — that gets written to SQLite. Fail the update instead. Stop returning `****` + last 4; mask is `****` only (keep-existing still matches `strings.HasPrefix(key, "****")`). Inject the cipher key / `*config.Config` into `NewAiProviderRepo` (also closes a `container.Instance()` leak).

6. **Fiber write timeout will kill AI streams and fat queries.** `WriteTimeout: 60s` / `ReadTimeout: 30s` in `server.go`. Raise write (or disable on stream/query routes). 60s is a product regression for `/ai/chat/stream` and slow `SELECT`s.

### Should-fix (P1 leftovers from the same review)

7. **sqlguard writable-CTE check is prefix-only.** `writableCTEPattern` requires `^\s*WITH`. `SELECT * FROM (WITH x AS (DELETE … RETURNING *) SELECT * FROM x)` and `EXPLAIN WITH …` still classify as READ. Treat any statement whose text/AST contains a mutating CTE as write. Dollar-quotes (`$tag$…$tag$`) should not split on inner `;`.

8. **`isAlreadyQuoted` was not removed.** It was renamed to `isSafelyPreQuoted` (`pkg/helper/helper.go`). Plan item was delete the pass-through. Remove it; always escape and quote (or bind).

9. **Session `Get` treats every error as “unknown cookie”.** A SQLite hiccup in local-web mints a new owner (empty connections). 500 on real DB errors; new-session / 401 only on `ErrRecordNotFound`. `generateSessionID` must not fall back to a constant ID if `rand.Read` fails — fail the request.

10. **CORS always allows any localhost origin**, including server-web (`APP_AUTH_TOKEN` set). Pin server-web to `APP_ALLOWED_ORIGINS` only; localhost stay allowed only when auth token is unset (local-web).

11. **`GET /api/config/logs` is still “any session”.** In local-web, auto-session == unauthenticated SQL-log download. Require a validated session; in server-web that already means token-exchange. Do not serve logs in local-web without the same bar you accept for jobs (owner session that exists in `web_sessions`). If that is still too open, 404 the route unless `APP_AUTH_TOKEN` is set.

12. **Move AI DTOs back out of `contract`.** `AiChatRequest` / `AiInlineCompleteRequest` in `internal/database/contract/query_types.go` are HTTP/AI types, not driver types. Keep query/filter/sort/import in `contract`; chat/complete types stay in `app/dto`. Drivers that need context options keep the existing `AIContextOptions` in `contract/type.go`.

13. **Fiber `ErrorHandler` maps everything to 500.** Preserve `*fiber.Error` status (404/timeout); only unknown errors become generic 500.

14. **Auth exchange hygiene.** Plan said print `APP_AUTH_TOKEN` once to server logs at boot (never persist). `ConstantTimeCompare` leaks length — hash both sides or pad. No rate limit needed if the token is 256-bit; if it can be `change-me`, reject short tokens at config load.

15. **ConnectionManager leftovers from Phase 2.** `Close()` / `CloseDatabase()` still call `closeConn` under `cm.mu`. Move close off the lock (same pattern as cleanup). Per-key singleflight for reconnect is nice-to-have; do it only if it stays a small diff.

16. **Import `ContinueOnError` is still row-by-row, no transaction.** Strict mode is already chunked + bound. Wrap tolerant mode in per-chunk transactions that still collect row errors, or leave a `ponytail:` comment naming the ceiling. Bound params stay.

### E2E (this phase, not later)

17. **Export `SavePath` validation** — Phase 1.13 promised this; current spec only checks export SQL class. Cover `..` / absolute path → 400.
18. **Job cancel + failed-job visibility** — Phase 2.10, never written. Cancel a running export/import; UI/API shows canceled, not completed. Failed job surfaces its error.

```bash
cd backend && go fmt ./... && golangci-lint run && go build ./...
cd e2e && npm test   # safe-mode grid/export + new SavePath + job-cancel specs; host OS, required_permissions: all
```

Commit (machine identity):

```text
fix: close leftover Safe Mode, job cancel, and secret-handling holes
```

---

## Phase 3 closeout — finish DI, leftover splits, commit

Do this only after Phase 2.5 is committed. Do not start frontend until this commit lands.

### 3a. Remaining service-locator calls (in progress)

`container.Instance()` must remain only in the composition root (`cmd/cmd.go` sets logger/cache/db/config). Every other call is leftover.

Current leftovers (2.5 item 5 already removes the AI-provider one):

1. **`internal/database/core/base_repository.go`** — `Cache()` + `Logger()` still pulled from the container. Thread `cache` + `logger` through `NewBaseRepository` → driver `New*Repository` → `database.NewDatabaseRepository`. Callers already have both on `service.Deps` / processors.
2. Sweep once more (`rg 'container\.Instance\(\)' backend`). Expected hits: `cmd/cmd.go` only.

Do **not** delete the container package. It stays as the process singleton that `cmd` fills; it just stops being a service locator inside libraries.

Update `backend/AGENTS.md` DI section to match: constructors take deps; `container.Instance()` is composition-root only.

### 3b. Original Phase 3 splits (not started)

These were in the parent plan and are still open:

1. **`postgres/query_generator.go` (~1016 lines)** — extract result-shaping / cache-write and per-object-type generators. Same treatment for `mysql/query_generator.go` (~471) if the shared skeleton comes out for free.
2. **`connection.go` / `ssl.go`** — pool/lifecycle vs TLS registration. `PasswordHydrator` already landed; this is a file split only.
3. **Hoist `run_query.go`** — shared skeleton into `internal/database/core` behind `Dialect{QuoteIdent, Qualify}`. Goal: delete the ~90% copy-paste across postgres/mysql/sqlite. Keep dialect files for metadata SQL only. `FilterPredicate` moves into `core` per-dialect (bound params + `ESCAPE` / `ILIKE`) as part of this hoist — do not leave concatenated literals in `contract`.

If a split blows the Phase 3 commit past a clean review, land 3a + verify as the Phase 3 commit and put 3b in its own `refactor:` commit immediately after (still before Phase 4). Prefer one commit if both stay reviewable.

### 3c. Verify + commit

```bash
cd backend && go fmt ./... && golangci-lint run && go build ./...
```

Commit (machine identity):

```text
refactor: replace container service locator with explicit DI
```

If 3b is in the same commit, mention the query-generator / `run_query` hoist in the body. If split, second commit:

```text
refactor: hoist shared run_query skeleton into database core
```

---

## Phase 4 — Frontend P0/P1 hygiene

Unchanged from the parent plan. Confirm each item is still true before editing (none of this landed).

1. Remove leftover `console.debug` / `console.log` (~75, many `🚀`). Add `no-console` lint (allow `error` only).
2. `settingStore` persist `partialize`: keep theme / editor / durable general / setup / editorContext / sidebar. Exclude ephemeral modal flags and `titleBar` (holds a function). `setting.store.ts` still has no `partialize`.
3. Shared `AppMarkdown` wrapper: `a` renderer with `rel="noopener noreferrer"` + http(s)-only. Use from `ChatMarkdown` + `UpdateDialog`.
4. Fix whole-store subscriptions (`useActionDetection.ts`, `useRemoveTab.ts`, `useFormSave.ts` — re-grep; the three named in the review).
5. Renames: leading-space ` ResizableModal.styled.ts`; `indexdbHelper.ts` → `indexedDbHelper.ts` (update importers).
6. ESLint: `exhaustive-deps` → `warn` + fix flagged paths; enable installed `eslint-plugin-react-compiler` as `warn`.
7. Hook renames: 14 remaining `*.hook.ts` → `useX.ts`. Merge duplicate `useRemoveTab` (`useRemoveTab.ts` + `useRemoveTab.hook.ts` both exist; `useDesktopMenu` already imports the non-`.hook` one).
8. Tab queries: `localStorage` `dbo_tab_queries` (`tabQuery.slice.ts`) → IndexedDB via existing `saveQueries` / `getQueries(tabId)` + one-time migration.
9. AI chat: store the fallback HTTP `AbortController`; `handleCancel` aborts it; ignore late results.

```bash
cd frontend && npm run lint && npm run build
```

Commit:

```text
chore: frontend hygiene, persist rules, and hook naming
```

---

## Phase 5 — Frontend P1/P2 structure

1. `ObjectTreeView`: virtualize `ChildrenContainer` child map (react-window, already used by DataGrid). Virtualize or cap Histories, SavedQueries, Connections lists.
2. `formObject` store → slices (load / edit / save / dirty). Flatten `Connections/Connections/`. Dedupe `ChatContextModalItem` styled name.
3. Size budget: split `DataGrid.styled.ts`; `DataValuePanel` heavy `sx` → styled.
4. ESLint import boundaries: `base` ↛ `common`; `routes` only via allowed layers.
5. `knip` warn-only; delete confirmed dead exports; document persist rules + layering in `frontend/AGENTS.md`.
6. **E2E**: tab-query persistence migration + AI chat cancel.

```bash
cd frontend && npm run lint && npm run build
cd e2e && npm test   # affected specs only; host OS, required_permissions: all
```

Commit:

```text
refactor: virtualize tree/lists and tighten frontend layering
```

---

## Phase 6 — Documentation set (zero-to-hundred, English Markdown)

Plain Markdown under `docs/`, IA-ready for dbo-studio.com later. No SSG wiring. Verify every command against the repo (config fields, scripts, Dockerfile, workflows).

```
docs/
  index.md
  development/
    getting-started.md      # Go ≥1.23, Node ≥20.12.2, Rust/Tauri; go run / npm run dev;
                            # docker-compose.dev.yml sample DBs
    building.md             # docs/scripts/*.sh, CGO release binary, tauri targets,
                            # updater artifacts, VERSION, CI release
    testing.md              # e2e layout, page objects, .env.example
  deployment/
    configuration.md        # SSOT env vars including APP_AUTH_TOKEN / APP_ALLOWED_ORIGINS
                            # (desktop / local-web / server-web)
    docker.md               # single-image, volumes, TLS/proxy, MCP, upgrades
    security.md             # trust model, Safe Mode, secret store, MCP tokens
```

Also in this commit:

1. Fix root `Makefile` `build` target (points at missing `build_all_in_one.sh` → real script).
2. Add missing `docker-compose.dev.env.example` if compose comments still reference it.
3. Sync `backend/.env.example` + `frontend/.env.example` with all supported vars (auth vars should already be in from Phase 1 — fill any gaps).
4. Root README quickstart links into `docs/` instead of duplicating.
5. Append a short **Resolved** note to `docs/backend-code-review.md` and `docs/frontend-code-review.md` listing the phase commits. Call out Phase 2.5 items explicitly so the review doc matches the tree.

```bash
# no new runtime; spot-check linked paths exist
```

Commit:

```text
docs: add development and deployment guides
```

---

## Out of scope (not in this continuation)

- Web CSRF + session TTL/rotation (review Medium; separate threat-model pass).
- Handler `Validate()` gaps (`McpUpdateRequest`, tree `Params`, job pagination).
- Exported godoc on every `I{X}Service` / contract type (or drop the unused revive `exported` implication).
- SQL Server driver, schema-completeness PRD (`docs/prd/core-schema-completeness.md`).

---

## Verification (every phase)

```bash
cd backend && go fmt ./... && golangci-lint run && go build ./...
cd frontend && npm run lint && npm run build
cd e2e && npm test            # affected specs; host OS only
```

Phase 2.5 is backend + the two missing e2e specs. Phase 3 closeout is backend-only (no e2e unless a split changes query behavior — it must not). Phase 4 is FE lint/build. Phase 5 adds the two e2e specs.
