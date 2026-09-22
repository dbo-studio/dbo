# Configuration

Single source of truth for DBO Studio environment variables and Docker Compose options.

Optional starter files (`backend/.env.example`, `frontend/.env.example`, `e2e/.env.example`) mirror a subset of this page — when in doubt, use this document.

## Deployment modes

| Mode | `APP_ENV` | `APP_CLIENT` | Auth | Typical use |
| ---- | --------- | ------------ | ---- | ----------- |
| Local web | `local` | `web` (default) | `none` — auto session unless users / admin env exist | `go run .` + Vite dev |
| Desktop | `local` | `desktop` | None — `owner_id` stays `"desktop"` | Tauri app |
| Docker | `docker` | unset / `web` | `none` or `local` (see below) | Single container |
| Server web | `docker` or `local` | `web` | **`local` required** | Reverse-proxy deployment |

Auth mode is resolved after DB bootstrap (`none` \| `local`). Desktop never shows login.

When `APP_CLIENT=web`:

| Mode | When | Behavior |
| ---- | ---- | -------- |
| `none` | No admin env and no users | Auto-mint anonymous session (dev/loopback) |
| `local` | Users exist **or** both `APP_ADMIN_*` set | Email/password login; `dbo_session` cookie |

Do not expose `none` on a network. For public/server web, bootstrap an admin so mode is `local`.

## Backend (`APP_*`)

Read by `backend/config/config.go` and path helpers in `pkg/db`, `pkg/logger`, `secret_store`.

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `APP_PORT` | No | `8080` | HTTP listen port |
| `APP_ENV` | No | — | `local`, `docker`, or `testing` — affects data paths |
| `APP_CLIENT` | No | — | `desktop` or `web` — desktop skips web login |
| `APP_PUBLIC_URL` | No | `http://127.0.0.1:<port>` | Public origin for MCP/API URLs (no trailing slash) |
| `APP_MCP_PUBLIC_URL` | No | `<APP_PUBLIC_URL>/api/mcp` | Override MCP endpoint URL |
| `APP_ADMIN_EMAIL` | No | — | Bootstrap first admin (with password) when no users exist → **local** mode |
| `APP_ADMIN_PASSWORD` | No | — | Bootstrap password (8–40 chars, letter + number). Forced change on first login |
| `APP_ALLOWED_ORIGINS` | No | — | Comma-separated CORS allowlist. **Required** when auth mode is `local` |
| `APP_DATABASE_PATH` | No | OS-specific or `data/dbo.db` | App metadata SQLite file |
| `APP_LOG_PATH` | No | OS-specific | Log directory override |
| `APP_SECRET_KEY_PATH` | No | OS-specific | AES key file for connection secrets |

### Enable local auth

1. Set `APP_ADMIN_EMAIL` + `APP_ADMIN_PASSWORD`, restart → admin created with `must_change_password`.
2. Open UI → sign in → change password.
3. Create members under Settings → Administration → Users.

Factory reset (`POST /api/config/reset`) clears app tables (including users and sessions) and re-runs auth bootstrap: if `APP_ADMIN_*` is set, a new admin is created and mode becomes `local` again; otherwise mode is `none`.

Bootstrap env is ignored after users exist.

### Storage paths by environment

| `APP_ENV` | App DB | Logs / secrets |
| --------- | ------ | -------------- |
| `docker` | `data/dbo.db` (under container workdir) | Under `data/` |
| `local` (default) | `~/Library/Application Support/dbo/` (macOS), `%APPDATA%/dbo/` (Windows), XDG on Linux | Same tree |
| `testing` | `data/testing_dbo.db` | Same as local unless overridden |

Override any path with the `APP_*_PATH` variables above.

### CORS and origins

- **Mode `none` / desktop**: localhost origins are allowed for credentialed requests.
- **Mode `local`**: only `APP_ALLOWED_ORIGINS` plus the app's own origin — localhost is **not** automatically trusted.

## Frontend (Vite)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `VITE_PUBLIC_SERVER_URL` | No | `/api` (relative) | Backend API base URL |
| `VITE_PORT` | No | `3000` | Vite dev server port |

Set in `frontend/.env` or inline. The `npm run dev` script sets `VITE_PUBLIC_SERVER_URL=http://localhost:8080/api` when unset.

Tauri builds inject `TAURI_ENV_*` variables automatically — do not set manually.

## Docker Compose — production (`docker-compose.yml`)

Single service `dbo` — image `ghcr.io/dbo-studio/dbo/dbo:latest`.

| Setting | Default | Notes |
| ------- | ------- | ----- |
| Host port | `9000:9000` | Maps to `APP_PORT` inside container |
| Volume | `./docker/dbo:/backend/data` | Persists app DB, secrets, exports, logs |
| `APP_PORT` | `9000` | Set in compose `environment` |
| `APP_ENV` | `docker` | Set in compose `environment` |
| `APP_PUBLIC_URL` | unset | Set for public/MCP URLs behind a proxy |
| `APP_MCP_PUBLIC_URL` | unset | Optional MCP URL override |
| `APP_ADMIN_EMAIL` | unset | Bootstrap first admin when no users exist |
| `APP_ADMIN_PASSWORD` | unset | Bootstrap password (see policy above) |
| `APP_ALLOWED_ORIGINS` | unset | Comma-separated trusted origins (required in `local` mode) |

Example override at deploy time:

```bash
APP_PUBLIC_URL=https://dbo.example.com \
APP_ADMIN_EMAIL=admin@example.com \
APP_ADMIN_PASSWORD='ChangeMe1' \
APP_ALLOWED_ORIGINS=https://dbo.example.com \
docker compose up -d
```

Or edit `environment:` in `docker-compose.yml`. See [Docker](docker.md) for TLS, proxy, and upgrades.

## Docker Compose — development (`docker-compose.dev.yml`)

Hot-reload API + Vite UI plus optional sample databases. **Not for production.**

```bash
docker compose -f docker-compose.dev.yml up -d
```

| Service | URL / port (defaults) |
| ------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |
| `sample-pgsql` | `localhost:5432` |
| `sample-mysql` | `localhost:3307` → container `3306` |
| `sample-pgsql-ssl` | `localhost:5433` (start service separately if needed) |

### Compose-level port overrides

Docker Compose reads a project-root `.env` file automatically (or you can export variables in the shell). These control **host** ports only:

| Variable | Default | Maps to |
| -------- | ------- | ------- |
| `DB_TEST_PORT` | `5432` | `sample-pgsql` → container `5432` |
| `MYSQL_TEST_PORT` | `3307` | `sample-mysql` → container `3306` |
| `PGSQL_SSL_TEST_PORT` | `5433` | `sample-pgsql-ssl` → container `5432` |

Example — avoid port clashes on the host:

```bash
DB_TEST_PORT=15432 MYSQL_TEST_PORT=13307 \
docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql
```

### `backend` service environment

| Variable | Default in compose | Description |
| -------- | ------------------ | ----------- |
| `APP_PORT` | `8080` | API listen port inside container |
| `APP_ENV` | `docker` | Data paths under container workdir |
| `APP_PUBLIC_URL` | unset | Uncomment in compose when testing MCP/API from outside localhost |
| `APP_MCP_PUBLIC_URL` | unset | Optional MCP URL override |
| `APP_ADMIN_EMAIL` | unset | Optional local-auth bootstrap |
| `APP_ADMIN_PASSWORD` | unset | Optional local-auth bootstrap |
| `APP_ALLOWED_ORIGINS` | unset | Required when mode is `local` (e.g. `http://localhost:3000`) |

Host mapping: `8080:8080`.

### `frontend` service environment

| Variable | Default in compose | Description |
| -------- | ------------------ | ----------- |
| `VITE_PUBLIC_SERVER_URL` | `http://localhost:8080/api` | API base URL for the dev UI |
| `NODE_ENV` | `development` | Node runtime mode |

Host mapping: `3000:3000`.

### Sample database containers

**`sample-pgsql`** (Postgres 16):

| Variable | Value |
| -------- | ----- |
| `POSTGRES_DB` | `default` |
| `POSTGRES_USER` | `default` |
| `POSTGRES_PASSWORD` | `secret` |

Init SQL: `docs/sample_db/public.sql`. Data volume: `docker/data/pgsql/`.

**`sample-mysql`** (MySQL 8.4):

| Variable | Value |
| -------- | ----- |
| `MYSQL_DATABASE` | `default` |
| `MYSQL_USER` | `default` |
| `MYSQL_PASSWORD` | `secret` |
| `MYSQL_ROOT_PASSWORD` | `secret` |

**`sample-pgsql-ssl`** — same credentials as `sample-pgsql`, TLS certs from `docker/pgsql-ssl/certs/`.

Connection strings for manual testing match the e2e defaults in the table below when using default host ports.

## E2E (`e2e/.env`)

Used only by the Playwright harness — not the main app:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3001` | Frontend URL (harness often overrides) |
| `PLAYWRIGHT_API_URL` | `http://127.0.0.1:8080/api` | API URL (harness often overrides) |
| `PGSQL_TEST_HOST` | `127.0.0.1` | Sample Postgres host |
| `PGSQL_TEST_PORT` | `5432` | Sample Postgres port |
| `PGSQL_TEST_USER` | `default` | Sample Postgres user |
| `PGSQL_TEST_PASSWORD` | `secret` | Sample Postgres password |
| `MYSQL_TEST_HOST` | `127.0.0.1` | Sample MySQL host |
| `MYSQL_TEST_PORT` | `3307` | Sample MySQL port |
| `MYSQL_TEST_USER` | `root` | Sample MySQL user |
| `MYSQL_TEST_PASSWORD` | `secret` | Sample MySQL password |
| `PGSQL_SSL_TEST_HOST` | `127.0.0.1` | TLS Postgres host |
| `PGSQL_SSL_TEST_PORT` | `5433` | TLS Postgres port |
| `PGSQL_SSL_TEST_USER` | `default` | TLS Postgres user |
| `PGSQL_SSL_TEST_PASSWORD` | `secret` | TLS Postgres password |

The harness boots an ephemeral API and frontend; these variables point at optional external sample DBs. See [Testing](../development/testing.md).

## Quick copy commands

```bash
cp backend/.env.example backend/.env      # optional local API overrides
cp frontend/.env.example frontend/.env      # optional Vite overrides
cp e2e/.env.example e2e/.env                # optional e2e sample DB ports
```

For Docker Compose port overrides, set variables in a project-root `.env` or inline — no separate compose env example file is required.

## Related

- [Docker](docker.md) — image, volumes, TLS/proxy
- [Security](security.md) — authentication and Safe Mode
- [Getting started](../development/getting-started.md) — local dev stack
- [auth-gateway PRD](../prd/auth-gateway.md)
