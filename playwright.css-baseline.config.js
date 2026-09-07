import { defineConfig } from '@playwright/test';

// Dedicated config for the computed-style baseline guard. It differs from the
// smoke config in two ways that matter for a long capture run: it reuses an
// already-running dev server (the capture is run repeatedly across a refactor,
// and restarting Vite each time dominates the runtime), and it allows the
// server a realistic cold-start window on this repo.
const port = Number(process.env.PLAYWRIGHT_DEV_PORT || 5173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  workers: 1,
  reporter: 'line',
  use: { baseURL },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 240000,
  },
});
