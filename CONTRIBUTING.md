# Contributing to `@lyeve-labs/ui-kit`

Several applications consume the kit, and not all of them are public, so a
component or a prop joins it only when more than one of them needs it. This
document covers the setup, the conventions and the checks a change passes.

## Quick start

```bash
git clone git@github.com:lyeve-labs/ui-kit.git
cd ui-kit
pnpm install
pnpm test
```

You need:

- **Node 26.12.1**, the version `mise.toml` and CI pin
- **pnpm 11.25.0**, pinned by the `packageManager` field. The repository
  installs with pnpm only, and its lockfile is the only one it keeps.

## Repository layout

```
src/
└── lib/             # the published package
    ├── components/  # one component per file
    ├── internal/    # shared pieces the package does not export
    ├── stores/      # the toast queue
    ├── styles/      # theme.css
    ├── utils/       # theme, palette and class helpers
    └── index.ts     # the only public API
tests/
├── ct/              # component specs in a real browser
└── fixtures/        # server renders the hydration tests compare against
```

## Coding conventions

### Components

- One component per file, named as it is exported (`Button.svelte` exports
  `Button`).
- **Svelte 5 only.** Use runes (`$state`, `$derived`, `$effect`) and snippets.
  No `writable()`, no `$:` reactive statements, no `<slot />`.
- **Type the props.** Every component has an explicit `interface Props { ... }`
  and destructures with `let { ... }: Props = $props();`.
- **Forward rest props with `[key: string]: unknown`** when the component is a
  thin wrapper around a native element (Input, Textarea, Select). Consumers
  pass `autocomplete`, `min` and `data-*` attributes through to the element.
- **Read tokens, not hex.** Use `bg-surface`, `text-fg` and `border-line`,
  never `#151D30` or `gray-700`, so a palette change reaches every component.
- **Take a `class` prop.** A consumer appends classes through `class={cls}`
  and adjusts a component without copying it.

### Accessibility

- The Svelte compiler is configured to **throw on any a11y warning** (see
  `svelte.config.js`). Fix the markup rather than turning the check off.
- Every interactive element must be keyboard-reachable and have a visible
  focus style. Reuse the global `:focus-visible` token from `theme.css`.
- Form inputs always have an associated label, either via the `label` prop or
  a wrapping `<Label />` and matching `id`/`for`.

### Naming

- Component files: `PascalCase.svelte`.
- Variants live on a `variant` (visual style) or `tone` (color role) prop.
  A component takes one of the two.
- Sizes are `sm | md | lg`, extended to `xs` or `xl` only where a consumer
  needs the rung.
- Boolean props read positively: `disabled`, not `enabled`. `dismissible`,
  not `notDismissible`.

## Adding a component

1. Create `src/lib/components/<Name>.svelte`.
2. Add an export to `src/lib/index.ts`, in the right section.
3. Write a sentence of JSDoc on every prop, which is what a consumer reads in
   the editor.
4. Add a colocated `<Name>.test.ts`.
5. Add an entry to [`CHANGELOG.md`](CHANGELOG.md) under `[Unreleased]`.

## Verifying changes

Before pushing:

```bash
pnpm check          # tsc and svelte-check
pnpm test           # vitest
pnpm format:check   # prettier
pnpm build          # svelte-package and publint
```

CI runs the same four on every push to `main` and `dev` and on every pull
request against them, and they gate every pull request.

`pnpm test:ct` runs the component specs in `tests/ct` in a real Chromium,
which sees focus, pointer and keyboard behavior that the vitest DOM does
not. Run it when you change how a component handles focus, the keyboard, the
pointer or an overlay. It needs the browser once, outside the repository:
`pnpm exec playwright install chromium`. CI does not run it.

## Commits

We use Conventional Commits:

- `feat: add Banner component`
- `fix(button): apply loading state to disabled buttons`
- `docs(modal): show footer snippet usage`
- `chore: bump tailwindcss to 4.1`
- `refactor(toast): collapse store into a single class`

One logical change per commit. A pull request merges with a merge commit,
never a squash or a rebase, so each commit reaches `dev` as it was written.

## Branches

Two permanent branches, both merge-only:

- **`dev`** is integration and always deployable to staging. Every change starts
  here: branch off `dev`, open a PR back into `dev`.
- **`main`** is production and carries the release tags.

Branch names are `<type>/<slug>`, where type is one of `feat` `fix` `hotfix`
`chore` `docs` `refactor` `perf` `test` `ci`. Rebase onto `dev` rather than
merging `dev` into your branch. Only a hotfix branches off `main`, and it must
be merged back into `dev` afterwards.

One logical change per branch.

## Releases

Releases are cut from `main` after the relevant changelog section is moved
out of `[Unreleased]` and the version is bumped in `package.json`. A
maintainer tags that commit `v<version>`, pushes the tag, and then publishes the
package to npm from that tag.

## Questions

Open an issue with the `question` label.
