import { type FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  const baseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080/api';
  await fetch(`${baseUrl}/config/reset`, {
    method: 'POST'
  });
}

export default globalSetup;
