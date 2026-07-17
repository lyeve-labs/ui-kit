import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],

  // Under vitest, resolve Svelte to its browser build so components can be
  // mounted with @testing-library/svelte (the default server build has no
  // mount()). Guarded by VITEST so the published library build is unaffected.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,

  server: {
    port: 5173,
    strictPort: false,
  },

  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    coverage: {
      exclude: [
        'src/routes/**',
        '.svelte-kit/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'svelte.config.js',
        '*.config.*',
      ],
    },
  },
});
