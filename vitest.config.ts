import { svelte } from '@sveltejs/vite-plugin-svelte';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

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
      // Named rather than left to the default, so the config states which
      // provider the report came from without reading package.json.
      provider: 'v8',
      // Without an include the report covers whatever a test happened to load,
      // which is not the same set as the code that ships.
      include: ['src/lib/**'],
      // A user-supplied exclude REPLACES vitest's defaults rather than adding
      // to them, so the previous three-entry list silently put node_modules,
      // dist and the build config back into the measured tree and the number
      // described the wrong repository.
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/**/*.{test,spec}.{js,ts}',
        '**/*.config.{js,ts,mjs,cjs}',
        'dist/**',
        'tests/**',
      ],
    },
  },
});
