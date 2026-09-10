# Getting started

This guide covers local development for the DBO Studio monorepo.

## Monorepo layout

| Package | Path | Stack |
| ------- | ---- | ----- |
| Backend API | `backend/` | Go 1.27+, Fiber v3, GORM |
| Frontend UI | `frontend/` | React, TypeScript, Vite, MUI |
| Desktop | `desktop/` | Tauri 2 |
| E2E | `e2e/` | Playwright |

## Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Go | ≥ 1.23 (repo pins 1.27 in `go.mod`) | `go version` |
| Node.js | ≥ 20.12.2 | Used by build scripts and frontend |
| npm | any recent | Bundled with Node |
| Rust + Tauri CLI | stable | Required for desktop only |
| Docker | optional | Sample Postgres/MySQL for e2e and manual testing |

Build scripts enforce Go ≥ 1.23 and Node ≥ 20.12.2 (`docs/scripts/build_init.sh`).

## Backend (API)

```bash
cd backend
cp .env.example .env   # optional — defaults work for local dev
go run .
```

The API listens on `http://localhost:8080` by default (`APP_PORT`, see [Configuration](../deployment/configuration.md)).

Cobra also exposes `go run . serve` (same as default).

Hot reload:

```bash
cd backend && air   # requires github.com/air-verse/air
```

## Frontend (web UI)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Vite serves the UI on port `3000` (`VITE_PORT`) and proxies API calls to `VITE_PUBLIC_SERVER_URL` (default `http://localhost:8080/api`).

Open [http://localhost:3000](http://localhost:3000).

## Full stack with Docker Compose (dev)

For containerized API + UI + sample databases:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Optional host port overrides (`DB_TEST_PORT`, `MYSQL_TEST_PORT`, `PGSQL_SSL_TEST_PORT`) — see [Configuration](../deployment/configuration.md#docker-compose--development-docker-composedevyml).

| Service | URL / port |
| ------- | ---------- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |
| Sample Postgres | `localhost:5432` (user `default`, password `secret`, db `default`) |
| Sample MySQL | `localhost:3307` → container 3306 |
| Sample Postgres (SSL) | `localhost:5433` — start with `sample-pgsql-ssl` |

Makefile shortcuts:

```bash
make up-dev      # docker compose -f docker-compose.dev.yml up -d
make down-dev    # tear down dev stack
make up-build    # rebuild dev images
```

## Sample databases (host-only)

If you run the API/UI on the host but want Docker sample DBs:

```bash
docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql
```

Seed SQL lives in `docs/sample_db/`. Data persists under `docker/data/pgsql/`.

## Desktop development

```bash
./docs/scripts/desktop_dev.sh
# or
make desktop-dev
```

This builds the Go backend sidecar binary and runs `tauri dev` in `desktop/`.

## Makefile targets

| Target | Command |
| ------ | ------- |
| `make build` | Build Go backend release binary (`docs/scripts/build_backend.sh`) |
| `make desktop-dev` | Desktop hot reload |
| `make desktop-build` | Full desktop release build |
| `make up-dev` / `make down-dev` | Dev Docker Compose stack |

## Next steps

- [Building](building.md) — release binaries and desktop artifacts
- [Testing](testing.md) — Playwright e2e
- [Configuration](../deployment/configuration.md) — all environment variables
