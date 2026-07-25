---
name: golang-development
description: Develop Go backend features in DBO Studio following layered architecture, apperror/response patterns, and database driver conventions. Use when writing, reviewing, or refactoring Go code in backend/, adding API endpoints, database drivers, or Go tests.
---

# DBO Go Development

## Quick Start

1. Read `AGENTS.md` and `backend/AGENTS.md`
2. Find a similar feature in the same layer; mirror its patterns
3. Implement bottom-up: DTO → repo → service → handler → route
4. Run `go fmt ./...`, `golangci-lint run`, `go test ./...`

## Architecture

```
handler (Fiber) → service → repository (app SQLite)
                         ↘ database.NewDatabaseRepository() (user DB)
```

## New API Endpoint Workflow

```
- [ ] DTO in internal/app/dto/ with Validate()
- [ ] Repo method in internal/repository/ (if app DB)
- [ ] Service interface + impl + mapper in internal/service/<domain>/
- [ ] Handler in internal/app/handler/
- [ ] Route in internal/app/server/route.go
- [ ] Wire in cmd/cmd.go if new handler/service
- [ ] go fmt && golangci-lint run && go test ./...
```

## Key Patterns

### Package naming
Directory `saved_query/` → package `serviceSavedQuery` with alias import.

### Error handling
```go
// Service
return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)

// Handler
return response.ErrorBuilder().FromError(err).Send(c)
```

### Interface + impl
```go
type ISavedQueryService interface { ... }
var _ ISavedQueryService = (*ISavedQueryServiceImpl)(nil)
func NewSavedQueryService(repo repository.ISavedQueryRepo) ISavedQueryService
```

### Database driver feature
1. Add to `internal/database/contract/contract.go`
2. Implement in `internal/database/<driver>/`
3. Assert in `contracts_assertions.go`
4. Table-driven test for SQL generation

## Do NOT

- Put business logic in handlers
- Return raw HTTP status from services
- Use `panic` in service/library code
- Create `util`/`common` packages
- Import upward (database → service)

## Reference Files

- Handler example: `backend/internal/app/handler/saved_query.go`
- Service example: `backend/internal/service/saved_query/saved_query_service.go`
- Errors: `backend/pkg/apperror/errors.go`
- DB factory: `backend/internal/database/repository.go`
- Contract: `backend/internal/database/contract/contract.go`

## Cursor Rules

Auto-applied when editing `backend/**/*.go`:
- `go-core.mdc` — idiomatic Go
- `go-dbo-architecture.mdc` — layer patterns
- `go-concurrency.mdc` — context/goroutines
- `go-testing.mdc` — test conventions
- `go-tooling.mdc` — lint/format
