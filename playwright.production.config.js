import { defineConfig } from '@playwright/test';

const requestedLocalPort = Number(process.env.PLAYWRIGHT_LOCAL_PORT || 4173);
const localPort =
  Number.isInteger(requestedLocalPort) && requestedLocalPort >= 1024 && requestedLocalPort <= 65535
    ? requestedLocalPort
    : 4173;
const localBaseURL = `http://127.0.0.1:${localPort}`;
const remoteBaseURL = String(process.env.PLAYWRIGHT_BASE_URL || '').trim();
const baseURL = remoteBaseURL || localBaseURL;

export default defineConfig({
  testDir: './tests',
  testMatch: 'production-smoke.spec.js',
  timeout: 120000,
  workers: 1,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  ...(remoteBaseURL
    ? {}
    : {
        webServer: {
          command: `npm run preview -- --host 127.0.0.1 --port ${localPort} --strictPort`,
          url: localBaseURL,
          reuseExistingServer: false,
          timeout: 60000,
        },
      }),
});
