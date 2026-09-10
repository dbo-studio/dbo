# Security

DBO Studio security behavior depends heavily on **deployment mode**. Treat local/desktop and internet-facing server deployments differently.

## Trust model

| Deployment | Assumption | Risk if exposed to network |
| ---------- | ---------- | --------------------------- |
| Desktop / local dev (`none`) | User at the keyboard owns the machine; anonymous auto-session | Low locally — **do not** expose on a network |
| Web `local` | Per-user principals; HttpOnly `dbo_session`; connection ownership = user id | Medium on LAN; use TLS on the public internet |
| Public server | Untrusted clients | **High without `local` auth** — bootstrap an admin and terminate TLS |

Without local auth (`none`), the API issues an owner session to any client that can reach the port. That is intentional for local development but **must not** be exposed on the public internet.

Desktop (`APP_CLIENT=desktop`) never shows login; `owner_id` stays `"desktop"`.

## Local authentication

When auth mode is `local`:

1. Clients sign in with email/password; the API sets an HttpOnly `dbo_session` cookie.
2. All `/api/*` routes require a valid session (except login/health).
3. CORS allows only `APP_ALLOWED_ORIGINS` (localhost is **not** auto-trusted in this mode).

### Session

- Cookie: `dbo_session`, HttpOnly, SameSite=Lax, Secure on HTTPS (or when `APP_PUBLIC_URL` is https).
- Idle TTL 24h; absolute TTL 7d; logout deletes the server row; login/password change rotates the session.
- Database errors during session lookup return 500 — they do not silently mint a new owner.

### Bootstrap

- `APP_ADMIN_EMAIL` + `APP_ADMIN_PASSWORD` create the first admin once; password must change before data APIs.
- Bootstrap password must be 8–40 characters and include a letter and a number.
- Bootstrap env is ignored after users exist.
- Passwords hashed with bcrypt; never logged.

### Roles

- `admin` \| `member` only. Administration → Users is admin-only.
- SQL ACL is **not** in DBO (DB GRANT + Safe Mode).

### Explicit non-goals (M1)

OIDC, proxy headers, 2FA, CSRF tokens, LDAP, shared auth token mode, desktop-as-remote-client.

## Safe Mode

Safe Mode adds a bcrypt-hashed app password that gates destructive SQL and grid edits. Configure in Settings → Security.

- Applies to write operations when enabled
- Re-prompts after sensitive actions in e2e-covered flows
- Stored in app metadata SQLite — not the same as login passwords

## Secret store

Connection passwords and similar credentials are encrypted at rest:

- AES-GCM with a key file (`APP_SECRET_KEY_PATH` or default under app data dir)
- Key file created with mode `0600`
- Passwords are never returned in API responses or logs

AI provider API keys are encrypted when a cipher key is available; failed encryption rejects the update rather than storing plaintext.

## MCP tokens

MCP access uses hashed tokens in the app database. Token comparison uses constant-time checks. Configure MCP in Settings → AI; public URL must match [Configuration](configuration.md) (`APP_PUBLIC_URL` / `APP_MCP_PUBLIC_URL`).

## SQL safety

- **sqlguard** classifies statements (read vs write) before execution on guarded paths.
- Safe Mode blocks writes when enabled.
- Grid filters/sorts use allow-listed operators and quoted identifiers.
- Export `SavePath` on web rejects `..`, absolute paths, and paths outside `exports/`.
- MCP execute path uses read-only AST validation with injected limits.

## Jobs and exports

- Export output on web is confined to `exports/` under app data.
- `GET /jobs/:id/result` refuses to read files outside that directory.
- Job cancel uses conditional status updates to avoid races with completion.

## Logs endpoint

`GET /api/config/logs` requires a validated session. In `local` mode this implies prior login.

## Hardening checklist (public deployment)

- [ ] TLS termination at reverse proxy
- [ ] Auth mode `local` (bootstrap admin via `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`)
- [ ] `APP_PUBLIC_URL` matches public origin
- [ ] `APP_ALLOWED_ORIGINS` lists only trusted frontends
- [ ] Persistent volume backed up (`dbo.db`, `app_secret.key`)
- [ ] Safe Mode enabled if operators share the instance
- [ ] Firewall restricts database connections to known hosts

## Reporting issues

Report security issues responsibly via GitHub Issues with minimal reproduction — avoid posting live credentials or production tokens.

## Related

- [configuration.md](./configuration.md)
- [auth-gateway PRD](../prd/auth-gateway.md)
