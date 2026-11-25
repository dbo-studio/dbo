# Testing Policy (DBO)

## Rule

**Do not add new unit/integration tests under `frontend/` or `backend/`.**

**Every user-visible feature must have at least one Playwright scenario** (named spec under `e2e/tests/`, listed in `e2e/README.md` matrix). Refactors that keep behavior use the existing spec; behavior changes extend or add a scenario — never “lint only” for product UI.

All product behavior coverage goes through Playwright in [`e2e/`](../../e2e/):

- Specs: `e2e/tests/*.spec.ts`
- Follow [`.agents/rules/e2e-qa.md`](e2e-qa.md) and the `e2e-playwright` skill
- Run: `cd e2e && npm test -- tests/<affected>.spec.ts`

## Do not create

- `frontend/**/*.test.ts`, `*.spec.ts`, Vitest/Jest/node:test suites
- New `backend/**/*_test.go` files
- `npm run test:unit` / ad-hoc unit runners in `frontend/package.json`

## Existing `*_test.go`

A few legacy Go tests may remain. Do not expand them for new features. Prefer an e2e scenario instead. Only touch an existing `*_test.go` if a change you made breaks `go test` on that file and a minimal fix is required.

## Before PR

- Frontend: `npm run lint` (+ e2e for UI behavior)
- Backend: `go fmt ./...` + `golangci-lint run` (+ e2e for API/UI flows)
- Behavior change → update or add `e2e/tests/<feature>.spec.ts` and the matrix in `e2e/README.md`
