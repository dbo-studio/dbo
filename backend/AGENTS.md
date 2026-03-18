# Repository Guidelines

## Project Structure & Module Organization
- `main.go` starts the application; `cmd/` contains CLI entrypoints.
- Core application logic lives in `internal/`:
  - `internal/app/` for HTTP handlers, DTOs, and server wiring.
  - `internal/service/` for business logic (query, AI, jobs, config, etc.).
  - `internal/repository/` for data-access abstractions.
  - `internal/database/` and `internal/migrations/` for DB drivers and schema changes.
- Shared utilities are under `pkg/` (e.g., `logger`, `response`, `cache`, `db`).
- Runtime/dev data appears in `data/` (including `data/logs/`), and generated exports in `exports/`.

## Build, Test, and Development Commands
- `go run .` — run the backend locally from source.
- `go build -o dbo .` — compile a local binary.
- `go test ./...` — run all unit/integration tests.
- `go test ./... -cover` — run tests with coverage output.
- `golangci-lint run` — run configured linters from `.golangci.yml`.
- `air` — start hot-reload development loop using `.air.toml`.

## Coding Style & Naming Conventions
- Follow idiomatic Go formatting: run `gofmt`/`go fmt ./...` before committing.
- Use tabs for indentation (Go default), short receiver names, and explicit error handling.
- Package names should be lowercase and concise (`query`, `history`, `secret_store`).
- Exported identifiers use `CamelCase`; unexported use `camelCase`.
- Keep handlers thin; place business rules in `internal/service/*`.

## Testing Guidelines
- Place tests next to implementation files as `*_test.go`.
- Prefer table-driven tests for services and parsers.
- Name tests as `Test<FunctionOrBehavior>` (e.g., `TestCreateConnection_InvalidSQLitePath`).
- For focused runs: `go test ./internal/service/... -run TestName`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style reflected in history: `fix: ...`, `feat: ...`, `chore: ...`.
- Keep commit messages imperative and scoped (e.g., `fix: handle empty AI provider key`).
- PRs should include:
  - What changed and why.
  - Linked issue/task ID.
  - Test evidence (`go test ./...`, lint output).
  - API/behavior notes for handler or schema changes.

## Security & Configuration Tips
- Never commit secrets, tokens, or real database credentials.
- Keep environment-specific configuration outside source; verify `.gitignore` coverage.
- When changing migrations, document rollback considerations in the PR.

## Architecture Overview
- Request flow follows a layered pattern: `handler -> service -> repository -> database`.
- `internal/app/handler` parses HTTP input and returns standardized responses.
- `internal/service/*` owns business logic, validation orchestration, and cross-module workflows.
- `internal/repository` encapsulates persistence operations and query composition.
- `internal/database/*` manages driver-specific setup (Postgres, MySQL, SQLite, SQL Server) and migrations.
- Keep dependencies one-directional (app/service down to data layer) to avoid circular coupling.
