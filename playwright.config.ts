import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const retries = Number(process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? 1 : 0));
const serverCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? `npx next dev --hostname 127.0.0.1 --port ${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/screenshots/{testFilePath}/{arg}{ext}',
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  retries,
  reporter: process.env.CI ? [['github'], ['line']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORT),
      TEST_SEED: process.env.TEST_SEED ?? '1',
      UI_SNAPSHOT: process.env.UI_SNAPSHOT ?? '0',
      NEXT_PUBLIC_UI_SNAPSHOT: process.env.NEXT_PUBLIC_UI_SNAPSHOT ?? process.env.UI_SNAPSHOT ?? '0',
    },
  },
});
