import { defineConfig, devices } from '@playwright/experimental-ct-svelte';

export default defineConfig({
  // The specs live in tests/ct. testDir pointed at './src', which holds none of
  // them, so every run collected zero tests and exited 0: a green component
  // suite that had never executed a single assertion.
  testDir: './tests/ct',
  testMatch: '**/*.ct.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 15_000,
  use: {
    trace: 'retain-on-failure',
    ctPort: 3100,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
