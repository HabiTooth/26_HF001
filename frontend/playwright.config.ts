import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.QA_PORT ?? 3100);
const BASE_URL = process.env.QA_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts',
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  projects: [{ name: 'mobile', use: { ...devices['Desktop Chrome'] } }],

  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        env: { NEXT_DIST_DIR: '.next-e2e' },
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
