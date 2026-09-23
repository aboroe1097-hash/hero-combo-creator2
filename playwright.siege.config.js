import { defineConfig } from '@playwright/test';

// Eden Siege has its own config so its engine checks can be run on demand —
// a full arena run takes longer than the production smoke pass and needs a
// preview server of its own.
const requestedLocalPort = Number(process.env.PLAYWRIGHT_SIEGE_PORT || 4174);
const localPort =
  Number.isInteger(requestedLocalPort) && requestedLocalPort >= 1024 && requestedLocalPort <= 65535
    ? requestedLocalPort
    : 4174;
const localBaseURL = `http://127.0.0.1:${localPort}`;
const remoteBaseURL = String(process.env.PLAYWRIGHT_BASE_URL || '').trim();
const baseURL = remoteBaseURL || localBaseURL;

export default defineConfig({
  testDir: './tests',
  testMatch: 'eden-siege.spec.js',
  timeout: 180000,
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
