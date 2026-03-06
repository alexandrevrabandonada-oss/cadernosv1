import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

async function findFreePort(start = 3100, attempts = 20) {
  for (let port = start; port < start + attempts; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (available) return port;
  }
  throw new Error('No free port available for e2e CI');
}

const port = Number(process.env.PORT ?? await findFreePort());
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const command = process.platform === 'win32'
  ? 'npx playwright test --config=playwright.config.ts --reporter=line'
  : 'npx playwright test --config=playwright.config.ts --reporter=line';

const child = spawn(command, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    TEST_SEED: process.env.TEST_SEED ?? '1',
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    PORT: String(port),
    PLAYWRIGHT_BASE_URL: baseUrl,
    NEXT_DISABLE_DEVTOOLS: process.env.NEXT_DISABLE_DEVTOOLS ?? '1',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
