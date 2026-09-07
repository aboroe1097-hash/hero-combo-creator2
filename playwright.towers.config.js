import { defineConfig } from '@playwright/test';

const requestedDevPort = Number(process.env.PLAYWRIGHT_TOWERS_PORT || 5173);
const devPort =
  Number.isInteger(requestedDevPort) && requestedDevPort >= 1024 && requestedDevPort <= 65535
    ? requestedDevPort
    : 5173;
const devBaseURL = `http://127.0.0.1:${devPort}`;

export default defineConfig({
  testDir: './tests',
  // Every browser spec that exercises Specialization Towers, so the local lane catches a
  // Towers regression without waiting on the full smoke suite.
  testMatch: /p1-specialization-.*\.spec\.js$/,
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: devBaseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${devPort} --strictPort`,
    url: `${devBaseURL}/specialization-towers.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
