# Playwright component tests

These exercise real browser behaviour that jsdom cannot: focus management,
keyboard navigation, ARIA correctness, and visual rendering.

**They do not run yet.** `@playwright/experimental-ct-svelte` is not in the
manifest, so the suite has never executed.

The other two thirds of the wiring did land: `playwright-ct.config.ts` exists
and points at this directory, and `package.json` carries a `test:ct` script.
Only the dependency is missing, so `pnpm test:ct` answers `playwright: not
found` rather than saying it is not enabled. Read that error as this paragraph.

They live here rather than beside the components because `src/lib` is what
`svelte-package` publishes. While they sat there, all 15 shipped to npm
consumers as `dist/components/*.ct.spec.js`, each importing a package that is
not a dependency, and they broke both `pnpm check` and `pnpm test`.

To turn them on:

```bash
pnpm add -D @playwright/experimental-ct-svelte
pnpm exec playwright install chromium
```

The config and the script are already in place, so that is the whole of it.
Until the dependency lands the files are inert reference material, and deleting
them is a reasonable alternative.

A spec here is not checked by anything, so it drifts silently: verify each one
against the component's current props before trusting it. `Pagination` had
drifted to `current` and `pageSize` and was corrected on 2026-09-09.
