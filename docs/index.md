# DBO Studio documentation

DBO Studio is an open-source database GUI (PostgreSQL, MySQL, SQLite) with a Go API, React web UI, and optional Tauri desktop app.

## Guides

### Development

| Guide | Description |
| ----- | ----------- |
| [Getting started](development/getting-started.md) | Prerequisites, local web stack, sample databases, desktop dev |
| [Building](development/building.md) | Release scripts, backend binary, Tauri desktop, CI publish |
| [Testing](development/testing.md) | Playwright e2e layout, running tests, feature matrix |

### Deployment

| Guide | Description |
| ----- | ----------- |
| [Configuration](deployment/configuration.md) | Environment variables (single source of truth) |
| [Docker](deployment/docker.md) | Production image, compose, volumes, upgrades |
| [Security](deployment/security.md) | Trust model, authentication, Safe Mode, secrets |

## Project references

- [AGENTS.md](../AGENTS.md) — architecture and agent/contributor conventions
- [backend/AGENTS.md](../backend/AGENTS.md) — Go API layers and patterns
- [frontend/AGENTS.md](../frontend/AGENTS.md) — React/TypeScript conventions
- [e2e/README.md](../e2e/README.md) — Playwright harness and feature matrix
- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution process

## Quick links

```bash
# Local web (API + UI)
cd backend && go run .
cd frontend && npm install && npm run dev

# Sample Postgres + MySQL for development / e2e
docker compose -f docker-compose.dev.yml up -d sample-pgsql sample-mysql

# E2E (host machine — not inside a sandbox)
cd e2e && npm test
```

Production Docker image: `ghcr.io/dbo-studio/dbo/dbo:latest` — see [Docker](deployment/docker.md).
