# Backend — Agent Guide

Go API server for DBO Studio. Module: `github.com/dbo-studio/dbo`. See also root [`AGENTS.md`](../AGENTS.md) and [`.cursor/rules/`](../.cursor/rules/) for Cursor rules.

## Project Structure

```
backend/
├── main.go / cmd/           # Entry & bootstrap
├── config/                  # App configuration
├── internal/
│   ├── app/
│   │   ├── dto/             # Request/response structs + Validate()
│   │   ├── handler/         # Fiber HTTP handlers (thin)
│   │   └── server/          # Routes, middleware
│   ├── container/           # Singleton DI (logger, config, cache, GORM)
│   ├── database/
│   │   ├── connection/      # ConnectionManager, dialect openers
│   │   ├── contract/        # Shared interfaces + domain types
│   │   ├── core/            # BaseRepository
│   │   ├── postgres|mysql|sqlite/
│   │   └── repository.go    # Factory: NewDatabaseRepository()
│   ├── migrations/          # Goose SQL migrations (app DB)
│   ├── model/               # GORM models (app metadata)
│   ├── repository/          # App-metadata persistence
│   └── service/             # Business logic by domain
└── pkg/                     # apperror, response, logger, cache, db
```

## Two-Database Model

| DB | Technology | Purpose |
|----|-----------|---------|
| App DB | SQLite + GORM (`pkg/db`) | Connections, saved queries, jobs, AI config |
| User DBs | ConnectionManager + drivers | Live Postgres/MySQL/SQLite operations |

## Commands

```bash
go run .                  # run locally
go build -o dbo .         # compile binary
go fmt ./...              # format
golangci-lint run         # lint (.golangci.yml)
go test ./...             # all tests
go test ./... -cover      # with coverage
air                       # hot reload (.air.toml)
```

## Package Naming Convention

**Important:** directories use `snake_case` but package names use **camelCase with domain prefix**:

| Directory | Package | Import alias |
|-----------|---------|--------------|
| `internal/service/saved_query/` | `serviceSavedQuery` | `serviceSavedQuery "…/saved_query"` |
| `internal/database/postgres/` | `databasePostgres` | `databasePostgres "…/postgres"` |
| `internal/database/connection/` | `databaseConnection` | `databaseConnection "…/connection"` |
| `internal/database/contract/` | `databaseContract` | `databaseContract "…/contract"` |

Match this pattern for all new packages.

## Layer Conventions

### Handlers (`internal/app/handler/`)

- Thin: bind → validate → call service → respond
- Use `response.SuccessBuilder()` / `response.ErrorBuilder().FromError(err)`
- Pass `fiber.Ctx` as context to services
- Log errors at handler level

### Services (`internal/service/<domain>/`)

- Interface: `I{Name}Service`; impl: `I{Name}ServiceImpl`
- Compile-time check: `var _ I{Name}Service = (*I{Name}ServiceImpl)(nil)`
- Constructor returns interface: `NewXxxService(...) I{Name}Service`
- Mappers in `*_mapper.go` (unexported `createRes`, `indexRes`, etc.)
- Split by operation: `*_create.go`, `*_update.go`, `*_delete.go`
- First param always `context.Context`

### Repositories (`internal/repository/`)

- App metadata only (GORM against SQLite)
- Interface in `repository.go`; impl in `*_repository.go`
- `db.WithContext(ctx)` + GORM scopes (`pkg/db/scope.Paginate`)
- Return `model.*` entities, not DTOs

### Database drivers (`internal/database/<driver>/`)

- Implement `databaseContract.DatabaseRepository`
- Embed/wrap `databaseCore.BaseRepository`
- `NewXxxRepository(ctx, connection, cm)` factory
- `contracts_assertions.go` for compile-time interface checks
- One file per feature: `tree.go`, `run_query.go`, `form_schema.go`, `execute.go`
- Register new drivers in `internal/database/repository.go`

## Error Handling

Use `pkg/apperror` exclusively for HTTP-aware errors:

```go
// Sentinel errors
var ErrSavedQueryNotFound = errors.New("query not found")

// Wrappers
apperror.BadRequest(err)
apperror.Validation(err)
apperror.NotFound(apperror.ErrSavedQueryNotFound)
apperror.InternalServerError(err)
apperror.DriverError(err)
```

- Services wrap domain errors; handlers pass them to `response.ErrorBuilder()`
- Never return raw HTTP status from services
- Never panic in service/library code

## DTO Validation

Each request struct in `internal/app/dto/` has a `Validate()` method using `invopop/validation`:

```go
func (r *CreateSavedQueryRequest) Validate() error {
    return validation.ValidateStruct(r,
        validation.Field(&r.Name, validation.Required),
    )
}
```

## Testing

- Colocate `*_test.go` next to source
- Table-driven tests with `t.Run` subtests
- `t.Parallel()` at test and subtest level
- Database driver tests: assert SQL generation without live DB when possible
- Helpers: `t.Helper()` for setup functions

```bash
go test ./internal/database/... -run TestName
```

## DI & Wiring

Manual constructor injection in `cmd/cmd.go`:

```
repository.NewRepository() → service.NewService() → handlers → server.New()
```

Singleton: `container.Instance()` for logger, config, cache, app DB. No wire/fx.

## New Endpoint Checklist

1. DTO + `Validate()` in `internal/app/dto/`
2. Repo method in `internal/repository/` (if app DB)
3. Service interface + impl + mapper in `internal/service/<domain>/`
4. Handler in `internal/app/handler/`
5. Route in `internal/app/server/route.go`
6. Wire in `cmd/cmd.go` if new handler/service

## New Database Feature Checklist

1. Add to `internal/database/contract/contract.go`
2. Implement in each driver package (`postgres/`, `mysql/`, `sqlite/`)
3. Update `contracts_assertions.go`
4. Table-driven unit test for SQL/command generation

## API Response Shape

```json
// Success
{ "data": ..., "message": "" }

// Error
{ "code": 400, "message": "bad_request", "data": null }
```

Routes: `/api/...` (see `internal/app/server/route.go`).

## Commit & PR

- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`
- Before PR: `go fmt ./...` + `golangci-lint run` + `go test ./...`
- Never commit secrets or real credentials

## Security

- Passwords via `secret_store` — never log or return raw credentials
- Owner session: `helper.CtxOwnerID(ctx)` — `"desktop"` for desktop client
- Migrations: document rollback in PR when schema changes
