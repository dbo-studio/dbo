# DBO Studio — Agent Guide

This document is the single source of truth for AI agents and contributors working on DBO Studio. It captures project architecture, conventions, and where to find detailed rules.

## What is DBO?

DBO Studio is an open-source, minimal database GUI (Postgres, SQLite, MySQL, SQL Server). The repo is a monorepo:

| Area | Path | Stack |
|------|------|-------|
| Backend API | `backend/` | Go, Fiber v3, GORM, Cobra |
| Frontend UI | `frontend/` | React, TypeScript, Vite, MUI |
| Desktop | `desktop/` | Tauri wrapper |
| Docs & scripts | `docs/` | Build/deploy scripts |

## Before You Code

1. Read this file and the area-specific guide:
   - Backend: [`backend/AGENTS.md`](backend/AGENTS.md)
   - Frontend: [`frontend/AGENTS.md`](frontend/AGENTS.md)
2. Cursor rules in [`.cursor/rules/`](.cursor/rules/) auto-apply by file type — follow them.
3. Match existing patterns in the package you are editing; do not introduce new abstractions without need.
4. Keep diffs minimal and focused on the requested change.

## Architecture Overview

```
┌─────────────┐     HTTP /api     ┌──────────────────────────────────────┐
│  frontend/  │ ────────────────► │  backend/                            │
│  React + TS │                   │  handler → service → repository      │
└─────────────┘                   │              ↘ database (user DBs)   │
                                  │  GORM SQLite (app metadata)          │
                                  └──────────────────────────────────────┘
```

### Two-database model

- **App DB** — SQLite via GORM (`pkg/db`). Stores connections, saved queries, jobs, AI config, sessions.
- **User DBs** — Live connections to Postgres/MySQL/SQLite via `ConnectionManager` and driver packages under `internal/database/{postgres,mysql,sqlite}/`.

### Request flow (backend)

```
HTTP (Fiber) → handler (bind, validate, respond)
            → service (business logic, DTO mapping)
            → repository (app metadata, GORM)
            → database.NewDatabaseRepository() (user DB operations)
```

Dependencies flow one direction only: `app → service → repository/database`. Never import upward.

## Coding Principles (All Areas)

- **Minimize scope** — smallest correct change; no drive-by refactors.
- **Follow existing conventions** — naming, file layout, error handling, response shapes.
- **No secrets in source** — use env vars and secret store.
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
- **Test before PR** — see per-area commands below.

## Backend Quick Reference

```bash
cd backend
go run .                  # run locally
go fmt ./...              # format
golangci-lint run         # lint
go test ./...             # test
air                       # hot reload
```

Key packages: `pkg/apperror`, `pkg/response`, `pkg/logger`, `internal/app/dto`, `internal/database/contract`.

Package naming quirk: directories are `snake_case` but package names are camelCase with domain prefix (`serviceSavedQuery`, `databasePostgres`). Use matching import aliases.

## Frontend Quick Reference

```bash
cd frontend
npm run dev               # dev server (API at localhost:8080/api)
npm run lint              # ESLint
npm run build             # typecheck + build
npm run test:e2e          # forwards to top-level e2e/ package
```

E2E lives in [`e2e/`](e2e/) — see [`e2e/README.md`](e2e/README.md). Each run boots an ephemeral API (random port + isolated SQLite).

Components: `PascalCase`. Hooks/functions: `camelCase`. Colocate feature code under `src/`.

## Adding a New Backend Endpoint

1. DTO in `internal/app/dto/` with `Validate()` (invopop/validation)
2. Repo method in `internal/repository/` if app DB is involved
3. Service method + mapper in `internal/service/<domain>/`
4. Handler in `internal/app/handler/`
5. Route in `internal/app/server/route.go`
6. Wire in `cmd/cmd.go` if new handler/service

## Adding a New Database Driver Feature

1. Implement on driver repo (`internal/database/<driver>/`)
2. Add method to `internal/database/contract/contract.go` if new capability
3. Add `contracts_assertions.go` compile-time checks
4. Register in `internal/database/repository.go` if new driver
5. Test SQL generation with table-driven unit tests (no DB required when possible)

## Error & Response Conventions

- Services return `apperror.*` wrappers, never raw HTTP status codes.
- Handlers use `response.SuccessBuilder()` / `response.ErrorBuilder().FromError(err)`.
- Sentinel errors in `pkg/apperror/errors.go`; map with `apperror.NotFound()`, `apperror.DriverError()`, etc.

## PR Checklist

- [ ] Change is scoped and follows existing patterns
- [ ] `go fmt` / `npm run lint` passes
- [ ] `golangci-lint run` passes (backend)
- [ ] Tests added or updated where behavior changed
- [ ] No secrets or credentials committed
- [ ] API/behavior changes documented in PR description

## Cursor Rules & Skills

| File | Scope |
|------|-------|
| `.cursor/rules/project-overview.mdc` | Always-on project context |
| `.cursor/rules/go-core.mdc` | Go idioms (errors, interfaces, packages) |
| `.cursor/rules/go-dbo-architecture.mdc` | DBO backend layers & patterns |
| `.cursor/rules/go-concurrency.mdc` | context, goroutines |
| `.cursor/rules/go-testing.mdc` | table-driven tests |
| `.cursor/rules/go-tooling.mdc` | fmt, golangci-lint |
| `.cursor/rules/e2e-qa.mdc` | Strict Playwright/QA rules (`e2e/**`) |
| `.cursor/skills/golang-development/SKILL.md` | Go development workflow skill |
| `.cursor/skills/e2e-playwright/SKILL.md` | E2E QA / Playwright workflow skill |

## Further Reading

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution process
- [`schema-editing-architecture.md`](schema-editing-architecture.md) — object form / schema editing design
- [`backend/.golangci.yml`](backend/.golangci.yml) — lint configuration
