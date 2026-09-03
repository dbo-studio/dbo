import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.run-env'), override: true });

const chromeUse = {
  ...devices['Desktop Chrome'],
  ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {})
};

const isUiMode =
  process.env.E2E_UI_MODE === '1' ||
  process.argv.some((arg) => arg === '--ui' || arg.startsWith('--ui-'));

const hasProjectFilter = process.argv.some(
  (arg) => arg === '--project' || arg.startsWith('--project=')
);

/**
 * Folder layout:
 *   tests/shared/  — UI chrome + multi-engine once
 *   tests/pg/      — PostgreSQL DB-critical
 *   tests/mysql/   — MySQL DB-critical
 *   tests/sqlite/  — SQLite DB-critical
 *
 * `postgres` project runs shared + pg (shared chrome once).
 * Full `npm test` runs all three projects.
 *
 * Playwright UI Mode selects only the first project unless a preference is saved.
 * `npm run test:ui` therefore uses one project that matches every spec so mysql/
 * sqlite are not hidden. Pass `--project=mysql` (etc.) to keep the engine split.
 */
const engineProjects = [
  {
    name: 'postgres',
    use: chromeUse,
    testMatch: ['**/shared/**/*.spec.ts', '**/pg/**/*.spec.ts']
  },
  {
    name: 'mysql',
    use: chromeUse,
    testMatch: ['**/mysql/**/*.spec.ts']
  },
  {
    name: 'sqlite',
    use: chromeUse,
    testMatch: ['**/sqlite/**/*.spec.ts']
  }
];

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./utils/global.setup'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 1,
  maxFailures: process.env.PLAYWRIGHT_MAX_FAILURES
    ? Number(process.env.PLAYWRIGHT_MAX_FAILURES)
    : 1,
  timeout: 300000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects:
    isUiMode && !hasProjectFilter
      ? [{ name: 'e2e', use: chromeUse, testMatch: '**/*.spec.ts' }]
      : engineProjects
});
