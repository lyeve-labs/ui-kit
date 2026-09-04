// Minimal svelte-package config. The library needs only preprocessing
// (TypeScript + Svelte) and the a11y gate - no SvelteKit layer.
// svelte-package v2 reads this file for preprocess + onwarn settings.

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),

  // Throw on a11y warnings so library output stays clean.
  //
  // The test was `startsWith('a11y-')`. Svelte 5 renamed every warning code to
  // snake_case, so `a11y_autofocus` never matched and the gate rejected nothing
  // for the whole life of the Svelte 5 port. Both spellings are accepted here
  // rather than only the new one, so the gate keeps working if a dependency
  // still reports an older code.
  onwarn: (warning, handler) => {
    if (/^a11y[-_]/.test(warning.code ?? '')) {
      throw new Error(`a11y violation: ${warning.code}: ${warning.message}`);
    }
    handler?.(warning);
  },
};

export default config;
