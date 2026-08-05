import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

// If BASE_URL is set explicitly (e.g. to a staging deployment), we assume
// the target is already running and Playwright should NOT try to spawn a
// local dev stack. Otherwise we default to local dev and boot it ourselves.
const usingExternalTarget = !!process.env.BASE_URL;

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Auto-start the local dev stack unless we're pointed at an external
  // (e.g. staging) target via BASE_URL/API_BASE_URL.
  webServer: usingExternalTarget
    ? undefined
    : [
        {
          command: 'npm run dev',
          cwd: '../server',
          url: `${API_BASE_URL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          env: { NODE_ENV: 'test' },
        },
        {
          command: 'npm run dev -- --port 5173 --strictPort',
          cwd: '../web',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
