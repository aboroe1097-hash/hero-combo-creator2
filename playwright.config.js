import { defineConfig } from '@playwright/test';

const requestedDevPort = Number(process.env.PLAYWRIGHT_DEV_PORT || 5173);
const devPort =
  Number.isInteger(requestedDevPort) && requestedDevPort >= 1024 && requestedDevPort <= 65535
    ? requestedDevPort
    : 5173;
const devBaseURL = `http://127.0.0.1:${devPort}`;

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: devBaseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${devPort} --strictPort`,
    url: devBaseURL,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
