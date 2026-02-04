import { type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  fetch('http://localhost:8080/api/config/reset', {
    method: 'POST'
  });
}

export default globalSetup;
