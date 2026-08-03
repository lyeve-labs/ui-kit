# Playwright component tests

These exercise real browser behaviour that jsdom cannot: focus management,
keyboard navigation, ARIA correctness, and visual rendering.

**They do not run yet.** `@playwright/experimental-ct-svelte` is not in the
manifest and no script invokes them, so the suite has never executed.

They live here rather than beside the components because `src/lib` is what
`svelte-package` publishes. While they sat there, all 15 shipped to npm
consumers as `dist/components/*.ct.spec.js`, each importing a package that is
not a dependency, and they broke both `pnpm check` and `pnpm test`.

To turn them on:

```bash
pnpm add -D @playwright/experimental-ct-svelte
pnpm exec playwright install chromium
```

Then add a `playwright-ct.config.ts` with `testDir: './tests/ct'` and a
`test:ct` script. Until that happens the files are inert reference material,
and deleting them is a reasonable alternative.
