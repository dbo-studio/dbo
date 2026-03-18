# Repository Guidelines

## Project Structure & Module Organization
- Core app code lives in `src/` (React + TypeScript).
- Static files are in `public/`; root HTML entry is `index.html`.
- End-to-end tests and Playwright config are in `e2e/`.
- Tooling/config files are at repo root (`vite.config.ts`, `eslint.config.mts`, `tsconfig*.json`, `.prettierrc`).
- Keep feature code grouped by domain inside `src/` and prefer local component/state/hooks colocation.

## Build, Test, and Development Commands
- `npm run dev`: starts Vite dev server with local API URL (`http://localhost:8080/api`).
- `npm run build`: type-checks (`tsc --noEmit`) then creates a production build.
- `npm run preview`: serves the built app locally for smoke checks.
- `npm run lint` / `npm run lint:fix`: run ESLint on `src/` (check/fix).
- `npm run format`: formats `src/` with Prettier.
- `npm run test:e2e`: runs Playwright tests using `e2e/playwright.config.ts`.

## Coding Style & Naming Conventions
- Use TypeScript for all new application code.
- Follow Prettier defaults (configured in `.prettierrc`): 2-space indentation, consistent quotes/line-wrap via formatter.
- Follow ESLint rules in `eslint.config.mts`; run lint before opening a PR.
- Naming: `PascalCase` for React components, `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for true constants.
- Keep files focused; prefer small reusable components and hooks over large monolith files.

## Testing Guidelines
- Primary automated tests are E2E with Playwright.
- Place tests under `e2e/` with clear scenario-based names (example: `auth-login.spec.ts`).
- Add or update E2E tests for user-visible behavior changes.
- Before submitting, run at least `npm run test:e2e` for affected flows.

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
