# Playwright component tests

These exercise real browser behavior that jsdom cannot: focus management,
keyboard navigation, ARIA correctness, and visual rendering.

They run with `pnpm test:ct`, which is part of the kit's local gate. A first
run on a machine needs the browser:

```bash
pnpm exec playwright install chromium
```

The test page loads no stylesheet, so a spec that measures color, such as the
axe checks in `axe.ct.spec.ts`, adds the kit's styles through `kit-css.ts`.

They live here rather than beside the components because `src/lib` is what
`svelte-package` publishes. While they sat there, all 15 shipped to npm
consumers as `dist/components/*.ct.spec.js`, each importing a package that is
not a dependency, and they broke both `pnpm check` and `pnpm test`.

A spec here runs only when somebody runs the gate, because no CI job runs it,
so verify each one against the component's current props before trusting it.
`Pagination` had drifted to `current` and `pageSize` and was corrected on
2026-09-09.
