import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(E2E_ROOT, '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'backend');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'frontend');
const RUN_ENV_PATH = path.join(E2E_ROOT, '.run-env');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('failed to allocate port')));
        return;
      }
      const { port } = address;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, intervalMs?: number }} [opts]
 */
async function waitForUrl(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} options
 */
function spawnLogged(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const prefix = `[${path.basename(command)}]`;
  child.stdout?.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });

  return child;
}

/**
 * @param {import('node:child_process').ChildProcess} child
 */
function killTree(child) {
  if (!child.pid) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

/**
 * @returns {Promise<{
 *   apiPort: number,
 *   fePort: number,
 *   baseURL: string,
 *   apiURL: string,
 *   dataDir: string,
 *   stop: () => Promise<void>
 * }>}
 */
export async function startStack() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbo-e2e-'));
  const apiPort = await getFreePort();
  const fePort = await getFreePort();

  const dbPath = path.join(dataDir, 'dbo.db');
  const secretPath = path.join(dataDir, 'app_secret.key');
  const logPath = path.join(dataDir, 'logs');
  fs.mkdirSync(logPath, { recursive: true });

  const apiURL = `http://127.0.0.1:${apiPort}/api`;
  const baseURL = `http://127.0.0.1:${fePort}`;

  const backendEnv = {
    ...process.env,
    APP_PORT: String(apiPort),
    APP_ENV: 'local',
    APP_CLIENT: 'web',
    APP_DATABASE_PATH: dbPath,
    APP_SECRET_KEY_PATH: secretPath,
    APP_LOG_PATH: logPath
  };

  const backend = spawnLogged('go', ['run', '.', 'serve'], {
    cwd: BACKEND_ROOT,
    env: backendEnv,
    detached: process.platform !== 'win32'
  });

  await waitForUrl(`${apiURL}/config`);

  const frontendEnv = {
    ...process.env,
    VITE_PORT: String(fePort),
    VITE_PUBLIC_SERVER_URL: '/api',
    API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
    NODE_ENV: 'development'
  };

  const frontend = spawnLogged(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(fePort), '--strictPort'],
    {
      cwd: FRONTEND_ROOT,
      env: frontendEnv,
      detached: process.platform !== 'win32'
    }
  );

  await waitForUrl(baseURL);

  const runEnv = [
    `PLAYWRIGHT_BASE_URL=${baseURL}`,
    `PLAYWRIGHT_API_URL=${apiURL}`,
    `E2E_DATA_DIR=${dataDir}`,
    `E2E_API_PORT=${apiPort}`,
    `E2E_FE_PORT=${fePort}`,
    ''
  ].join('\n');
  fs.writeFileSync(RUN_ENV_PATH, runEnv);

  let stopped = false;
  const stop = async () => {
    if (stopped) {
      return;
    }
    stopped = true;
    killTree(frontend);
    killTree(backend);
    try {
      fs.rmSync(RUN_ENV_PATH, { force: true });
    } catch {
      // ignore
    }
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  for (const child of [backend, frontend]) {
    child.on('exit', (code, signal) => {
      if (!stopped && code !== 0 && code !== null) {
        process.stderr.write(
          `[start-stack] child exited unexpectedly code=${code} signal=${signal}\n`
        );
      }
    });
  }

  return { apiPort, fePort, baseURL, apiURL, dataDir, stop };
}

export { RUN_ENV_PATH, E2E_ROOT, REPO_ROOT };
