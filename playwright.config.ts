import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests of the built bundle (dist/) in a real browser, with the backend mocked (e2e/support/test.ts).
 * Run after every build by scripts/e2e-gate.mjs, which also checks the API call budgets and the bundle size.
 * The app has one env file, so E2E_MODE is not used here.
 */
const PORT = 4320;

export default defineConfig({
  testDir: './e2e',
  outputDir: 'reports/e2e/artifacts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'reports/e2e/results.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
