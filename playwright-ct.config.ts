import { defineConfig, devices } from '@playwright/experimental-ct-svelte';

export default defineConfig({
  testDir: './src',
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
