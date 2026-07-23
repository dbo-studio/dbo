import { type FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  const baseUrl = process.env.PLAYWRIGHT_API_URL;
  if (!baseUrl) {
    throw new Error(
      'PLAYWRIGHT_API_URL is not set. Run tests via `npm test` in e2e/ so the ephemeral stack starts.'
    );
  }

  const res = await fetch(`${baseUrl}/config/reset`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to reset e2e app DB: ${res.status} ${res.statusText}`);
  }
}

export default globalSetup;
