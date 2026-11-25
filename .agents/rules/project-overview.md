# DBO Studio — Project Context

DBO is an open-source database GUI. Monorepo: `backend/` (Go/Fiber), `frontend/` (React/TS/Vite), `desktop/` (Tauri), `e2e/` (Playwright QA).

## Read First

- Root guide: `AGENTS.md`
- Backend: `backend/AGENTS.md`
- Frontend: `frontend/AGENTS.md`
- E2E: `e2e/README.md` — when editing tests, follow `.agents/rules/e2e-qa.md` and the `e2e-playwright` skill. Always run Playwright on the host OS (`.agents/rules/e2e-host-os.md`).

## Core Rules

- Minimize diff scope; match existing patterns in the package you edit.
- Backend flow: `handler → service → repository → database`.
- Two DBs: app SQLite (GORM metadata) + user DBs via `ConnectionManager`.
- Never commit secrets. Use Conventional Commits (`feat:`, `fix:`, `chore:`) — see `.agents/rules/git-commits.md`.
- Commits must use the machine Git identity (`user.name` / `user.email`); never override author via `--author` or env vars.
- Before PR: `go fmt` + `golangci-lint run` (backend) or `npm run lint` (frontend).
- **Testing: e2e only** — do not add new unit tests in `frontend/` or `backend/`. Cover behavior in `e2e/` (Playwright). See `.agents/rules/go-testing.md` and `.agents/rules/e2e-qa.md`.

## Backend Package Naming

Directories use `snake_case`; package names use camelCase with domain prefix:
`serviceSavedQuery`, `databasePostgres`, `databaseConnection`.

Use matching import aliases:
```go
serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
```

## When Unsure

Find a similar feature in the same layer and mirror its structure, naming, and error handling.
