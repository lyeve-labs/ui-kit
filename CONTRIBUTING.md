# Contributing to `@lyeve/ui-kit`

The kit is small on purpose. Every addition has to earn its place across
the three apps that consume it (`core-admin`, the customer portal, and the
marketing site). This document lays out the bar.

## Quick start

```bash
git clone git@github.com:LyEve-Labs/ui-kit.git
cd ui-kit
pnpm install
pnpm test         # verify everything works
```

You'll need:

- **Node 20** or newer
- **pnpm 9.15** (the `packageManager` field pins it)

## Repository layout

```
src/
└── lib/             # the published package
    ├── components/  # 48 .svelte files, one component per file
    ├── stores/      # runed stores (toast.svelte.ts)
    ├── styles/      # theme.css
    ├── utils/       # cn.ts, theme.ts
    └── index.ts     # the *only* public API
```

This is a single-purpose component library. The docs site lives in
`LyEve-Labs/ui-kit-docs`.

## Coding conventions

### Components

- One component per file, matching the export name (`Button.svelte` →
  `export { Button }`).
- **Svelte 5 only.** Use runes (`$state`, `$derived`, `$effect`) and snippets.
  No `writable()`, no `$:` reactive statements, no `<slot />`.
- **Type the props.** Every component has an explicit `interface Props { … }`
  and destructures with `let { … }: Props = $props();`.
- **Forward rest props with `[key: string]: unknown`** when the component is a
  thin wrapper around a native element (Input, Textarea, Select). Consumers
  expect `autocomplete`, `min`, `data-*`, and friends to just work.
- **Read tokens, not hex.** Use `bg-surface`, `text-fg`, `border-line`.
  never `#151D30` or `gray-700`. The whole point of the library is one source
  of palette truth.
- **`class` prop wins.** Always allow consumers to append classes via
  `class={cls}` so they can punch through styling without forking.

### Accessibility

- The Svelte compiler is configured to **throw on any a11y warning** (see
  `svelte.config.js`). Don't disable the check. Fix the markup.
- Every interactive element must be keyboard-reachable and have a visible
  focus style. Reuse the global `:focus-visible` token from `theme.css`.
- Form inputs always have an associated label, either via the `label` prop or
  a wrapping `<Label />` and matching `id`/`for`.

### Naming

- Component files: `PascalCase.svelte`.
- Variants live on a `variant` (visual style) or `tone` (colour role) prop.
  Pick one per component and stick with it.
- Sizes are always `sm | md | lg` (or extend up to `xl`/`xs` only when
  genuinely useful).
- Boolean props read positively: `disabled`, not `enabled`. `dismissible`,
  not `notDismissible`.

## Adding a component

1. Create `src/lib/components/<Name>.svelte`.
2. Add an export to `src/lib/index.ts`, in the right section.
3. Add a documentation page in the `ui-kit-docs` repo under
   `src/routes/docs/components/<name>/+page.svelte` with at least a short
   description, two preview examples, and a complete `<PropTable />`.
4. Add the page to `src/routes/_docs/nav.ts` in the docs repo.
5. Update [`CHANGELOG.md`](CHANGELOG.md) under `[Unreleased]`.

## Verifying changes

Before pushing:

```bash
pnpm check          # tsc + svelte-check
pnpm test           # vitest
pnpm format:check   # prettier
pnpm build          # ensure svelte-package + publint pass
```

CI runs the same set on every PR.

## Commits

We use Conventional Commits:

- `feat: add Banner component`
- `fix(button): apply loading state to disabled buttons`
- `docs(modal): show footer snippet usage`
- `chore: bump tailwindcss to 4.1`
- `refactor(toast): collapse store into a single class`

One logical change per commit. Squash before merging if a PR has noise.

## Releases

Releases are cut from `main` after the relevant changelog section is moved
out of `[Unreleased]` and the version is bumped in `package.json`. Tag the
commit `v<version>` and push. CI handles the npm publish.

## Questions

Open an issue with the `question` label, or reach out in the LyEve Discord.
