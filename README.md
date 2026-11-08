# @lyeve-labs/ui-kit

A component library for Svelte 5 and Tailwind CSS 4, with a dark and a light
theme drawn from one stylesheet of design tokens. It is the design system the
[LyEve](https://lyeve.com) applications are built from.

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
  <p>Your account is ready.</p>
  <Button onclick={() => toast.success('Invitation sent.')}>Invite teammate</Button>
</Card>
```

Importing the stylesheet is the only setup. There is no config file and no
theme provider.

## What the package holds

- **Components** for layout, forms, navigation, overlays and feedback, listed below.
- **Two themes:** Soft Dark, the default, and Soft Light, switched by the `data-theme` attribute on `<html>`.
- **One stylesheet:** `@lyeve-labs/ui-kit/styles.css` declares every token, and the components style themselves with Tailwind utilities that read them.
- **Svelte 5 runes and snippets**, with every prop typed.
- **Native elements:** a `<Button />` renders a `<button>` and an `<Input />` an `<input>`.

## Component list

<details>
<summary>Components, organized by purpose</summary>

**Layout and structure**
Card, Panel, AppShell, AuthShell, PageShell, PageHeader, SectionHeading, Divider, Accordion, AccordionItem, Collapsible, Table, DescriptionList, DiffView, Toolbar, TreeView, SortableList, SplitPane

**Forms and inputs**
Button, ButtonGroup, Input, PasswordInput, CopyField, Textarea, NumberInput, SearchInput, FileInput, ColorField, Label, Field, FormMessage, SegmentedControl, FilterChips, Select, MultiSelect, Autocomplete, DatePicker, TimePicker, DateTimePicker, Checkbox, CheckboxGroup, Radio, RadioGroup, Toggle

**Navigation**
Breadcrumb, Tabs, Pagination, StepIndicator, Dropdown, SidebarNav, AccountMenu, AccountMenuItem

**Overlays**
Modal, Drawer, Tooltip

**Dialogs**
Dialog, DialogContainer, ConfirmDialog (plus the `openDialog` and `confirm` services)

**Feedback and status**
Alert, Banner, RefusalNotice, GateNotice, Badge, Tag, Indicator, Progress, Spinner, Skeleton, CheckoutSteps, EmptyState, PluginCart, Stat, Kbd, CopyButton

**Media**
Avatar, AvatarGroup, Logo

**Theming**
ThemeToggle, Toaster (plus the `toast` service)

</details>

## Requirements

- **Svelte 5.0** or newer
- **Tailwind CSS v4** with the `@tailwindcss/vite` plugin
- **`@lucide/svelte`** 0.511 or newer, below 2.0
- **Node 24** or newer

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

Then use the components in your routes:

```svelte
<script lang="ts">
  import { Button, Card, Toaster, toast } from '@lyeve-labs/ui-kit';
</script>

<Card title="Profile" description="Update your details.">
  <Button onclick={() => toast.success('Saved.')}>Save</Button>
</Card>

<Toaster />
```

Mount one `<Toaster />` in your root layout. It takes no props and draws the
toasts the `toast` service queues:

| Call                               | Does                                      |
| ---------------------------------- | ----------------------------------------- |
| `toast.success(message, timeout?)` | queues a success toast and returns its id |
| `toast.info(message, timeout?)`    | the same in the brand tone                |
| `toast.warn(message, timeout?)`    | the same in the warning tone              |
| `toast.error(message, timeout?)`   | the same in the danger tone               |
| `toast.dismiss(id)`                | removes a toast before its timeout        |

`timeout` is in milliseconds and defaults to 4000. A timeout of 0 keeps the
toast until it is dismissed.

## Theming

The kit ships two themes, and one attribute switches between them:

```html
<html data-theme="light">
  <!-- light mode -->
</html>
<html>
  <!-- dark mode (default) -->
</html>
<html data-theme="system">
  <!-- light or dark, as the operating system asks, with no script -->
</html>
```

Or use the helpers, which also store the reader's choice:

```ts
import { setThemePreference, getTheme } from '@lyeve-labs/ui-kit';

setThemePreference('light'); // 'dark', 'light' or 'system', returns the theme applied
getTheme(); // 'dark' | 'light'
```

The helpers write `light` or `dark` to the attribute and resolve the `system`
preference when they run. Only markup names `system`, for a page that runs no
script.

To keep the first paint in the reader's theme, inline the output of
`themeBootScript()` from `@lyeve-labs/ui-kit` in the `<head>` of your
`app.html`, before any stylesheet.

To match your own brand, override individual tokens after the import, once
for each theme. The `@theme` block sets the dark palette. The
light palette is its own rule, and yours outranks the kit's because it comes
after the import. A token you leave out keeps the kit's value, and a page
printed under these rules stays black on white.

```css
@import '@lyeve-labs/ui-kit/styles.css';

@theme {
  --color-brand: #ff5e9c;
  --color-brand-light: #ff85b3;
  --color-brand-deep: #f0508f;
}

html[data-theme='light'] {
  --color-brand: #b51758;
  --color-brand-light: #9f144d;
  --color-brand-deep: #8b1244;
}
```

A page that names `system` takes its light palette from a copy of that rule
inside `@media (prefers-color-scheme: light)`, so its light overrides go there
too:

```css
@media (prefers-color-scheme: light) {
  html[data-theme='system'] {
    --color-brand: #b51758;
    --color-brand-light: #9f144d;
    --color-brand-deep: #8b1244;
  }
}
```

Colors interact. In the light theme a filled button's label is near white,
and the primary button lays a faint white lift over its fill, so a bright
hover color fails there: `#e91e63` as the light `brand-light` leaves the
label at 3.77:1. `checkPalette` finds pairs like that. It runs the contrast
rules the kit's own palettes pass over your colors and returns each pair
below its WCAG 2.2 floor with the theme, where it is painted, the two
tokens, the ratio and the floor. An empty list means the palette passes:

```ts
import { checkPalette } from '@lyeve-labs/ui-kit';

expect(
  checkPalette({
    dark: { brand: '#ff5e9c', 'brand-light': '#ff85b3', 'brand-deep': '#f0508f' },
    light: { brand: '#b51758', 'brand-light': '#9f144d', 'brand-deep': '#8b1244' },
  }),
).toEqual([]);
```

It reads `#rgb` and `#rrggbb`, and it throws on any other format, on a token
it does not check and on a theme other than `dark` and `light`, so a typo
cannot pass.

## A page without a Tailwind build

`styles.css` is Tailwind source, so a page with no Tailwind build of its own
gets no class rules from it. `site.css` is the same stylesheet compiled for
the components a site's blocks draw with: Accordion, AccordionItem, Badge,
Button, Card, Checkbox, Field, FormMessage, Input, Label, SectionHeading and
Textarea. It carries the dark default, the light palette and `system`, so the
page names its scheme on `<html>` as above.

```ts
import '@lyeve-labs/ui-kit/site.css';
```

A static page can link the file from `dist/site.css` instead. Any other
component needs the Tailwind build.

## Motion

Every component moves on the same four durations and three curves, declared
in `styles.css` beside the palette:

| Token                 | Value                            | For                                                                                                            |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--duration-fast`     | 120ms                            | a state change in place: color, opacity, border, shadow, focus                                                 |
| `--duration-base`     | 200ms                            | movement in place (a knob, a chevron, a collapse) and a small surface arriving (menu, popover, tooltip, toast) |
| `--duration-slow`     | 320ms                            | a large surface arriving (dialog, drawer)                                                                      |
| `--duration-progress` | 500ms                            | a value moving (a progress bar's width)                                                                        |
| `--ease-enter`        | `cubic-bezier(0.22, 1, 0.36, 1)` | arriving: starts fast and settles                                                                              |
| `--ease-exit`         | `cubic-bezier(0.32, 0, 0.67, 0)` | leaving: starts slow and accelerates away                                                                      |
| `--ease-move`         | `cubic-bezier(0.65, 0, 0.35, 1)` | changing in place                                                                                              |

An exit runs one rung faster than its entrance, on the exit curve. The
`transition-*` utilities default to the fast rung and the move curve, so
`transition-colors` on its own is complete. `duration-base`, `duration-slow`,
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

A page is a parent block too. When the router replaces it, every exit on it
plays, and the page stays on screen with the new page below it until the last
one ends. Call `motion.swapPage()` just before the router swaps the page, and
the presets play in no time until the next frame, so the new page takes the
old one's place at once:

```svelte
<script>
  import { onNavigate } from '$app/navigation';
  import { motion } from '@lyeve-labs/ui-kit';

  onNavigate((navigation) => {
    if (navigation.from?.url.pathname !== navigation.to?.url.pathname) motion.swapPage();
  });
</script>
```

## Sizing

Two ladders, both declared as tokens and both read by name.

A page picks a role and `PageShell` picks the cap:

| `width`   | Cap    | For                                        |
| --------- | ------ | ------------------------------------------ |
| `narrow`  | 896px  | one column: a form, a settings pane        |
| `default` | 1152px | a page with nothing dense on it            |
| `wide`    | 1536px | a page holding a table or other dense data |
| `full`    | none   | a canvas or a split pane                   |

A surface lifted off the page (`Modal`, `Drawer`, a dialog) takes a rung of
one shared ladder, so the same form is the same size whichever of the three a
page opens it in: `sm` 448px, `md` 576px, `lg` 704px, `xl` 896px, and `full`
1088px for a dialog holding a table.

`Modal` and `Drawer` default to `size="auto"` and take the rung their body
earns: `md` up to four fields, `lg` past four, `xl` past eight. The count is
the fields the panel actually rendered, re-read when the form reveals more, and
a radio or checkbox group counts as the one question it asks. Name a rung and
it is kept.

## Component notes

What a component does beyond its props table.

### A filter kept in the URL

`SegmentedControl` and `FilterChips` take an `href` on each option. When every
option carries one, the options render as plain links: the current one carries
`aria-current="page"`, no change is reported, and the row works before the page
hydrates. Every option carries an `href` or none does, and a row that mixes the
two throws.

```svelte
<FilterChips
  label="Status"
  value={status}
  options={[
    { value: 'all', label: 'All', href: '?status=all' },
    { value: 'open', label: 'Open', count: 7, href: '?status=open' },
  ]}
/>
```

### Hints and errors on a choice row

`SegmentedControl` and `FilterChips` take `id`, `hint`, `error` and
`describedBy`, the field props `Input`, `Select` and `RadioGroup` take. The
hint shows under the row, and an error replaces it. The group points
`aria-describedby` at whichever is on screen, then at the ids in
`describedBy`, so a row inside a `Field` reads that field's message too. A
segmented row of radios carries `aria-invalid` while it shows an error. ARIA
does not allow that attribute on a group, so a row of chips or links reports
its error through the description alone. Both link modes take the same props.

`SegmentedControl` draws its own caption from `label`. Inside a `Field`, which
draws the label already, pass `labelHidden` so the name shows once and the
group keeps it for a screen reader. `FilterChips` draws no caption, and its
`label` only names the group.

```svelte
<SegmentedControl
  label="Billing period"
  options={periods}
  bind:value={period}
  hint="Charged at the start of each period."
  error={form?.errors?.period}
/>
```

### Empty states

`EmptyState` renders its title as an h3, for a list inside a section. On a
page whose only other heading is its h1, pass `level={2}` so the outline does
not skip a level. The title looks the same at either level.

### Copying

`CopyButton` takes `text` for words beside its icon, such as "Copy all codes",
and the words then name the button. `title` adds a tooltip, shown on hover and
on keyboard focus. It never renames the button, and when it says more than the
name it becomes the button's description. `CopyField` shows its value on one
truncated line, and `wrap` shows the whole value across as many lines as it
takes, breaking anywhere, for a key the reader has to check end to end.

A control the kit does not ship copies through the same write and confirms on
the same clock with `CopyState`. Create one while the component initializes,
read `status` in markup, and dispose of it when the component unmounts.

```svelte
<script lang="ts">
  import { Button, CopyState } from '@lyeve-labs/ui-kit';

  let { id }: { id: string } = $props();
  const copy = new CopyState();
  $effect(() => () => copy.dispose());
</script>

<Button variant="ghost" size="sm" onclick={() => copy.copy(id)}>
  {copy.status === 'copied' ? 'Copied' : 'Copy ID'}
</Button>
```

`copyToClipboard(text)` is the write alone. It resolves to whether the copy
worked and never throws. Where the async clipboard is missing, as it is on an
origin without TLS, it falls back to the legacy copy command.

### Page titles

`PageShell` renders the document title once an app states its format, in its
root layout. A page then drops its own title element, which would otherwise
race the shell's. `documentTitle` gives the tab other words than the heading.
A format that reads reactive state, such as a tenant's name, follows it. An app
that states no format gets no title element from the kit.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setDocumentTitleFormat } from '@lyeve-labs/ui-kit';

  let { children } = $props();
  setDocumentTitleFormat((title) => `${title} | Acme`);
</script>

{@render children()}
```

```svelte
<PageShell title="Edit entry" documentTitle={entry.name}>...</PageShell>
```

### A sign-in page in a tenant's colors

`AuthShell` takes a `lockup` snippet that replaces the product mark above the
heading, and passes `class` and `style` to its outer element. Custom properties
set there scope to the page, so a tenant's accent repaints the brand tokens for
everything on it. Inside the `href` link the lockup names the link, so give it
words or an image with alt text.

```svelte
<AuthShell title="Sign in" href="/" style="--color-brand: {tenant.accent}">
  {#snippet lockup()}
    <span class="inline-flex items-center gap-2 text-xl font-semibold text-fg">
      <img src={tenant.logo} alt="" class="size-9" />
      {tenant.name}
    </span>
  {/snippet}
  <form method="POST">...</form>
</AuthShell>
```

### Tone names

`StatusTone` is the tone `Alert`, `Banner` and `Stat` take. `AccentTone` adds
`violet` and is the tone `Badge`, `Tag`, `Indicator` and `Progress` take. An app
that maps its own states onto tones types the map with them.

```ts
import type { StatusTone } from '@lyeve-labs/ui-kit';

const JOB_TONE: Record<JobState, StatusTone> = {
  queued: 'neutral',
  running: 'brand',
  failed: 'danger',
  done: 'success',
};
```

## Local development

The kit is developed on Node 26 and installs with pnpm only. Applications that
consume it need Node 24 or newer and may use any package manager.

```bash
pnpm install            # install dependencies
pnpm test               # run unit tests
pnpm check              # type-check and svelte-check
pnpm build              # svelte-package and publint, into dist/
```

## Project layout

```
src/
└── lib/                 # published as @lyeve-labs/ui-kit
    ├── components/      # the components
    ├── internal/        # shared pieces the package does not export
    ├── stores/          # the toast queue
    ├── styles/          # theme.css, the one stylesheet
    ├── utils/           # theme, palette and class helpers
    └── index.ts         # the public API
```

## Versioning

`@lyeve-labs/ui-kit` follows [SemVer](https://semver.org). While under `1.0`,
breaking changes bump the **minor** version. Additive changes bump the **patch**.
Every release is logged in [`CHANGELOG.md`](CHANGELOG.md).

Maintainers: the release workflow is [`CONTRIBUTING.md`](CONTRIBUTING.md#releases).

## Contributing

Bug reports, prop suggestions and component proposals are welcome. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development setup and the coding
conventions.

## License

MIT. See [`LICENSE`](LICENSE).
