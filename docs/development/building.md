# Building

DBO Studio ships as a web bundle (embedded in the Go binary for production Docker), standalone Go binaries, and Tauri desktop installers.

## Version

Release version is read from `docs/scripts/VERSION` (used by CI and Tauri publish).

## Scripts (`docs/scripts/`)

| Script | Purpose |
| ------ | ------- |
| `build_init.sh` | Shared checks (Go ≥ 1.23, Node ≥ 20.12.2, npm) and `build_backend()` |
| `build_backend.sh` | CGO release backend binary → `desktop/bin/dbo-bin-<platform>` |
| `desktop_dev.sh` | Build backend + `tauri dev` |
| `desktop_build.sh` | Build backend + `npm i` + `tauri build` (installers) |

Run from repo root:

```bash
sh ./docs/scripts/build_backend.sh
sh ./docs/scripts/desktop_build.sh
```

Makefile equivalents:

```bash
make build          # build_backend.sh
make desktop-build  # desktop_build.sh
make desktop-dev    # desktop_dev.sh
```

### Backend binary flags

`build_backend` uses:

```text
CGO_ENABLED=1 go build -p=8 --tags "release" -trimpath -ldflags "-s -w" -o desktop/bin/dbo-bin-<arch>-<os> backend/*.go
```

SQLite (app metadata DB) requires CGO.

## Frontend production build

```bash
cd frontend
npm install
npm run build    # tsc --noEmit + vite build → frontend/dist/
```

## Production Docker image

Root `Dockerfile` multi-stage build:

1. **frontend** — `npm run build` → static assets
2. **backend** — `go build --tags "release"` with `APP_ENV=docker`, copies `frontend/dist` into `backend/out`

Image is published to `ghcr.io/dbo-studio/dbo/dbo` on pushes to the `release` branch (`.github/workflows/docker.yml`).

Local build:

```bash
docker build -t dbo-local .
```

See [Docker](../deployment/docker.md) for run/compose examples.

## Desktop (Tauri)

Prerequisites: Rust toolchain, platform WebView deps (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

```bash
cd frontend && npm install
sh ./docs/scripts/desktop_build.sh
```

Artifacts land under `desktop/src-tauri/target/release/bundle/`.

### CI desktop publish

`.github/workflows/build.yml` (`workflow_dispatch`):

1. Reads version from `docs/scripts/VERSION`
2. Creates draft GitHub release
3. Matrix build: macOS (Apple Silicon + Intel), Ubuntu 24.04, Windows
4. Steps: `npm run build` (frontend) → `build_backend.sh` → `tauri-action` with signing secrets

Node 24 and Go 1.27 are used in CI (may differ slightly from local minimums in `build_init.sh`).

## Pre-PR checks

```bash
cd backend && go fmt ./... && golangci-lint run && go build ./...
cd frontend && npm run lint && npm run build
cd e2e && npm test    # host OS only — see testing.md
```

Behavior coverage is e2e-only; do not add new `*_test.go` or Vitest suites for product features.
