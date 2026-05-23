# @lyeve/ui-kit

A clean, accessible Svelte 5 component library — the design system behind [LyEve](https://lyeve.com).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Svelte 5](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/tailwind-v4-38bdf8.svg)](https://tailwindcss.com)

```bash
pnpm add @lyeve/ui-kit
```

```svelte
<script lang="ts">
  import { Button, Card, toast } from '@lyeve/ui-kit';
  import '@lyeve/ui-kit/styles.css';
</script>

<Card title="Welcome">
  <p>Three lines from a clean dark dashboard.</p>
  <Button onclick={() => toast.success('Hello, world!')}>Try it</Button>
</Card>
```

That's it. No config file, no theme provider, no `<script setup>` ceremony.

---

## What's in the box

- **45 components** — buttons, inputs, modals, drawers, tabs, tables, toasts, the works.
- **Two themes** — Soft Dark (default) and Soft Light, switched by a single `data-theme` attribute on `<html>`.
- **One CSS file** — `@lyeve/ui-kit/styles.css` declares every token; the rest is just Tailwind.
- **Svelte 5 native** — built on runes and snippets, fully typed end-to-end.
- **No surprises** — a `<Button />` is a `<button>`, an `<Input />` is an `<input>`. Markup matches the preview.

## Component list

<details>
<summary>45 components, organized by purpose</summary>

**Layout & display**
Card · PageHeader · Divider · Accordion · AccordionItem · Table

**Forms**
Button · ButtonGroup · Input · Textarea · NumberInput · SearchInput · FileInput · Label · Select · MultiSelect · Autocomplete · DatePicker · Checkbox · Radio · RadioGroup · Toggle

**Navigation**
Breadcrumb · Tabs · Pagination · StepIndicator · Dropdown

**Overlays**
Modal · Drawer · Tooltip

**Feedback**
Alert · Banner · Badge · Tag · Indicator · Progress · Spinner · Skeleton · EmptyState · Stat · Kbd

**Media**
Avatar · AvatarGroup

**Theming**
ThemeToggle · Toaster (+ `toast` service)

</details>

## Requirements

- **Svelte 5.0** or newer
- **Tailwind CSS v4** with the `@tailwindcss/vite` plugin
- **Node 20** or newer

## Install

```bash
pnpm add @lyeve/ui-kit
# or npm install @lyeve/ui-kit
# or yarn add @lyeve/ui-kit
```

If you don't have Tailwind v4 yet:

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

## Use

Import the stylesheet once at the top of your app's CSS entry:

```css
/* src/app.css */
@import '@lyeve/ui-kit/styles.css';
```

Then drop components into your routes:

```svelte
<script lang="ts">
  import { Button, Card, Toaster, toast } from '@lyeve/ui-kit';
</script>

<Card title="Profile" description="Update your details.">
  <Button onclick={() => toast.success('Saved.')}>Save</Button>
</Card>

<Toaster />
```

For mounting toasts, the [Toast docs](https://ui.lyeve.com/docs/components/toast) cover the full setup.

## Theming

Two themes ship out of the box. Switch with one attribute:

```html
<html data-theme="light">  <!-- light mode -->
<html>                      <!-- dark mode (default) -->
```

Or use the helpers:

```ts
import { setTheme, toggleTheme, getTheme } from '@lyeve/ui-kit';

setTheme('light');
toggleTheme();    // returns the new theme
getTheme();       // 'dark' | 'light'
```

Avoid the flash-of-wrong-theme by adding the boot script to your `app.html` —
see [docs/theming](https://ui.lyeve.com/docs/theming).

Want to bend the palette to your own brand? Override individual tokens after
the import:

```css
@import '@lyeve/ui-kit/styles.css';

@theme {
  --color-brand:       #ff5e9c;
  --color-brand-light: #ff85b3;
}
```

## Local development

```bash
pnpm install            # install dependencies
pnpm dev                # docs site at http://localhost:5173
pnpm test               # run unit tests
pnpm check              # type-check + svelte-check
pnpm build              # produces dist/ (library) + build/ (docs site)
pnpm package            # build only the library bundle
```

The repository doubles as a SvelteKit library project (everything under `src/lib`)
and its documentation site (everything under `src/routes`). `svelte-package`
emits only the `src/lib` tree, so the docs site stays out of the published bundle.

## Project layout

```
src/
├── lib/                 # → published as @lyeve/ui-kit
│   ├── components/      # 45 .svelte files
│   ├── stores/          # toast.svelte.ts
│   ├── styles/          # theme.css (the one stylesheet)
│   ├── utils/           # cn.ts, theme.ts
│   └── index.ts         # public API
└── routes/              # the docs site (not published)
    ├── _docs/           # docs-site shared components (Sidebar, Preview, …)
    ├── docs/            # /docs/* pages
    ├── playground/      # /playground
    └── +page.svelte     # landing page
```

## Versioning

`@lyeve/ui-kit` follows [SemVer](https://semver.org). While we're under `1.0`,
breaking changes bump the **minor** version; additive changes bump the **patch**.
Every release is logged in [`CHANGELOG.md`](CHANGELOG.md) and on the docs site.

## Contributing

Bug reports, prop suggestions, and component proposals are welcome. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development setup, our coding
conventions, and how we keep the kit feeling cohesive.

## License

MIT. See [`LICENSE`](LICENSE).
