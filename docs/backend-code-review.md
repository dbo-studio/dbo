# Backend Codebase Review (Project-Wide)

**Scope:** Entire `backend/` service, not a specific branch or feature.  
**Approx size:** ~293 Go files, ~29k lines.  
**Date:** 2026-09-03

This document reviews code style, naming, security, dead code, concurrency, bugs/risk patterns, implementation approach, large files, and API/contract consistency — with a short **how to fix** for each theme.

---

## 1. Executive summary

The backend is a Go + Fiber v3 + GORM service with clear layering (`handler → service → repository` for app metadata, plus `internal/database/{postgres,mysql,sqlite}` drivers behind a `contract` abstraction). Conventions in `backend/AGENTS.md` are largely honored; the lint profile (`ccoVeille` safe preset: errcheck, govet, staticcheck, errorlint, contextcheck, fatcontext, bodyclose) is strong. Secret handling (AES-GCM secret store, bcrypt-hashed Safe Mode password, hashed MCP tokens) is above average.

**Biggest systemic risks as the app grows:**

1. **Trusted-desktop trust model** — sessions are auto-issued, CORS reflects any origin with credentials, and several endpoints (export `SavePath`, `/query/run`) assume "whoever reaches the port is the owner". All top security findings flow from this one assumption.
2. **String-built SQL on the grid path** — filter operators, sort columns, and "already quoted" values are interpolated raw; Safe Mode is bypassable on `/query/run` and via writable CTEs.
3. **Job system correctness** — user cancellation is silently overwritten by running processors, dispatch has a double-run race, and there is no panic recovery or graceful shutdown.
4. **Layering leaks** — `internal/database/connection` imports a service (`secret_store`), and `internal/app/dto` is imported by the innermost layers (contract, drivers, repositories).
5. **Driver duplication** — `run_query.go` is ~90% copy-paste across the three drivers; `core/` exists but the biggest seams never moved into it.
6. **Documentation vacuum** — ~0.5% comment ratio; zero doc comments on the service/contract API surface.

**Overall grade:** Solid core with genuinely good secret handling and lint discipline; needs security hardening before any non-desktop deployment, plus job-system and layering repairs before the next growth wave.

---

## 2. Map of the codebase

| Area | ~Files | ~Lines | Role |
|------|--------|--------|------|
| `internal/database/postgres/` | 29 | 4.7k | PG driver (query generator, tree, diagram, form objects) |
| `internal/database/mysql/` | 29 | 3.9k | MySQL driver |
| `internal/database/sqlite/` | 24 | 3.2k | SQLite driver |
| `internal/database/core/` | 14 | 2.6k | Shared driver logic (raw query, FK lookup, updatable query) |
| `internal/database/connection/` | 5 | 1.0k | ConnectionManager + SSL/TLS |
| `internal/app/dto/` | 37 | 1.5k | Request/response DTOs + validation |
| `internal/app/handler/` | 15 | 1.2k | Fiber handlers |
| `internal/service/*` | ~90 | 7.5k | Domain services (ai, job, connection, safemode, mcp, …) |
| `internal/repository/` | 12 | 0.95k | GORM app-metadata repositories |
| `internal/model/` | 12 | 0.26k | GORM models |
| `internal/migrations/` | 10 | 0.5k | Goose migrations |
| `pkg/*` | ~20 | 2.3k | apperror, response, logger, sqlguard, cryptoutil, csv, helper, cache, db |

```text
handler → service → repository (GORM app DB)
              ↓
      internal/database/contract
        ↓            ↓          ↓
    postgres      mysql      sqlite
        └──── internal/database/core ────┘
              ↓
    internal/database/connection (ConnectionManager) → secret_store ⚠ (upward import)
```

---

## 3. Largest files (size budget)

Treat **~350 lines** as a soft "split soon" signal and **~400+** as "must plan extraction".

| Lines | Path |
|------:|------|
| 1016 | `internal/database/postgres/query_generator.go` |
| 506 | `internal/service/ai/provider/base.go` |
| 471 | `internal/database/mysql/query_generator.go` |
| 453 | `internal/database/postgres/diagram.go` |
| 441 | `internal/database/core/updatable_query.go` |
| 386 | `internal/database/mysql/diagram.go` |
| 369 | `internal/database/mysql/update_query.go` |
| 355 | `internal/database/core/fk_lookup.go` |
| 342 | `internal/database/core/helpers.go` |
| 335 | `internal/database/sqlite/execute_table_query_builder.go` |
| 323 | `internal/database/connection/connection.go` |
| 307 | `internal/database/connection/ssl.go` |
| 306 | `internal/database/postgres/update_query.go` |
| 297 | `internal/service/job/processors/import_processor.go` |
| 275 | `internal/service/dbtools/registry.go` |

**How to fix (summary):**

- `postgres/query_generator.go` is a true outlier (~2× the runner-up): extract result-shaping, cache-write, and per-object-type generators.
- Hoist the duplicated `run_query.go` skeleton into `internal/database/core` behind a dialect adapter (see §10) — that alone removes ~2,400 duplicated lines.
- `ssl.go` and `connection.go` should split into TLS-config vs pool/lifecycle.
- Cap new PRs: no net growth of files already >400 lines without an extraction step.

---

## 4. Code style

### What works

- Strong lint preset: errcheck, staticcheck, errorlint, contextcheck, fatcontext, bodyclose, nilerr, wsl_v5, gofmt with `interface{}`→`any` rewrite.
- Zero `interface{}` in the codebase (`any` used throughout); zero TODO/FIXME/HACK litter.
- Consistent constructor-returns-interface + compile-time assertions (`var _ IQueryService = (*QueryServiceImpl)(nil)`).

### Issues

| Issue | Evidence | How to fix |
|-------|----------|------------|
| Doc comments effectively absent | ~149 comment lines across 29k (~0.5%); 0/20 sampled exported service symbols documented; revive `exported` rule enabled but the preset doesn't actually enforce package/exported comments | Document the `I{X}Service` interfaces and `contract` types (the real API surface), or drop the revive rule that implies it's enforced |
| `fmt.Println` / stdlib `log` leftovers | `pkg/db/db.go:27`, `pkg/logger/zap/zap.go:37`, `core/raw_query.go:92`, `import_export_service.go:39` | Route through `pkg/logger`; delete startup prints |
| `panic()` in logger | `pkg/logger/logger.go:22` (`GetError` panics on unknown input type; currently no callers) | Remove or return an error — a panic-on-log landmine |
| Zap file core built at ErrorLevel | `pkg/logger/zap/zap.go:63` — Info/Warn never reach the log file; every entry also duplicated to stdout | Build the file sink at Info level; drop the stdout echo |
| Blank-identifier parameter suppression | `mysql/ai_metadata.go:11,24,37`, `sqlite/ai_metadata.go` (`_ = schema` to satisfy interface) | Name params `_` in the signature instead — idiomatic and lint-clean |
| `interface{}`-free but alias-heavy imports | Two different packages both named `serviceAiProvider` (see §5) force alias gymnastics at 8 call sites | Rename the adapter package |

---

## 5. Naming & package conventions

### Canonical (from AGENTS.md)

- Directories `snake_case`; package names camelCase **with domain prefix** (`serviceSavedQuery`, `databasePostgres`); matching import aliases.

### Violations / drift

| Pattern | Evidence | How to fix |
|---------|----------|------------|
| **Package name collision** | `internal/service/ai/provider` and `internal/service/ai_provider` both declare `package serviceAiProvider` | Rename the adapter layer (e.g. `provider` or `aiProvider`); update 8 import sites |
| Packages without the domain prefix | `job`, `dbtools`, `safemode` (no prefix); `aichat` (no prefix, ≠ dir); `import_export` (snake_case package); `secretStore` (no prefix); `serviceMcp` (should be `serviceMCP`) | Either rename to `serviceX` and drop call-site aliases, or amend AGENTS.md to make prefixes optional — current state is half-and-half |
| Filename typos | `internal/model/web_sesstion.go` ("sesstion"), `internal/database/postgres/exceute_materialized_view_command.go` ("exceute") | `git mv` in a chore PR |
| Persistent cache key typo | `pkg/cache/keys.go:42` — `"posgresql"` (missing "t"); renaming invalidates existing caches | Fix with a one-line migration note before release |
| Commented-out sqlserver branch | `internal/database/repository.go:23-24` references a `databaseSqlserver` package that doesn't exist | Delete, or land together with a real driver |
| Conventional Commits not followed | History: `format code`, `update version go linter`, `prepreare for version to 1.1.0` | Enforce via commitlint/PR template, or drop the rule |

---

## 6. Security

### Current model

- Desktop-first: fixed `ownerID = "desktop"` in desktop mode; web mode auto-issues a session to any caller without a cookie.
- DB passwords stripped from stored connection options, AES-GCM encrypted at rest via `secret_store` + `pkg/cryptoutil` (random nonce, 0600 key file).
- Safe Mode: bcrypt-hashed + AES-GCM password, clamped unlock TTLs (1–60 min), 30 s one-shot gate.
- MCP: bearer token (256-bit, SHA-256 hashed, masked in responses), proxy re-scopes to the token owner, strict vitess-AST read-only guard with `LIMIT 100` + 10 s timeout.

### Findings

| Severity | Topic | Detail | How to fix |
|----------|--------|--------|------------|
| Critical | No real authentication | `owner_session_middleware.go:25-71` auto-issues a session to any caller and never validates the cookie against `web_sessions`; desktop mode hardcodes the owner | First-run pairing token for web mode; validate session IDs against the DB |
| Critical | CORS reflects any origin with credentials | `server.go:63-67` — `AllowOriginsFunc(origin != "")` + `AllowCredentials: true`; any website can drive the local API | Pin origins per `config.App.Client`; drop the reflect-all func |
| Critical | Arbitrary file write via export `SavePath` | `export_processor.go:114-121` — client-controlled path, `os.MkdirAll` + `os.WriteFile` with no validation | Reject absolute paths/`..`; constrain to `exports/` |
| Critical | Safe Mode bypass on `/query/run` | `query_service.go:49-61` — `Run()` has no `ClassifySQL`/`Enforce` (only `Raw()` does); the grid path interpolates filters raw | Apply the Safe Mode gate to `Run`; restrict `InlineQuery` to validated predicates |
| Critical | SQL injection via filter operators/sort/columns | `dto/filter_sql.go:33-51` escapes only values; `Operator`, `Next`, `sort.Column`, `req.Columns` interpolated raw (`sqlite/run_query.go:82-110`) | Allow-list operators and boolean joins; quote identifiers with the existing `Quote*Ident` helpers |
| High | "Already quoted" value pass-through | `pkg/helper/helper.go:57-64` `isAlreadyQuoted` returns `'-delimited strings verbatim into SQL (update paths, `core/import.go`) | Remove the shortcut; use bound parameters |
| High | Writable-CTE classified as READ | `pkg/sqlguard/classify.go:31` — `WITH d AS (DELETE … RETURNING *) SELECT …` passes Safe Mode | Reject non-SELECT CTE bodies or treat `WITH` as unknown |
| High | Export/import jobs run arbitrary SQL ungated | `export_processor.go:92-98` — `jobData.Query` executed with no sqlguard/Enforce | Apply the policy gate at job creation |
| High | Jobs not owner-scoped | `job_repository.go:25-30` filters only by id; any session can read others' job results/files | Add `owner_id`, filter by `CtxOwnerID` |
| High | AI API keys plaintext + echoed to client + SSRF URL | `model/ai_provider.go:8-9`; `ai_provider_mapper.go:34` returns the full key; `openai.go:21` uses a user-set `BaseURL` server-side | Never return keys; encrypt at rest; validate provider URL schemes |
| Medium | No CSRF, no session expiry/rotation | No CSRF token anywhere; `web_sessions` has no TTL; remember-me secrets persist forever | Session TTL + idle expiry, rotation, CSRF for web mode |
| Medium | DSN built by concatenation | `postgresql_connection.go:124-143`, `mysql_connection.go:107-115` — unescaped password can inject other DSN keys | Escape keyword values; use `mysql.Config.FormatDSN()` |
| Medium | Unbounded memory in import/export | `import_export_service.go:43` (`io.ReadAll`), whole-file parse, exports built as one `[]byte` | Stream CSV parse/write; cap upload size |
| Medium | No CSV formula-injection defense | `pkg/csv/csv.go:28-72` — `=`/`+`/`-`/`@` prefixes written verbatim | Prefix with `'` or tab |
| Low | Naive statement splitter | `sqlguard/classify.go:101-117` splits on `;` regex — semicolons in string literals misclassify batches | Tokenizer-based split |
| Low | MCP token comparison not constant-time | `mcp_service.go:135-144`; plaintext token retained in a long-lived field | `crypto/subtle.ConstantTimeCompare`; drop the field |
| Low | Logs endpoint open to any session | `config_service_logs.go:12-29` — log file (contains SQL text) downloadable unauthenticated | Gate behind auth |
| Info | No TLS, binds all interfaces | `server.go:74` | Terminate TLS or document localhost-only binding |

**Not found / good:** no plaintext secrets or DSNs in logs; recover middleware in prod; TLS 1.2 minimum with correct verify modes; parameterized FK/autocomplete queries with proper identifier quoting and LIKE escaping; MCP execute path uses a strict AST guard; import-from-`.sql` is AST-parsed (no raw execution).

**Structural takeaway:** items 1–5 are one design decision — the app was built as a trusted-local desktop tool and Safe Mode / secret-store were layered on top. If web/Docker (`APP_CLIENT != desktop`) is supported in production, those are the priority fixes.

---

## 7. Dead code & hygiene

| Signal | Evidence | How to fix |
|--------|----------|------------|
| Dead interface `ICacheRepo` | `internal/repository/repository.go:22-29,100` — no implementation, `CacheRepo` field stays nil (includes misspelled `GeDatabaseTables`) | Delete, or implement if caching is planned |
| Dead DTO families | `dto/mysql_params.go:23-96` (`MysqlDatabase/Table/Schema/ViewParams` + `*ParamsData` children), `dto/postgresql_params.go:85,96` (`PostgresIndexParams`, `PostgresSequenceParams`) — zero external references | Delete; drivers use their own parallel types |
| Dead contract types | `contract/database_enum.go:9` `DatabaseEnum` (sqlserver uses a string literal instead), `contract/diagram.go` `DiagramKind`, `contract/type.go` (`ExportProgress`, `ExportResult`, `ImportOptions`, `TreeNodeActionType`, `TreeFormFieldTypeEnum`), `pkg/cache/keys.go:58` `ConnectionSecretPrefix()` | Remove; land sqlserver enum + driver together if planned |
| TODO/FIXME/HACK | 0 | Good — keep using issues |
| Commented-out code | 1 instance (`repository.go:23-24`) | Good; keep it that way |
| Test files | 0 `*_test.go` (e2e-only policy honored) | Keep; cover new behavior in `e2e/` |

**How to fix (process):**

1. One chore PR: delete dead DTO/contract/interface symbols + rename typo'd filenames.
2. Enable revive's package-comments rules only if doc comments are actually going to be written — otherwise drop `exported` for honesty.

---

## 8. Concurrency & resource safety

### Already good

- `ConnectionManager` map access consistently mutex-guarded, keys scoped per owner+connection+database.
- Processor registry uses `sync.RWMutex`; container singleton uses `sync.Once` correctly.
- Background cache writes use `context.WithoutCancel` before spawning (`postgres/query_generator.go:1006-1014`).
- Raw-query loops check `ctx.Err()` per row and map cancellation to `apperror.QueryCanceled()`.
- `rows.Close()` deferred everywhere; table updates transactional via GORM closures; SQLite autocomplete bounded via `errgroup.SetLimit`.

### Hotspots

| Area | Risk | How to fix |
|------|------|------------|
| Job cancellation broken | `JobService.Cancel` writes `cancelled` to DB, but processors hold their own copy and overwrite it with `running` on every progress tick (`job_manager.go:76-98`, `job_service.go:56-64`); in-processor checks read only the stale copy | Signal via per-job `context.CancelFunc`/channel held by the manager, or re-read status from DB each chunk |
| No panic recovery in job goroutine | `job_manager.go:209-213` dispatch has no `recover()`; recover middleware absent in local mode (`server.go:67-70`) — a processor panic kills the app on desktop | `defer recover` + log in the job goroutine; mount recover unconditionally |
| No graceful shutdown | No `signal.Notify` anywhere; `Server.Shutdown` never called; `workerCancel`/`workerWg` set up but never used | Trap signals in `cmd/cmd.go`: shutdown HTTP, cancel workers, wait, `CancelAllJobs` |
| I/O under global mutex | `GetConnection` pings / opens GORM connections while holding `cm.mu` (`connection.go:64-125`) — a hung DB host blocks every other connection operation | Map lookup under lock; ping/open outside it; per-key singleflight |
| Job double-dispatch race | `processPendingJobs` checks `GetRunningJobs` then spawns async; status flips to `running` only inside the goroutine — next 5 s tick can dispatch the same job twice | Atomic claim: `UPDATE … SET status='running' WHERE id=? AND status='pending'`, proceed only if rows-affected == 1 |
| `context.Background()` in job manager | 12 call sites (`job_manager.go:66-231`, processors) — nothing cancellable, shutdown can't drain | Derive from `jm.workerCtx` |
| Import non-atomic + interpolated | `core/import.go:37-43` — one `Exec` per row, values string-concatenated, no transaction; mid-failure leaves a partial table | Chunk transactions + bound parameters |
| Update-check goroutine | `config_service_index.go:16-21` — uses the request context (cancelled when handler returns), swallows all errors | `context.WithoutCancel(ctx)` + log |
| Ignored `db.DB()` error | `connection.go:114,174` — `sqlDB, _ := db.DB()` then dereference → nil panic on error | Check the error |
| Zero HTTP timeouts | `fiber.Config` sets no Read/Write/Idle timeouts; AI provider timeout can be 0 if user stores 0 | Set server timeouts; clamp provider timeout minimum |

---

## 9. Bugs & risk patterns (systemic)

These are recurring *patterns*, not one-off bugs.

| Pattern | Where it shows up | How to fix |
|---------|-------------------|------------|
| Trust-model assumptions in handlers | Auto-issued sessions, reflect-all CORS, unscoped jobs, open logs endpoint | Decide the web threat model once; enforce it in middleware, not per-endpoint |
| Wrong sentinel error reuse | `job_service.go:42,54` return "connection not found" when a **job** is not found | Add `ErrJobNotFound`; audit other copy-pasted sentinels |
| Non-apperror details leak to clients | `pkg/response/response.go:38-42` returns raw `err.Error()` with 500; Fiber `ErrorHandler` returns an error object (no JSON body) | Map unknown errors to a generic 500 message; fix the ErrorHandler |
| Validation gaps at the edge | `handler/mcp.go:38-45`, `handler/tree.go:44-110` (raw `c.Body()` passed as `Params`), `handler/job.go:26-61` — bound but never validated | Add `Validate()` to `McpUpdateRequest`, `PaginationRequest`, `*Params` structs; call it in tree/job handlers |
| Cleanup errors invisible | `_ = cm.closeConn(...)` ×6, `_ = jm.updateJobStatus(...)` — never logged | Best-effort is fine; log at debug so leaks are diagnosable |
| `apperror.Equals` string comparison | `pkg/apperror/errors.go:39-41`, used in `connection_service_close.go:29` — breaks on wrapping | Prefer `errors.Is` |
| Middleware runs for MCP traffic | Global `OwnerSessionMiddleware` inserts a junk session row per unauthenticated MCP request (`server.go:69-70` + `route.go:51-52`) | Exempt `/api/mcp/*` — the proxy does its own bearer auth |
| Global body rewrite | `SkipClearRequestMiddleware` unmarshals/re-marshals every JSON body to strip `dbo_index` | Route-scope it or strip in DTO mapping |

---

## 10. Implementation approach (architecture)

### Strengths

- Handler → service → repository direction holds: no handler imports repositories/drivers, no repo imports services.
- Clean driver factory (`internal/database/repository.go:15-29`) with per-driver compile-time `contracts_assertions.go`.
- Shared driver logic genuinely exists in `internal/database/core` (raw query pipeline, FK lookup, updatable-query analysis, SQL parser).
- Validation convention widely applied (28 `req.Validate()` sites); handlers are mostly thin bind → validate → service → respond.
- `pkg/sqlguard` on raw-query + MCP paths is the right idea (vitess AST parsing for MCP).

### Weaknesses

| Issue | How to fix |
|-------|------------|
| `internal/database/connection` imports `internal/service/secret_store` (`connection.go:11,46,86,157`) — infra depends on services | Define a `PasswordHydrator` interface in `connection` (the `HistoryWriter` interface pattern already exists in the same file) or move secret_store to `internal/security` |
| `internal/app/dto` imported by `contract`, drivers, and repositories — innermost layers depend on the HTTP ring | Move transport-neutral structs (`RunQueryRequest/Response`, `FilterDto`, `SortDto`, …) into `internal/database/contract`; have `app/dto` map to them |
| SQL predicate builder lives in the DTO layer (`dto/filter_sql.go`) | Move to `internal/database/core` next to the dialect adapter; keep operator enums in dto |
| Services touching Fiber (`job_service.go:66-102` `Result`, `config_service_logs.go:12-30` `Logs` — file I/O + headers + `c.Send`) | Return a `FileDownload` struct; do headers/Send in the handler |
| Global container as service locator (37 files call `container.Instance()`, including constructors that already receive the dependency) | Pass `logger`/`cache`/`db` explicitly (ConnectionManager already does); keep container only for wiring |
| Ad-hoc repo construction inside `NewService` (`service.go:52` builds `repository.NewJobRepo()` despite receiving the repo bundle) | Use `repo.JobRepo` or accept it as a parameter |
| Driver duplication: `run_query.go` ~90% copy-paste across drivers (only quoting differs); `run_raw_query.go`, `form_tabs.go` similar; `core/` seam exists but underused | Introduce `core.Dialect{QuoteIdent, Qualify(...)}`; hoist RunQuery/raw-query/tab-list flows; keep dialect files for metadata SQL only |
| Recover middleware only in non-local; logger middleware only local | Mount recover unconditionally; keep request logging local-only |

---

## 11. Large files — split guide

| Module | Split strategy |
|--------|----------------|
| `postgres/query_generator.go` (1016) | Result-shaping + cache-write → core; per-object-type generators → own files |
| `ai/provider/base.go` (506) | Shared stream plumbing vs per-provider option wiring |
| `*/diagram.go` | Catalog query layer vs WKT/geometry conversion (conversion already shared in `core/geometry.go`) |
| `core/updatable_query.go` (441) | Analysis vs SQL fragment generation |
| `connection/connection.go` + `ssl.go` | Pool/lifecycle vs TLS registration; move secret hydration behind an interface first |
| `import_processor.go` (297) | CSV parsing / validation / row-execution phases; add streaming |
| `query_generator.go` (mysql, 471) | Same treatment as postgres — after hoisting the shared skeleton, both shrink together |

---

## 12. API & contract consistency

### Current system

- `internal/database/contract` aggregates per-capability interfaces embedded into `DatabaseRepository`; all three drivers implement everything (verified).
- `pkg/response.SuccessBuilder/ErrorBuilder` + `pkg/apperror` sentinels with `Resolve` preferring 4xx over 5xx.

### Conflicts / drift

| Conflict | How to fix |
|----------|------------|
| Contract signatures take HTTP DTOs (`contract.go:6,18-33`) | Contract should own its request/response types; `app/dto` adapts |
| Route style inconsistency | Leading-slash vs none on groups/routes (`route.go:10-83`); normalize |
| Static catch-all registered first (`route.go:6`) | Register last or prefix it — ordering-dependent routing is fragile |
| `mcp.All("/*", …)` in the same group as MCP routes | Move the wildcard proxy to its own group registered last |
| Dialect-specific SQL built in `dto.FilterPredicate` used by all three drivers | Per-dialect predicates behind the `core.Dialect` adapter (enables `ILIKE`, `ESCAPE` per engine) |
| Session/owner semantics differ per endpoint (desktop hardcoded vs web auto-issue vs MCP bearer) | One identity model in middleware; handlers read `CtxOwnerID` only |

---

## 13. Package & wiring snapshot

| Package | Notes |
|---------|-------|
| `internal/database/{postgres,mysql,sqlite}` | Correct `databaseX` naming, file-per-feature, compile-time assertions — good |
| `internal/database/core` | Right idea; underused (query pipelines still per-driver) |
| `internal/database/connection` | Solid except mutex-held I/O and upward secret_store import |
| `internal/service/*` | Naming drift (see §5); two fiber.Ctx methods to extract; otherwise consistent interfaces |
| `internal/service/ai` + `ai/provider` | Clean provider factory with timeouts; package name collides with `ai_provider` |
| `internal/repository` | One dead interface (`ICacheRepo`); otherwise conventional |
| `internal/container` | sync.Once singleton — but used as a service locator instead of injected DI |
| `pkg/apperror`, `pkg/response`, `pkg/sqlguard`, `pkg/cryptoutil` | Good design; sqlguard needs CTE + splitter hardening |
| `pkg/logger` | Weakest pkg: ErrorLevel file sink, stdout echo, a panic path, fmt.Println leftovers |

**How to fix:** adopt a package checklist for new domains: `serviceX` naming; no imports upward; accept `context.Context` first; no `fiber.Ctx` in services; constructor-returns-interface with compile-time assertion.

---

## 14. Prioritized roadmap (how to execute)

### P0 — do soon (safety + correctness)

1. Close the Safe Mode / injection holes: gate `/query/run` with `ClassifySQL`/`Enforce`, allow-list filter operators and joins, remove `isAlreadyQuoted`, reject writable CTEs in sqlguard.
2. Validate/restrict export `SavePath`; gate export/import job SQL through the same policy as `/query/raw`; owner-scope jobs.
3. Fix job cancellation (per-job cancel context) and the double-dispatch race (atomic claim).
4. Add panic recovery to the job goroutine and mount recover middleware unconditionally.
5. Stop returning AI API keys to the client; encrypt at rest.

### P1 — growth control (1–2 sprints)

1. Decide the web threat model: real auth for non-desktop, pinned CORS, session TTL, CSRF.
2. Break the layering leaks: `PasswordHydrator` interface, transport-neutral contract DTOs.
3. Hoist the `run_query.go` skeleton into `core` behind a dialect adapter (~2,400 duplicated lines).
4. Split `postgres/query_generator.go`; do I/O outside `cm.mu`.
5. Package naming: resolve the `serviceAiProvider` collision; align the rest with (or amend) AGENTS.md.

### P2 — structural quality

1. Graceful shutdown (signals → HTTP shutdown → workers → `CancelAllJobs`).
2. Delete dead DTO/contract/interface symbols; rename typo'd files; fix the cache-key typo before release.
3. Streaming import/export + upload size caps + CSV formula-injection defense.
4. Doc comments on the service interfaces and contract (or drop the revive rule that implies it).
5. Document the backend architecture in `backend/AGENTS.md` (trust model + layering rules + size budget).

---

## 15. Suggested team rules (short)

```text
1. Never interpolate user input into SQL — identifiers via Quote*Ident, values via placeholders.
2. Every new endpoint: Validate() at the handler, Safe Mode gate where SQL executes, owner scoping.
3. Services never import fiber; no imports upward (contract defines its own DTOs).
4. New file >350 lines needs an extraction plan; new driver code asks "does core/ own this?" first.
5. Background work: cancellable context, recover(), and a shutdown hook — no context.Background() in services.
6. No fmt.Println / stdlib log in production paths; pkg/logger only.
7. Package names follow AGENTS.md exactly — two packages with the same name is a build smell.
```

---

## 16. Verification commands

```bash
cd backend
go fmt ./...
golangci-lint run
go run .           # boot with ephemeral config
```

Optional hygiene:

```bash
# raw SQL interpolation sites (manual review)
rg 'fmt\.Sprintf' backend/internal/database backend/pkg/sqlguard

# context.Background in services
rg 'context\.Background\(\)' backend/internal/service

# fiber.Ctx leaking into services
rg 'fiber\.Ctx' backend/internal/service

# package name collisions
rg -n '^package ' backend/internal --glob '*.go' | sort -t: -k3
```

---

## 17. What is already in good shape

- Layering discipline: no upward imports between handler/service/repository; thin handlers with a 28-site validation convention.
- Secret handling: AES-GCM at rest with a 0600 key file, bcrypt-hashed Safe Mode password, hashed + masked MCP tokens, no secrets or DSNs in logs.
- Lint posture: errcheck/staticcheck/errorlint/contextcheck/fatcontext/bodyclose — stronger than most Go codebases.
- Zero TODO/FIXME litter, zero commented-out code (one instance), zero `interface{}`, zero test files (e2e-only policy honored intact).
- MCP execute path: strict vitess-AST read-only guard with injected LIMIT and timeout.
- Compile-time contract assertions on every driver; genuine shared core package.
- Boot-time job recovery for orphaned `running`/`pending` jobs.

---

*This review is intentionally project-wide. Feature-specific PR reviews should still be done per change set; use this doc as the standing quality bar for backend growth.*
