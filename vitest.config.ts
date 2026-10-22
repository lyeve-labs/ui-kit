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
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      // Named rather than left to the default, so the config states which
      // provider the report came from without reading package.json.
      provider: 'v8',
      // Without an include the report covers whatever a test happened to load,
      // which is not the same set as the code that ships.
      include: ['src/lib/**'],
      // vitest always leaves node_modules, the setup file and its own config
      // out of the report, so this list names only what the include would
      // otherwise pull in from this repository.
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        '**/*.config.{js,ts,mjs,cjs}',
        'dist/**',
        'tests/**',
      ],
    },
  },
});
