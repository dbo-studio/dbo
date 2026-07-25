import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack, E2E_ROOT } from './start-stack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const isCodegen = args.includes('--codegen');
  const playwrightArgs = args.filter((a) => a !== '--codegen');

  const stack = await startStack();
  process.stderr.write(
    `[e2e] stack ready baseURL=${stack.baseURL} apiURL=${stack.apiURL} dataDir=${stack.dataDir}\n`
  );

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: stack.baseURL,
    PLAYWRIGHT_API_URL: stack.apiURL
  };

  let exitCode = 1;
  try {
    if (isCodegen) {
      exitCode = await run(
        'npx',
        ['playwright', 'codegen', stack.baseURL, ...playwrightArgs.filter((a) => a !== '--ui')],
        env
      );
    } else {
      exitCode = await run(
        'npx',
        ['playwright', 'test', '--config', path.join(E2E_ROOT, 'playwright.config.ts'), ...playwrightArgs],
        env
      );
    }
  } finally {
    await stack.stop();
  }

  process.exit(exitCode);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 * @returns {Promise<number>}
 */
function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: E2E_ROOT,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
