# Changelog: SSH tunnel / bastion

Everything on this branch since it split from `dev` at `59cc9ddb` (3 commits, no migrations). Setup and the security model are in `docs/deployment/ssh-tunnel.md`.

## Tunnel

- Postgres and MySQL connections can go through an SSH tunnel, so a database that is only reachable from a bastion or jumpbox can be used like in TablePlus or DBeaver.
- Authentication is a password, a private key (with an optional passphrase) or the ssh-agent of the machine running DBO.
- An optional jump host: DBO connects to the jump host, then to the SSH server through it, then to the database.
- The tunnel opens with the connection and closes with it (disconnect, edit, delete or idle cleanup). It listens on a random port on `127.0.0.1` and frees that port on close.
- A connection URI works too: the host and port are read from it.
- TLS still applies inside the tunnel. With `verify-full`, the certificate is checked against the real database host, not the loopback address.
- Test Connection reports `SSH tunnel ok`. A failure is labelled `ssh:` with the cause: unreachable host, failed login, or a changed host key.

## Security

- SSH host keys are checked on first use. The first key seen for a host is saved to `ssh_known_hosts`, and a later change is refused as a possible man-in-the-middle. The file is `<user config dir>/dbo/ssh_known_hosts`, `data/ssh_known_hosts` in Docker (inside the data volume), or the path in `SSH_KNOWN_HOSTS_PATH`.
- SSH passwords, private keys and passphrases are encrypted in the app database with the app secret key. The API never returns them; it only says whether each one is stored.
- On a shared connection the tunnel uses the owner's stored SSH login. Viewers only see that a tunnel is enabled, not its host or user. Owners and editors see the host and user.

## UI

- New SSH tab in the Postgres and MySQL connection forms: host, port, user, auth method, and an optional jump host.
- A field marked "Stored" keeps its value when left blank on edit. Type a new value to replace it, or switch the auth method to drop it.
- A new tunnel without its password or private key is refused with a clear message. Test Connection now shows the real cause of a validation error instead of "unknown".
- Turning the jump host off, or the whole tunnel off, sticks. Turning the tunnel off keeps its settings for later.

## Tests and tooling

- A `sample-sshd` bastion service in `docker-compose.dev.yml`, with a test-only key in `e2e/fixtures/ssh/`.
- e2e specs for Postgres and MySQL: password, key and jump-host login, wrong password, unreachable bastion, changed host key, hidden secrets, and import and export through the tunnel. A local-auth spec covers what a shared viewer sees.

## Known limits

- ssh-agent login and `verify-full` TLS through the tunnel are implemented but were only checked against the sample setup, not a real agent or a real TLS server.
- Only Postgres and MySQL. SQLite has no network hop, and other engines are not supported.
- A secret cannot be cleared to empty: replace it, or change the auth method.
- Host keys are trusted on first use. In Docker, keep the data volume so the saved keys survive a restart.
- The e2e specs are not wired into CI yet.
