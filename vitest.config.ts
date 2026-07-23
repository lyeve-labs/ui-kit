import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],

  // Resolve Svelte to its browser build so components can be mounted with
  // @testing-library/svelte (the default server build has no mount()).
  resolve: { conditions: ['browser'] },

  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    coverage: {
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', '*.config.*'],
    },
  },
});
