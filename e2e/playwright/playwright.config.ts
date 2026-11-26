import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const useExternalBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const launchArgs = process.env.CI || process.env.CODESPACES ? ['--no-sandbox'] : [];

export default defineConfig({
  testDir: './tests',
  outputDir: '../../test-results/playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    headless,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    launchOptions: {
      args: launchArgs,
    },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // Mobile Web responsive viewport (not a substitute for native Android Maestro tests)
      name: 'chromium-mobile-web',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  ...(useExternalBaseUrl
    ? {}
    : {
        webServer: {
          command: 'node ./serve-web.cjs',
          cwd: __dirname,
          url: `http://127.0.0.1:${port}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
