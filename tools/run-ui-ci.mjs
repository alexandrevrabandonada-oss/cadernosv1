import { spawn } from 'node:child_process';
import { resolvePreferredPort } from './find-free-port.mjs';
import { ensurePlaywrightBuild } from './ensure-playwright-build.mjs';

const requestedPort = Number(process.env.PORT ?? 3110);
const resolved = await resolvePreferredPort(requestedPort);
const port = resolved.port;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const updateSnapshots = process.env.PLAYWRIGHT_UPDATE_SNAPSHOTS === '1';
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const cli = `npx playwright test --config=playwright.config.ts tests/e2e/visual.spec.ts --reporter=line${updateSnapshots ? ' --update-snapshots' : ''}`;
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', cli]
  : ['playwright', 'test', '--config=playwright.config.ts', 'tests/e2e/visual.spec.ts', '--reporter=line', ...(updateSnapshots ? ['--update-snapshots'] : [])];

await ensurePlaywrightBuild();

if (resolved.usedFallback) {
  console.log(`[ui-ci] Porta ${requestedPort} ocupada. Usando fallback ${port}.`);
} else {
  console.log(`[ui-ci] Usando porta ${port}.`);
}
console.log('[ui-ci] Rodando visual sobre build pronto com next start.');
console.log('[ui-ci] Snapshot mode forçado para estabilizar capturas.');
if (updateSnapshots) {
  console.log('[ui-ci] Atualizando baselines visuais.');
}

const child = spawn(command, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    TEST_SEED: process.env.TEST_SEED ?? '1',
    NODE_ENV: 'development',
    PORT: String(port),
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_RETRIES: process.env.PLAYWRIGHT_RETRIES ?? '0',
    UI_SNAPSHOT: '1',
    NEXT_PUBLIC_UI_SNAPSHOT: '1',
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


