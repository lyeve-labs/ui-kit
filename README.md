# @lyeve-labs/ui-kit

A clean, accessible Svelte 5 component library. The design system behind [LyEve](https://lyeve.com).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Svelte 5](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/tailwind-v4-38bdf8.svg)](https://tailwindcss.com)

```bash
pnpm add @lyeve-labs/ui-kit @lucide/svelte
```

```svelte
<script lang="ts">
  import { Button, Card, toast } from '@lyeve-labs/ui-kit';
  import '@lyeve-labs/ui-kit/styles.css';
</script>

<Card title="Welcome">
  <p>Three lines from a clean dark dashboard.</p>
  <Button onclick={() => toast.success('Hello, world!')}>Try it</Button>
</Card>
```

No config file, no theme provider, no setup ceremony.

---

## What's in the box

- **69 components:** buttons, inputs, modals, drawers, tabs, tables, toasts, the works.
- **Two themes:** Soft Dark (default) and Soft Light, switched by a single `data-theme` attribute on `<html>`.
- **One CSS file:** `@lyeve-labs/ui-kit/styles.css` declares every token; the rest is just Tailwind.
- **Svelte 5 native:** built on runes and snippets, fully typed end-to-end.
- **No surprises:** a `<Button />` is a `<button>`, an `<Input />` is an `<input>`. Markup matches the preview.

## Component list

<details>
<summary>69 components, organized by purpose</summary>

**Layout and structure**
Card, Panel, AppShell, AuthShell, PageShell, PageHeader, SectionHeading, Divider, Accordion, AccordionItem, Collapsible, Table, DescriptionList, Toolbar, TreeView

**Forms and inputs**
Button, ButtonGroup, Input, PasswordInput, CopyField, Textarea, NumberInput, SearchInput, FileInput, Label, Field, FormMessage, SegmentedControl, Select, MultiSelect, Autocomplete, DatePicker, TimePicker, DateTimePicker, Checkbox, CheckboxGroup, Radio, RadioGroup, Toggle

**Navigation**
Breadcrumb, Tabs, Pagination, StepIndicator, Dropdown, SidebarNav, AccountMenu

**Overlays**
Modal, Drawer, Tooltip

**Dialogs**
Dialog, DialogContainer, ConfirmDialog (plus the `openDialog` and `confirm` services)

**Feedback and status**
Alert, Banner, Badge, Tag, Indicator, Progress, Spinner, Skeleton, EmptyState, Stat, Kbd, CopyButton

**Media**
Avatar, AvatarGroup, Logo

**Theming**
ThemeToggle, Toaster (plus the `toast` service)

</details>

## Requirements

- **Svelte 5.0** or newer
- **Tailwind CSS v4** with the `@tailwindcss/vite` plugin
- **`@lucide/svelte`** 0.511 or newer, below 2.0
- **Node 20** or newer

## Install

```bash
pnpm add @lyeve-labs/ui-kit @lucide/svelte
# or npm install @lyeve-labs/ui-kit @lucide/svelte
# or yarn add @lyeve-labs/ui-kit @lucide/svelte
```

The icon set is a peer dependency, so it installs once and the application
picks the version. Most applications already depend on it directly, and while
the kit owned a copy of its own they resolved two: the same icons shipped twice
in the bundle and an upgrade on the application's side moved only one of them.
A missing peer is resolved for you by pnpm and by npm, and not by yarn.

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
@import '@lyeve-labs/ui-kit/styles.css';
```

Then drop components into your routes:

```svelte
<script lang="ts">
  import { Button, Card, Toaster, toast } from '@lyeve-labs/ui-kit';
</script>

<Card title="Profile" description="Update your details.">
  <Button onclick={() => toast.success('Saved.')}>Save</Button>
</Card>

<Toaster />
```

Mount the `<Toaster />` component in your root layout to surface toast notifications.
See `src/lib/components/Toaster.svelte` for the full prop list.

## Theming

Two themes ship out of the box. Switch with one attribute:

```html
<html data-theme="light">
  <!-- light mode -->
</html>
<html>
  <!-- dark mode (default) -->
</html>
```

Or use the helpers:

```ts
import { setTheme, toggleTheme, getTheme } from '@lyeve-labs/ui-kit';

setTheme('light');
toggleTheme(); // returns the new theme
getTheme(); // 'dark' | 'light'
```

Avoid the flash-of-wrong-theme by adding the boot script to your `app.html`.
Import `themeBootScript` from `@lyeve-labs/ui-kit` and inline it in `<head>` before any
stylesheets.

Want to bend the palette to your own brand? Override individual tokens after
the import:

```css
@import '@lyeve-labs/ui-kit/styles.css';

@theme {
  --color-brand: #ff5e9c;
  --color-brand-light: #ff85b3;
}
```

## Motion

Every component moves on the same four durations and three curves, declared
in `styles.css` beside the palette:

| Token                 | Value                            | For                                                                                                            |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--duration-fast`     | 120ms                            | a state change in place: colour, opacity, border, shadow, focus                                                |
| `--duration-base`     | 200ms                            | movement in place (a knob, a chevron, a collapse) and a small surface arriving (menu, popover, tooltip, toast) |
| `--duration-slow`     | 320ms                            | a large surface arriving (dialog, drawer)                                                                      |
| `--duration-progress` | 500ms                            | a value moving (a progress bar's width)                                                                        |
| `--ease-enter`        | `cubic-bezier(0.22, 1, 0.36, 1)` | arriving: starts fast and settles                                                                              |
| `--ease-exit`         | `cubic-bezier(0.32, 0, 0.67, 0)` | leaving: starts slow and accelerates away                                                                      |
| `--ease-move`         | `cubic-bezier(0.65, 0, 0.35, 1)` | changing in place                                                                                              |

An exit runs one rung faster than its entrance, on the exit curve. The
`transition-*` utilities default to the fast rung and the move curve, so
`transition-colors` on its own is complete; `duration-base`, `duration-slow`,
`duration-progress`, `ease-enter`, `ease-exit` and `ease-move` are utilities
for the rest. A surface of your own that mounts and unmounts enters and
leaves through the same presets the kit's overlays use:

```svelte
<script>
  import { motion } from '@lyeve-labs/ui-kit';
</script>

{#if open}
  <div transition:motion.popover|global>...</div>
{/if}

{#each items as item (item.id)}
  <li transition:motion.toast|global animate:motion.reorder>...</li>
{/each}
```

`dialog`, `scrim`, `drawer`, `popover` and `toast` read the tokens at run
time, so retuning a token retunes them, and every one of them plays nothing
for a reader who has asked for reduced motion. The `|global` modifier is what
lets the exit play when a parent block removes the surface, so keep it. Do not
write `duration-150`, `ease-out` or `transition-all` beside a kit class: they
are a fifth speed and a fourth curve, and the kit's own test suite refuses
them.

## Sizing

Two ladders, both declared as tokens and both read by name.

A page picks a role and `PageShell` picks the cap:

| `width`   | Cap    | For                                    |
| --------- | ------ | -------------------------------------- |
| `narrow`  | 896px  | one column: a form, a settings pane    |
| `default` | 1152px | a page of stacked cards                |
| `wide`    | 1536px | a data page whose table needs the room |
| `full`    | none   | a canvas or a split pane               |

A surface lifted off the page - `Modal`, `Drawer`, a dialog - takes a rung of
one shared ladder, so the same form is the same size whichever of the three a
page opens it in: `sm` 448px, `md` 576px, `lg` 704px, `xl` 896px, and `full`
1088px for a dialog holding a table.

`Modal` and `Drawer` default to `size="auto"` and take the rung their body
earns: `md` up to four fields, `lg` past four, `xl` past eight. The count is
the fields the panel actually rendered, re-read when the form reveals more, and
a radio or checkbox group counts as the one question it asks. Name a rung and
it is kept.

## Local development

```bash
pnpm install            # install dependencies
pnpm test               # run unit tests
pnpm check              # type-check + svelte-check
pnpm build              # svelte-package + publint → dist/
```

The documentation site lives in its own repo (`lyeve-labs/ui-kit-docs`).
This repo is a single-purpose component library. Nothing but `src/lib/`.

## Project layout

```
src/
└── lib/                 # → published as @lyeve-labs/ui-kit
    ├── components/      # 69 .svelte files
    ├── stores/          # toast.svelte.ts
    ├── styles/          # theme.css (the one stylesheet)
    ├── utils/           # cn.ts, theme.ts
    └── index.ts         # public API
```

## Versioning

`@lyeve-labs/ui-kit` follows [SemVer](https://semver.org). While under `1.0`,
breaking changes bump the **minor** version; additive changes bump the **patch**.
Every release is logged in [`CHANGELOG.md`](CHANGELOG.md) and on the docs site.

Maintainers: the release workflow is [`CONTRIBUTING.md`](CONTRIBUTING.md#releases).

## Contributing

Bug reports, prop suggestions, and component proposals are welcome. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development setup, coding
conventions, and how the kit stays cohesive.

## License

MIT. See [`LICENSE`](LICENSE).
