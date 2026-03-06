import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { resolvePreferredPort } from './find-free-port.mjs';

const requestedPort = Number(process.env.PORT ?? 3100);
const resolved = await resolvePreferredPort(requestedPort);
const port = resolved.port;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npx playwright test --config=playwright.config.ts tests/e2e/ui-smoke.spec.ts --reporter=line']
  : ['playwright', 'test', '--config=playwright.config.ts', 'tests/e2e/ui-smoke.spec.ts', '--reporter=line'];

await rm(join(process.cwd(), '.next', 'cache'), { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });

if (resolved.usedFallback) {
  console.log(`[e2e-ci] Porta ${requestedPort} ocupada. Usando fallback ${port}.`);
} else {
  console.log(`[e2e-ci] Usando porta ${port}.`);
}
console.log('[e2e-ci] Cache .next/cache limpo antes de subir o dev server de teste.');

const child = spawn(command, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    TEST_SEED: process.env.TEST_SEED ?? '1',
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    PORT: String(port),
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_RETRIES: process.env.PLAYWRIGHT_RETRIES ?? '1',
    NEXT_DISABLE_DEVTOOLS: process.env.NEXT_DISABLE_DEVTOOLS ?? '1',
  },
});

const terminate = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => terminate('SIGINT'));
process.on('SIGTERM', () => terminate('SIGTERM'));

child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
