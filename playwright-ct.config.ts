import { defineConfig, devices } from '@playwright/experimental-ct-svelte';
import { CT_HOST, CT_PORT } from './tests/ct/exclusive-run';

export default defineConfig({
  // The specs live in tests/ct. testDir pointed at './src', which holds none of
  // them, so every run collected zero tests and exited 0: a green component
  // suite that had never executed a single assertion.
  testDir: './tests/ct',
  testMatch: '**/*.ct.spec.ts',
  fullyParallel: true,
  globalSetup: './tests/ct/exclusive-run.ts',
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 15_000,
  use: {
    trace: 'retain-on-failure',
    // The server listens on the IPv4 loopback and the browser asks for it by
    // address. Given localhost, the browser tries ::1 first and reaches any
    // other server listening there.
    baseURL: `http://${CT_HOST}`,
    ctPort: CT_PORT,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
