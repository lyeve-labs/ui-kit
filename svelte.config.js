// Minimal svelte-package config. The library needs only preprocessing
// (TypeScript + Svelte) and the a11y gate — no SvelteKit layer.
// svelte-package v2 reads this file but works fine with an empty config.

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  // Throw on a11y warnings so library output stays clean.
  onwarn: (warning, handler) => {
    if (warning.code?.startsWith('a11y-')) {
      throw new Error(`a11y violation: ${warning.message}`);
    }
    handler?.(warning);
  },
};

export default config;
