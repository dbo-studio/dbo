import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOCK_FILE = path.join(os.tmpdir(), 'dbo-e2e-connection-setup.lock');
const MAX_LOCK_AGE_MS = 120_000;

function isLockStale(): boolean {
  try {
    const stat = fs.statSync(LOCK_FILE);
    return Date.now() - stat.mtimeMs > MAX_LOCK_AGE_MS;
  } catch {
    return false;
  }
}

async function acquireConnectionSetupLock(): Promise<() => void> {
  while (true) {
    try {
      fs.writeFileSync(LOCK_FILE, `${process.pid}:${Date.now()}`, { flag: 'wx' });
      return () => {
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch {
          // ignore
        }
      };
    } catch {
      if (isLockStale()) {
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch {
          // ignore
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

/** Serialize connection modal setup across parallel Playwright workers. */
export async function withConnectionSetupLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = await acquireConnectionSetupLock();
  try {
    return await fn();
  } finally {
    release();
  }
}
