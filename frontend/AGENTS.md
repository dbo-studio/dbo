# Repository Guidelines

## Project Structure & Module Organization
- Core app code lives in `src/` (React + TypeScript).
- Static files are in `public/`; root HTML entry is `index.html`.
- End-to-end tests live in the top-level `../e2e/` package (not under `frontend/`).
- Tooling/config files are at repo root (`vite.config.ts`, `eslint.config.mts`, `tsconfig*.json`, `.prettierrc`).
- Keep feature code grouped by domain inside `src/` and prefer local component/state/hooks colocation.

## Build, Test, and Development Commands
- `npm run dev`: starts Vite dev server with local API URL (`http://localhost:8080/api`).
- `npm run build`: type-checks (`tsc --noEmit`) then creates a production build.
- `npm run preview`: serves the built app locally for smoke checks.
- `npm run lint` / `npm run lint:fix`: run ESLint on `src/` (check/fix).
- `npm run format`: formats `src/` with Prettier.
- `npm run test:e2e`: runs Playwright via the top-level `e2e/` package (ephemeral API + Vite).

## Coding Style & Naming Conventions
- Use TypeScript for all new application code.
- Follow Prettier defaults (configured in `.prettierrc`): 2-space indentation, consistent quotes/line-wrap via formatter.
- Follow ESLint rules in `eslint.config.mts`; run lint before opening a PR.
- Naming: `PascalCase` for React components, `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for true constants.
- Keep files focused; prefer small reusable components and hooks over large monoliths.

## Testing Guidelines
- **E2E only** — do not add Vitest/Jest/`node:test` (or any unit/component tests) under `frontend/`.
- Cover user-visible behavior in Playwright: `../e2e/tests/` with scenario-based names (example: `connections.spec.ts`).
- Add or update E2E tests when UI/behavior changes; update the feature matrix in `../e2e/README.md`.
- Before submitting, run at least `cd e2e && npm test -- tests/<affected>.spec.ts`.
- Follow `.cursor/rules/e2e-qa.mdc` and the `e2e-playwright` skill when writing or fixing e2e.
- See [`../e2e/README.md`](../e2e/README.md) for isolation and run details.

## Commit & Pull Request Guidelines
- Current history mostly follows lowercase, imperative messages with optional Conventional Commit prefixes (`fix:`, `feat:`, `style:`).
- Prefer `type: short description` for new commits (example: `fix: handle null response payload`).
- Keep each commit focused; separate feature work, styling updates, and test changes when possible.
- PRs should include: clear summary, what changed, how it was tested (`npm run lint`, `npm run test:e2e`), and screenshots/GIFs for UI changes.
- Link related issue/ticket IDs when available and call out any env/config updates.

## Security & Configuration Tips
- Do not commit secrets; use environment variables for runtime config.
- Validate API URL assumptions when running locally (`VITE_PUBLIC_SERVER_URL`).
- Review dependency updates carefully for frontend/runtime impact.
