# Configuration (self-hosted)

Environment variables for the DBO Studio backend (`go run .` / Docker / desktop sidecar).

| Variable | Default | Notes |
|----------|---------|--------|
| `APP_PORT` | `8080` | HTTP listen port |
| `APP_ENV` | `local` | `local` \| `docker` \| `testing` |
| `APP_CLIENT` | `web` | `web` or `desktop` (Tauri sets desktop) |
| `APP_PUBLIC_URL` | — | Public origin for MCP/API URLs |
| `APP_ALLOWED_ORIGINS` | — | Comma-separated CORS allowlist (required when auth mode is `local`) |
| `APP_ADMIN_EMAIL` | — | Bootstrap first admin (with password) when no users exist → **local** mode |
| `APP_ADMIN_PASSWORD` | — | Bootstrap password (8–40 chars, letter + number). Forced change on first login |
| `APP_DATABASE_PATH` | env-specific | App SQLite path |
| `APP_LOG_PATH` | env-specific | Log file path |
| `APP_SECRET_KEY_PATH` | env-specific | AES key material for secrets |

## Auth modes (`APP_CLIENT=web`)

| Mode | When | Behavior |
|------|------|----------|
| `none` | No admin env and no users | Auto-mint anonymous session (dev/loopback) |
| `local` | Users exist **or** both `APP_ADMIN_*` set | Email/password login; `dbo_session` cookie |

Desktop (`APP_CLIENT=desktop`) never shows login; `owner_id` stays `"desktop"`.

## Enable local auth

1. Set `APP_ADMIN_EMAIL` + `APP_ADMIN_PASSWORD`, restart → admin created with `must_change_password`.
2. Open UI → sign in → change password.
3. Create members under Settings → Administration → Users.

Factory reset (`POST /api/config/reset`) clears app tables (including users and sessions) and re-runs auth bootstrap: if `APP_ADMIN_*` is set, a new admin is created and mode becomes `local` again; otherwise mode is `none`.

See also [security.md](./security.md) and [auth-gateway PRD](../prd/auth-gateway.md).
