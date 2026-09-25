import { defineConfig } from '@playwright/test';

// The Combos planner's local tool has its own config: its specs drive the loopback
// server (npm run combos:plan) rather than the Vite app. They never press the final
// Save, so js/combos-db.js is not written.
const requestedPort = Number(process.env.COMBOS_PLANNER_PORT || 5396);
const port =
  Number.isInteger(requestedPort) && requestedPort >= 1024 && requestedPort <= 65535
    ? requestedPort
    : 5396;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'combos-planner*.spec.js',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/combos-planner-server.mjs',
    env: { COMBOS_PLANNER_PORT: String(port) },
    url: `${baseURL}/api/combos`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
