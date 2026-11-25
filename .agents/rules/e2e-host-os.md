# Playwright: host OS only

Run Playwright E2E on the host OS.

The harness starts `go run`, Vite, and Chromium, and connects to Docker sample databases on `127.0.0.1`. It needs browser launch, local port binding, and Docker access.

## How to run

Use host execution from the first invocation for these commands:

- `cd e2e && npm test …`
- `npm run test:pg` / `test:mysql` / `test:sqlite` / `test:ui`
- `npx playwright install …`
- `docker compose -f docker-compose.dev.yml …` (sample DBs for e2e)
- `npx playwright show-trace …`

In Cursor's Shell tool, select host execution with `required_permissions: ["all"]`. In a shell that already runs on the host, invoke the command directly.

Still use `cd e2e && npm test` (via `run-e2e`). Never `npx playwright test` alone.
