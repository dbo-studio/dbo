# Docker deployment

DBO Studio publishes a single-container image that serves the built web UI and API together.

## Quick start

```bash
docker run -d \
  -p 9000:9000 \
  -v "$(pwd)/data:/backend/data" \
  ghcr.io/dbo-studio/dbo/dbo:latest
```

Open [http://localhost:9000](http://localhost:9000).

The image defaults to `APP_PORT=9000` and `APP_ENV=docker`. App metadata and secrets persist in `/backend/data` inside the container — mount a volume there.

## Docker Compose (production)

Root `docker-compose.yml`:

```bash
mkdir -p docker/dbo
docker compose up -d
```

| Setting | Value |
| ------- | ----- |
| Image | `ghcr.io/dbo-studio/dbo/dbo:latest` |
| Port | `9000:9000` |
| Volume | `./docker/dbo:/backend/data` |
| Env | `APP_PORT=9000`, `APP_ENV=docker` |

For public deployment, set `APP_PUBLIC_URL`, `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`, and `APP_ALLOWED_ORIGINS` — see [Configuration](configuration.md) and [Security](security.md).

## Image build

Multi-stage `Dockerfile` at repo root:

1. Node 24 builds `frontend/dist`
2. Go 1.27 Alpine builds CGO backend with embedded static files in `backend/out`

CI (`.github/workflows/docker.yml`) pushes to GHCR on pushes to `release`:

```text
ghcr.io/dbo-studio/dbo/dbo:<VERSION>
ghcr.io/dbo-studio/dbo/dbo:latest
```

Build locally:

```bash
docker build -t dbo-local .
docker run -p 9000:9000 -v dbo-data:/backend/data dbo-local
```

## Development stack

`docker-compose.dev.yml` runs hot-reload API + Vite UI plus optional sample databases — **not** for production.

```bash
docker compose -f docker-compose.dev.yml up -d
# Frontend http://localhost:3000, API http://localhost:8080/api
```

Sample DB services:

| Service | Host port | Credentials |
| ------- | --------- | ----------- |
| `sample-pgsql` | 5432 | `default` / `secret`, db `default` |
| `sample-mysql` | 3307 | `default` / `secret`, db `default` |
| `sample-pgsql-ssl` | 5433 | same as Postgres + TLS |

Override host ports with Compose variables `DB_TEST_PORT`, `MYSQL_TEST_PORT`, and `PGSQL_SSL_TEST_PORT` (project-root `.env` or inline) — see [Configuration](configuration.md#docker-compose--development-docker-composedevyml).

## Reverse proxy and TLS

Terminate TLS at nginx, Caddy, or a cloud load balancer. Set:

```bash
APP_PUBLIC_URL=https://dbo.example.com
APP_ADMIN_EMAIL=admin@example.com
APP_ADMIN_PASSWORD=<8-40-chars-letter-and-number>
APP_ALLOWED_ORIGINS=https://dbo.example.com
```

Proxy `/api` and static assets to the container port. WebSocket paths used by AI streaming must be allowed through the proxy with sufficient read/write timeouts.

## MCP over Docker

MCP clients need the public MCP URL. Set either:

- `APP_PUBLIC_URL=https://dbo.example.com` (MCP defaults to `<url>/api/mcp`), or
- `APP_MCP_PUBLIC_URL=https://dbo.example.com/api/mcp`

Enable MCP in Settings → AI after the app is reachable at that URL.

## Upgrades

1. Back up the mounted data volume (`dbo.db`, logs, `app_secret.key`).
2. Pull the new tag: `docker pull ghcr.io/dbo-studio/dbo/dbo:latest`
3. Recreate the container with the same volume mount.
4. Migrations run automatically on startup (Goose).

## Data layout (container)

```text
/backend/data/
├── dbo.db              # app metadata (connections, jobs, AI config)
├── app_secret.key      # AES key for stored credentials
├── exports/            # web export job output
└── logs/
```

Always persist `/backend/data` (or set `APP_DATABASE_PATH` / related overrides consistently).
