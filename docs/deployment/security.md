# Security

DBO Studio security behavior depends heavily on **deployment mode**. Treat local/desktop and internet-facing server deployments differently.

## Trust model

| Deployment | Assumption | Risk if exposed to network |
| ---------- | ---------- | --------------------------- |
| Desktop / local dev | User at the keyboard owns the machine | Low — same as any local DB tool |
| Docker on LAN | Trusted operators | Medium — enable `APP_AUTH_TOKEN` |
| Public server | Untrusted clients | **High without auth** — always set `APP_AUTH_TOKEN` + TLS |

Without `APP_AUTH_TOKEN`, the API issues an owner session to any client that can reach the port. That is intentional for local development but **must not** be exposed on the public internet.

## Server authentication

When `APP_AUTH_TOKEN` is set (≥ 32 characters):

1. Process logs a SHA-256 prefix of the token at boot (never the raw token).
2. Clients call `POST /api/config/auth` with the token to obtain a session cookie.
3. All `/api/*` routes require a valid owner session.
4. CORS allows only `APP_ALLOWED_ORIGINS` (localhost is **not** auto-trusted in this mode).

Generate a strong token:

```bash
openssl rand -hex 32
```

## Safe Mode

Safe Mode adds a bcrypt-hashed app password that gates destructive SQL and grid edits. Configure in Settings → Security.

- Applies to write operations when enabled
- Re-prompts after sensitive actions in e2e-covered flows
- Stored in app metadata SQLite — not the same as `APP_AUTH_TOKEN`

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

## Sessions

- Session cookies identify the owner for jobs, connections, and settings.
- Database errors during session lookup return 500 — they do not silently mint a new owner.
- Server-web sessions require prior token exchange.

## Logs endpoint

`GET /api/config/logs` requires a validated session. In server-web mode this implies prior authentication.

## Hardening checklist (public deployment)

- [ ] TLS termination at reverse proxy
- [ ] `APP_AUTH_TOKEN` set (≥ 32 chars, high entropy)
- [ ] `APP_PUBLIC_URL` matches public origin
- [ ] `APP_ALLOWED_ORIGINS` lists only trusted frontends
- [ ] Persistent volume backed up (`dbo.db`, `app_secret.key`)
- [ ] Safe Mode enabled if operators share the instance
- [ ] Firewall restricts database connections to known hosts

## Reporting issues

Report security issues responsibly via GitHub Issues with minimal reproduction — avoid posting live credentials or production tokens.
