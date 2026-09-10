# Security & threat model (Auth M1)

Short trust model for self-hosted **web** deployments after Auth Gateway M1.

## Trust boundaries

| Surface | Trust |
|---------|--------|
| Desktop (Tauri) | Local trusted client; no DBO login; `owner_id=desktop` |
| Web `none` | Dev/loopback only; anonymous auto-session — do not expose on a network |
| Web `local` | Per-user principals; HttpOnly `dbo_session`; connection ownership = user id |

## Session

- Cookie: `dbo_session`, HttpOnly, SameSite=Lax, Secure on HTTPS (or when `APP_PUBLIC_URL` is https).
- Idle TTL 24h; absolute TTL 7d; logout deletes the server row; login/password change rotates the session.
- CORS: with `local`, only `APP_ALLOWED_ORIGINS` (no automatic localhost trust).

## Bootstrap

- `APP_ADMIN_EMAIL` + `APP_ADMIN_PASSWORD` create the first admin once; password must change before data APIs.
- Bootstrap password must be 8–40 characters and include a letter and a number.
- Bootstrap env is ignored after users exist.
- Passwords hashed with bcrypt; never logged.

## Roles

- `admin` | `member` only. Administration → Users is admin-only.
- SQL ACL is **not** in DBO (DB GRANT + Safe Mode).

## Explicit non-goals (M1)

OIDC, proxy headers, 2FA, CSRF tokens, LDAP, shared auth token mode, desktop-as-remote-client.

## Related

- [configuration.md](./configuration.md)
- [auth-gateway PRD](../prd/auth-gateway.md)
