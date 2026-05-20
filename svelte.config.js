// SvelteKit configuration.
//
// The project doubles as a *library* (everything under `src/lib`) and a
// *documentation site* (everything under `src/routes`). `svelte-package`
// only emits files inside `src/lib`, so the docs site stays out of the
// published bundle.

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Static adapter — the docs site is a plain SPA fallback so it can be
    // hosted anywhere (Cloudflare Pages, Netlify, GitHub Pages, S3+CDN…).
    adapter: adapter({
      fallback: 'index.html',
      precompress: false,
    }),

    alias: {
      '$ui': 'src/lib',
    },
  },

  // Throw on a11y warnings so library output stays clean.
  onwarn: (warning, handler) => {
    if (warning.code?.startsWith('a11y-')) {
      throw new Error(`a11y violation: ${warning.message}`);
    }
    handler?.(warning);
  },
};

export default config;
