# SSH tunnel / bastion

DBO can reach a database that is only routable from an SSH server (a bastion or jumpbox), the way TablePlus, DBeaver and Navicat do. Supported for PostgreSQL and MySQL/MariaDB connections.

## Setup

1. Create or edit a connection and fill the **General** tab with the database host and port **as seen from the SSH server** (for example `10.0.3.12:5432` or `db.internal`).
2. Open the **SSH** tab, enable **Connect through an SSH tunnel** and enter the SSH host, port, user and an authentication method:
   - **Password**
   - **Private key** (paste or load a PEM/OpenSSH key; optional passphrase)
   - **SSH agent** (uses `SSH_AUTH_SOCK` of the machine running DBO)
3. Optional: enable **Connect through a bastion (jump host) first**. DBO connects to the jump host, then to the SSH server through it, then to the database.
4. **Test** reports `SSH tunnel ok` with latency. Failures are labelled `ssh:` with the cause (unreachable host, authentication failed, host key changed, ...).

A connection URI works too; DBO reads the host and port from it.

## Lifecycle

The tunnel opens when DBO opens the connection and closes when the connection is closed (disconnect, edit, delete or idle cleanup). Each tunnel listens on a random port on `127.0.0.1` only and releases it on close.

## Security model

- **The tunnel runs on the machine running the DBO backend.** Desktop: your computer. Web / Docker: the DBO server. Its network, `SSH_AUTH_SOCK` and known-hosts file are what matter, not the browser's.
- **Host keys use trust-on-first-use.** The first key seen for an SSH host is recorded in `ssh_known_hosts` (default: `<user config dir>/dbo/ssh_known_hosts`, override with `SSH_KNOWN_HOSTS_PATH`; in Docker mount a persistent path). A later key mismatch is rejected as a possible man-in-the-middle. If a host key legitimately changed, delete its line from that file.
- **SSH passwords, private keys and passphrases are encrypted at rest** in the app database (AES-GCM with the app secret key) and are never returned by the API. Leave a secret field blank when editing to keep the stored value.
- Shared connections use the owner's stored SSH credentials server-side; viewers never receive them.
- TLS to the database still applies inside the tunnel. With `verify-full`, DBO verifies the certificate against the real database host name, not the loopback address.
- Use a dedicated SSH user restricted to port forwarding (`PermitOpen`, `command="/bin/false"`) on the bastion.

## Jumpbox deployment

Run DBO on (or next to) the jumpbox network when the bastion should not be exposed to developer laptops:

1. Deploy DBO as in [docker.md](docker.md) on a host that can reach the bastion.
2. Mount a persistent volume for the app data so `ssh_known_hosts` and the app secret key survive restarts.
3. Create connections with the SSH tab pointing to the bastion; keep database hosts internal.

Out of scope: cloud IAM auth (RDS IAM), WireGuard and other VPNs.

## Local test bastion

```bash
docker compose -p dbo -f docker-compose.dev.yml up -d sample-pgsql sample-mysql sample-sshd
# bastion 127.0.0.1:2222  user tunnel  password secret  (key: e2e/fixtures/ssh/id_ed25519, test only)
# database hosts from inside: sample-pgsql:5432, sample-mysql:3306
```
