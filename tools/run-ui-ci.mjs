import { spawn } from 'node:child_process';

const command = process.platform === 'win32'
  ? 'npx playwright test --config=playwright.config.ts tests/e2e/visual.spec.ts --reporter=line'
  : 'npx playwright test --config=playwright.config.ts tests/e2e/visual.spec.ts --reporter=line';

const child = spawn(command, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    TEST_SEED: process.env.TEST_SEED ?? '1',
    NODE_ENV: process.env.NODE_ENV ?? 'test',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
