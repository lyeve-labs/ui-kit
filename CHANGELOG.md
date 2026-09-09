# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.22.0] - 2026-09-09

### Added

- `Pagination` takes `count`, the rows the page on screen actually holds, and
  states a range for a list with no total: `jobs 51 to 100` rather than
  `jobs, page 2`. Without a total the component knew where a page started and
  not where it ended, because the last page is short and nothing told it how
  short, so an application whose endpoint reports no row count had to keep its
  own pager to say the sentence. `count` is read only when `total` is absent,
  and a page of no rows still names the page rather than printing an inverted
  range.

## [0.21.0] - 2026-09-09

### Added

- `Pagination` takes `count`, the rows the page on screen actually holds, and
  states a range for a list with no total: `jobs 51 to 100` rather than
  `jobs, page 2`. Without a total the component knew where a page started and
  not where it ended, because the last page is short and nothing told it how
  short, so an application whose endpoint reports no row count had to keep its
  own pager to say the sentence. `count` is read only when `total` is absent,
  and a page of no rows still names the page rather than printing an inverted
  range.

## [Unreleased]

### Added

- `Pagination` takes `count`, the rows the page on screen actually holds, and
  states a range for a list with no total: `jobs 51 to 100` rather than
  `jobs, page 2`. Without a total the component knew where a page started and
  not where it ended, because the last page is short and nothing told it how
  short, so an application whose endpoint reports no row count had to keep its
  own pager to say the sentence. `count` is read only when `total` is absent,
  and a page of no rows still names the page rather than printing an inverted
  range.

## [0.20.0] - 2026-09-09

### Added

- `Pagination` takes a `noun` and names it in the summary: `files 51 to 100 of
  4,210` instead of `51 to 100 of 4,210`, `jobs, page 3` instead of `Page 3`,
  and `No webhooks` instead of `No results`. A console that stacks several
  lists under one page title said which count belonged to which list nowhere.
  The word is plural at every size, because it labels the collection rather
  than agreeing with any figure in the sentence. A caller that passes no noun
  reads exactly as it did before.

- The figures in that summary are grouped: `of 4,210`, not `of 4210`. The pager
  carries the largest number on the screen and sat under tables that already
  grouped their own, so one screen printed the same kind of number two ways.
  Grouping is `en-US` rather than the host's locale, because a server and the
  browser that hydrates its output need not report the same one and the figure
  would change under the reader. The page number of an uncounted list is
  grouped too, since `href` mode puts it in the URL and a link can land deep in
  a list nobody stepped through. The numbered page buttons stay ungrouped: they
  are a fixed square a separator does not fit.

## [0.19.0] - 2026-09-09

### Changed

- `@lucide/svelte` is a peer dependency instead of a dependency, at
  `>=0.511.0 <2`. It was the only runtime dependency the kit owned, and every
  application in the estate depends on it directly too, so each resolved two
  copies: 42MB on disk in one of them, and eleven of the icons it imports
  shipped twice in that application's built bundle. Add `@lucide/svelte`
  alongside the kit if it is not already in your dependencies: a missing peer is
  resolved for you by pnpm and by npm, and not by yarn.

### Added

- Every component lays out with logical properties, so the kit mirrors under
  `dir="rtl"`. It did not: the count was 69 physical directional utilities
  against 16 logical ones, and the visible end of it was a sidebar that stayed
  on the left in a right-to-left page. A unit gate holds the line, because the
  sweep is the easy half and the next component added would have started
  physical again.

- `Button`, `Pagination`, `SegmentedControl`, `Tabs`, `ThemeToggle` and
  `CopyButton` acknowledge a press. `hover:` compiles inside
  `@media (hover: hover)`, which is false on a finger, so a tap ran from rest
  to rest with the action already fired and the control never showed it had
  been touched. Every pressed step moves the same way on both ramps, so a press
  does not read as one gesture in one theme and its opposite in the other.

- `Table` takes `cell` and `truncateAt`, and a single column overrides both
  through `data-cell` and the `--cell-truncate` custom property. One cell
  holding an unbroken token, an API key or a signed URL, pushed the table past
  its container and the columns after it left the screen. `cell` defaults to
  `wrap`, which breaks that token and does nothing else. `truncate` holds a
  cell to one line and keeps the whole value in its title.

- `Pagination` renders links instead of buttons when given an `href` builder,
  and pages from `hasNext` when the endpoint states no `total`. A callback
  pager cannot run before the page hydrates, so paging a server-rendered list
  did nothing at all until the bundle arrived, and a list endpoint that reports
  no count could not drive the component. `page`, `total`, `perPage` and
  `onchange` behave exactly as before.

- The console type scale is declared beside the brand ramp in `styles.css`:
  `--text-xs` through `--text-2xl`, each with its leading. The brand ramp is a
  marketing ramp with no step at 14px, which is the console's body size, so the
  components were built from sizes the token file never mentioned while five
  ramp tokens were referenced by nothing. Nothing renders at a different size
  for this.


### Fixed

- `Button` and `Pagination` drop an href whose scheme no component here will
  emit, and the rule lives in one place instead of two. The URL parser trims
  surrounding whitespace and strips tab, line feed and carriage return from
  anywhere in the value before it reads the scheme, so a tab written inside the
  word `javascript` still navigated while an anchored test on the raw string
  saw an unknown scheme and allowed it through.

- The current row in `SidebarNav` answers the pointer like every other row. It
  was the only paint with no hover step, and it is the tail of the active
  trail, so on any nav deep enough to have sections it is a nested entry:
  beside siblings that all lit up, the row for the page you were on read as the
  one dead entry in the list.

## [0.18.0] - 2026-09-08

### Added

- `Logo` renders the canonical product mark. Every surface that needed it drew
  its own inline SVG, so the mark drifted between them and a change to it had
  no single place to land.

- The theme control offers a system preference alongside light and dark.
  `ThemePreference` is `'light' | 'dark' | 'system'`, and `getThemePreference`,
  `setThemePreference`, `resolveTheme`, `systemTheme`, `nextThemePreference`
  and `watchSystemTheme` are exported with it. A visitor who has expressed no
  preference now follows the operating system, and keeps following it when the
  system flips, rather than staying pinned to whichever theme the first paint
  chose. `getTheme`, `setTheme`, `toggleTheme` and `themeBootScript` are
  unchanged.

- Stacking order, motion and print are declared as tokens. Overlays, drawers,
  modals, dropdowns, tooltips, toasts and the skip link each name their layer
  (`z-overlay`, `z-drawer`, `z-modal`, `z-dropdown`, `z-tooltip`, `z-toast`,
  `z-skip-link`) instead of carrying a bare number. Seven components held
  `z-50` and one held `z-[60]`, so everything at one value fell back to DOM
  order and a tooltip could sit beneath the modal that opened it. Print is
  declared the same way: `data-print="hide"` on chrome, and
  `data-print="unclip"` where a scroll container would otherwise crop the
  printed page to a single screen.

- `Table` fades the edge that has more content to show, so a table wider than
  its container says so instead of ending flush at the boundary.

- `confirm` takes `confirmLabel` and `cancelLabel` through the new
  `ConfirmOptions` type. The dialog has always read them, but reaching them
  meant dropping to the lower level dialog API, so in practice every call site
  took the generic `Confirm` and no confirmation named the action it was
  confirming. A button reading `Delete` says what happens; one reading
  `Confirm` says only that something does.

### Changed

- `PageHeader` and `SectionHeading` sit on the brand type ramp. A `--text-*`
  token sets font size and nothing else, so both headings inherited whatever
  line height their parent happened to have. They now ask for the ramp's
  leading and tracking by name. The level 2 section heading stays at 16px,
  because the ramp holds nothing between 16px and 22px and 16px is the size of
  the card title it has to sit below.

### Fixed

- The skip link moves focus to the main region. It scrolled there and left
  focus behind, so the next Tab went back into the navigation the link exists
  to skip.

- `Dropdown` implements the menu keyboard contract it declares. It took the
  ARIA menu role without the behavior that role promises: arrow keys, Home and
  End, type-ahead, and Escape returning focus to the trigger.

- The icon-only controls in `Autocomplete`, `MultiSelect` and `SearchInput`
  meet a 24px target. The clear and remove affordances were drawn at the size
  of their glyph, which left them under the minimum on touch.

- `Table`'s scroll container is reachable by keyboard, and rows show a hover
  state. A region that scrolls could be scrolled only by pointer.

- The exported `VERSION` agrees with `package.json` again. The 0.17.1 release
  bumped the manifest and the changelog and left the constant at `0.17.0`. The
  two are checked against each other before the package is built, so the
  released tree did not build.

## [0.17.1] - 2026-09-07

### Fixed

- The package listed itself in its own `dependencies`, so the lockfile resolved
  `@lyeve-labs/ui-kit` from the registry as a dependency of `@lyeve-labs/ui-kit`.
  A dependency bump meant for a consumer of the kit had been applied to the kit.
  Nothing imported it. The supply-chain exemption that had been added to let the
  entry install is removed with it.

## [0.17.0] - 2026-09-07

### Added

- `AppShell` takes `collapsible` and a bindable `collapsed`, which put the
  sidebar away above md: and give the control that brings it back the
  hamburger's own square and gutter. Three products render this shell, and a
  page that owns the viewport, a canvas or a split pane, had 240px less than
  the viewport with no way to ask for it back. It is opt-in rather than on by
  default, because a new button in three headers at once is a decision each of
  those products makes for itself, and nothing here persists the state: where
  it is remembered is the app's decision, and the server cannot know, so the
  first paint is always the expanded one. Below md: the flag is ignored, since
  the same aside is the drawer there and honouring it would leave the hamburger
  opening nothing.

## [0.16.0] - 2026-09-06

### Added

- `SectionHeading` takes `variant="eyebrow"`, the small uppercase label the
  consoles head a band of content with. It is a second treatment rather than a
  third level, because the element is a decision about document structure and
  the treatment is not: an eyebrow appears at both levels. The kit never named
  it, so thirty of them shipped hand rolled across two apps in four different
  bottom margins, and two bands on the same page sat different distances from
  their content. The heading carries no margin at either variant - the stack
  around it owns that distance.

## [0.15.0] - 2026-09-06

### Added

- `AppShell`, the authed application frame: the sidebar, the header bar and the
  content column. Three apps each hand rolled this and no two agreed. The
  sidebar was 224px in the admin and 240px in the customer portal and the ops
  console, opaque in two of them and 30% translucent in the third, built from
  `SidebarNav` in one and from inline anchors in the other two. Two of the three
  had no header at all above `md:`, so the page had no name on screen and no
  fixed place for the theme toggle or the account. Every one of those was a
  defensible local choice, and together they read as three products.
- `AccountMenu`, the signed-in identity and the actions that belong to it, at
  the end of the header. Where it lives is the point: two apps put it in the
  bottom left corner of the sidebar and one put it in the header. The sidebar is
  also the worse of the two, because that column is already full height, so
  opening a menu in its last row pushes the last entry - Sign out, every time -
  past the bottom edge of the window. It is a native `details`, so the links and
  the sign-out post keep working on a page that never hydrated.
- `--spacing-header`, the 56px shared by the header bar and the sidebar's brand
  row. The two meet at the top left corner and a 4px disagreement there reads as
  a broken seam.

### Fixed

- `VERSION` reported `0.13.1` from the `0.14.0` package. The constant was not
  bumped with the manifest, so a consumer reading the export to decide whether a
  fix had landed was told it had not.

## [0.14.0] - 2026-09-06

### Changed

- `PageShell` keeps the page gutter and the full-size title on a `fill` page.
  Owning the viewport is a statement about the content pane, so `fill` now drops
  only the content cap and the content gutter. It used to drop the title row's
  gutter too and render the heading through `PageHeader compact`, which made the
  pages that own the viewport the only ones in an app whose name sat at body
  size hard against the window edge: moving between one of those and any other
  page moved where the page began and changed how large its name was. The gutter
  composes from the same `PAGE_PAD` tokens, so the two titles now start at the
  same distance from the edge.

### Added

- `PageShell` takes `compact`, which drops the title to body size and hides the
  description. It was previously implied by `fill` and unreachable on its own, so
  a page with genuinely no room for a heading had to take the full-bleed content
  frame to get the small title, and a full-bleed page could not refuse it.

## [0.13.1] - 2026-09-06

### Fixed

- Controls keep a focus indicator. `CONTROL_BASE` and `CONTROL_MULTILINE` ended
  in `outline-none` and named no replacement, and a utility beats the base
  layer, so they cancelled the global `:focus-visible` outline this theme
  declares for its contrast. Focus was left as a 1px border-colour change on
  every text input, textarea, number and select in the kit. Both now pair the
  silenced outline with `focus-visible:ring-2`, which is what `CONTROL_SEGMENT`
  and `SidebarNav`'s buttons already did.
- `SidebarNav` no longer sets `role="group"` on a section's list. That role
  overrides the implicit `list` role, so every `<li>` inside sat under a parent
  that is not a list, which is an ARIA required-context error and a serious axe
  violation on every admin page that ships a section expanded. Grouping
  semantics belong to a tree, where the parent is a `treeitem`; this is a nav of
  plain links whose disclosure already declares itself through `aria-expanded`
  and `aria-controls`, so the role bought nothing and cost list semantics.

## [0.13.0] - 2026-09-04

The kit did not cover the controls the product needed, so every consuming page
filled the gap with a raw HTML control. A native select opened in operating
system chrome in the middle of a dark theme, a native date input opened the
browser's own calendar, and twelve secret fields took an API key with no way to
check what was pasted. This release adds the missing controls and, more
importantly, the shared contracts that stop the ones already here from drifting
apart again.

### Added

- `PasswordInput`, a text control with a reveal toggle. The button is a real
  `type="button"`, so it cannot submit the form it sits in, and its accessible
  name states the action rather than the state.
- `TimePicker`, with hour, minute and optional second segments in 12- or
  24-hour display over a fixed 24-hour wire format. The segments are separate
  inputs rather than one masked field, because a masked input has a single
  accessible value and re-announces the whole string on every keystroke.
- `CheckboxGroup`, the counterpart `RadioGroup` never had, and both now render
  a real fieldset and legend so the set is announced as a group.
- `SidebarNav`, for navigation nested to any depth, with persisted expansion,
  a collapsed icon rail, `aria-current` on the active leaf and its ancestors,
  and an active rule under which a parent no longer claims its children.
- `TreeView`, for nested data, implementing the WAI-ARIA tree pattern with
  roving tabindex and tri-state checkboxes whose branch state is always
  derived and never stored.
- `PageShell` and `SectionHeading`. Nothing owned the page gutter, so pages
  re-declared it in four spellings, five content widths were in play with no
  rule behind the choice, and fourteen class strings served as a section
  heading. The gutter, the content cap, the centring and the section rhythm
  are now properties of the shell.
- `Checkbox` and `Radio` take an icon, a size, a description, a card variant
  and a screen-reader-only label, spelled identically on both. `Checkbox` also
  takes `indeterminate`, which is bindable because the browser clears the DOM
  property on click and a one-way prop would silently desynchronise.
- A richer `Select`. `mode="listbox"` opts into a custom panel with a search
  field, per-option icons and a custom trigger; `mode="native"` stays the
  default and is never inferred from passing `options`, because 28 of the 34
  call sites sit inside a form and rely on the browser serializing a real
  form-associated element. The `onchange` event signature is frozen for the
  same reason: many call sites pass an unannotated arrow contextually typed
  from it, and one reads `e.currentTarget.form.requestSubmit()`.
- `DateTimePicker`, composing `DatePicker` and `TimePicker` under one label,
  one hint and one error, because they are one field.
- `Field`, the field furniture as a component. `internal/field.ts` is private,
  so a consumer composing a control the kit does not ship had no legal way to
  match it and hand-copied the class strings instead.
- `FormMessage`, for the outcome of a submit. A danger message interrupts with
  `role="alert"`; a confirmation does not.
- `CopyButton`, `SegmentedControl`, `Panel`, `DescriptionList`, `Toolbar` and
  `Collapsible`, each replacing something the estate had hand-rolled: a copy
  affordance with its own timing per page, a radio group drawn as buttons with
  the selection carried by colour alone and no aria state, a lighter grouping
  that did not want to be a `Card`, key and value pairs laid out as div grids
  that convey no relationship, a filter row whose controls sat visibly
  misaligned, and a disclosure that owns only itself.
- `Card` takes `heading`, `headingLevel`, `icon` and `meta`; `Stat` takes
  `size`, `tone` and `mono`. Two apps had each declared their own local `Stat`
  and the two were visually unrelated for the same job.
- Seven internal contracts the components compose from, in the shape of the
  existing field contract: the option filter, the floating panel, the choice
  surface, the page layout, calendar and clock arithmetic, and the tri-state
  roll-up. `FilterFn` is public, so a caller can replace the matcher with its
  own without reaching into a private path.
- `--spacing-panel-max`, `--spacing-nav-indent`, `--spacing-nav-rail` and
  `--spacing-sidebar`.

### Fixed

- `MultiSelect` and `Autocomplete` hand-rolled the popover, the keyboard model,
  the filter and the dismissal that the shared modules now own, and each copy
  carried the same defects. `Autocomplete` closed its panel on a 150ms blur
  timer, so selecting an option worked only because mousedown to click beat the
  timer. Neither set `aria-activedescendant`, so a screen reader was never told
  which row was active. Their option rows were in the tab sequence, so Tab
  walked into the list instead of leaving the field. Escape did not stop
  propagating, so one opened inside a modal closed both. `MultiSelect`'s trigger
  and panel were unlinked in the accessibility tree.
- A spread of ARIA attributes hides the role from the compiler, so it could not
  check `aria-selected` and `aria-required` against it. Three components stated
  the role only through a spread and the armed accessibility gate rejected them
  once it could finally see them.

- The build's accessibility gate had never rejected anything. It tested
  `startsWith('a11y-')` and Svelte 5 renamed every warning code to snake_case,
  so no violation had matched for the whole life of the Svelte 5 port.
- `RadioGroup` kept its focus ring inside the selected branch, so choosing an
  option removed the only indicator a keyboard user had. That is the defect
  `Checkbox` and `Radio` were fixed for one release earlier, still live one
  file away because nothing tested it. It also drew its resting border with
  `line`, which reads 1.25:1, and built its `name` from `Math.random()`.
- `Autocomplete` and `RadioGroup` generated instance ids from `Math.random()`,
  which differs between the server render and hydration, so every
  `aria-controls` and `aria-describedby` built from one pointed at an element
  that did not exist on the client.
- The Playwright component suite had never run a single assertion. Its
  `testDir` pointed at a directory holding none of the sixteen specs, so every
  run collected zero tests and exited green.
- `check-dist` could only ever reject a specifier beginning with `@lyeve`, so
  a component importing a relative path that the published tarball does not
  contain passed the check. It now resolves every relative specifier in `dist`
  against the file that declares it.
- Coverage measured the wrong tree. A user-supplied `exclude` replaces the
  default list rather than extending it, so `node_modules` and `dist` were
  being measured.
- `NumberInput` satisfied the field-contract guard while composing none of it,
  hand-spelling the border it was supposed to take from `controlBorder`.
- `FileInput` drew its dropzone boundary with `line` at 1.25:1 and its hover
  with a fractional brand border, on the one element identifying it as a
  control.
- `Pagination` rendered its elision marker as a literal ellipsis character
  with no `aria-hidden`, so a screen reader read "horizontal ellipsis" between
  page buttons.
- `PageHeader` appended its bottom margin ahead of the consumer's class, so a
  page asking for a different gap shipped two competing margin utilities in one
  attribute and Tailwind's emitted order picked the winner rather than the page.
  The margin is now opt-out through `flush`, which `PageShell` sets because it
  owns the rhythm itself. It is opt-out rather than removed because 43 pages
  across the estate render the component directly and take their heading gap
  from it; deleting it would have moved every one of them by 32px with nothing
  in their own source to explain why.

### Changed

- `--spacing-card`, `--spacing-section` and `--spacing-page-y` now carry their
  measured values. The three described a product that did not exist: card at
  24px matched none of the card surfaces in use, section at 48px matched
  nothing anywhere, and no page rendered an asymmetric gutter. Composing from
  them is now a cleanup rather than a regression.
- The public API guard compares the exported set against the documented list
  in both directions. It previously checked one direction against a hardcoded
  count, so a component added to the entry point and not to the list was
  exported, untested and invisible.

## [0.12.1] - 2026-09-03

### Fixed

- The published tarball carried a test file. `files` ships `src/lib/styles`
  wholesale, because the `styles.css` export points into it, and its test
  exclusions only cover `dist`. The contrast suite now sits beside the other
  library-wide suites in `src/lib`, which is not a published path.

## [0.12.0] - 2026-09-03

Accessibility pass across the library. The palette and the overlay components
both carried defects that every consuming app inherited, and nothing measured
either, so the same component was accessible in one app and not in another.

### Added

- `--color-line-strong`, for the boundary of a control rather than a divider.
  `--color-line` reads 1.25:1 against the surface, which is fine for a rule that
  carries no information and fails SC 1.4.11 for anything whose border is the
  only thing identifying it as a control. Inputs, selects, checkboxes, radios,
  toggles and bordered buttons use the new token; dividers keep `--color-line`.
- `Toggle` accepts an `id`, so a `<Label for>` outside the component can name it.
- A contrast suite that parses `theme.css` and measures every token against the
  grounds it is painted on, including inside a tint of itself, in both palettes.
- Consistency guards for two mistakes that had already shipped: a utility class
  built from a runtime value, and an `aria-modal` surface with no focus handling
  and no accessible name.

### Fixed

- `Modal` and `Drawer` declared `aria-modal="true"` while leaving focus in the
  page behind them, with no focus trap, no initial focus, no focus restore and
  no scroll lock. A screen reader user was told a dialog had opened and then
  carried on reading the document underneath it. The behaviour `Dialog` already
  had is now one shared action that all three use.
- `Modal` had no accessible name and no height bound, so a dialog was announced
  as just "dialog" and content taller than the viewport could not be reached.
- Dialog stacking generated no CSS. The z-index was written as `z-[{zIndex}]`,
  and Tailwind matches complete class names in source text, so no rule was ever
  emitted and every stacked dialog rendered at `z-index: auto`.
- `confirm()` rejected when the user cancelled while documenting that it
  resolves `false`, so `if (await confirm(...))` threw on the ordinary path.
- A clickable `Card` took `role="button"` and `tabindex` from its `onclick` and
  then ignored Enter and Space.
- `Checkbox` and `Radio` carried their focus ring only on the unchecked branch,
  so ticking a box removed the only indicator a keyboard user had.
- Toasts were never announced. Each toast carried `role="status"` and arrived
  with its text already in it, which is not a change to a live region.
- `<Button href disabled>` rendered a working link. `disabled` is not an anchor
  attribute and `disabled:opacity-50` never matches an `<a>`.
- `Tooltip` was unreachable by keyboard, because `focus` and `blur` do not
  bubble to the wrapper they were bound to; unreachable by screen reader,
  because nothing pointed at it; and could not be dismissed, which SC 1.4.13
  requires.
- `Pagination` rendered nothing at all for an empty list, so the "No results"
  string it carried was unreachable, and it wrote its range with an en dash.
- Palette values below the AA floor. On the default dark palette `danger` read
  2.85:1, so every form error in the library was unreadable, and `violet` 3.83:1
  inside its own badge. On the light palette the focus ring read 2.39:1, and
  `brand-light` put near-white text at 2.45:1 on the primary button's hover
  state. `faint`, `success` and `warn` failed on `surface-2`.
- The exported `VERSION` had drifted two releases behind `package.json`, so
  `pnpm build` failed its own version gate and the package could not be built.

## [0.11.4] - 2026-09-02

### Fixed
- The contributing guide named two private internal applications. This is one of
  the few repos that is actually public, and the list told a public reader what
  exists inside the estate for no benefit.

## [0.11.3] - 2026-09-02

### Fixed

- The README sent maintainers to `PUBLISHING.md` for the release workflow. No such file exists; the workflow is in CONTRIBUTING.

### Changed

- CONTRIBUTING documents the branch model: work branches off `dev` and the PR goes back into `dev`, while `main` takes merges and carries the release tags.

## [0.11.2] - 2026-09-01

This release also carries the checkbox fix listed under 0.11.1. That version was
written up and committed but never tagged or published, so the registry went
from 0.11.0 to here and no consumer ever received it.

### Fixed

- The exported `VERSION` still read 0.11.0 while the package called itself
  0.11.1. `build` runs `version:check` first, so the package could not be built
  or republished at all, and anything reading `VERSION` got the release before
  the one it was running.

- A textarea threw away whatever was typed into it before the page finished
  hydrating. It rendered its value as element content, which compiles to a
  plain write of the server's value on the first client pass, so a reply typed
  during the wait was replaced by the empty string the server had sent. The
  field then failed its own `required` check and the submit did nothing. It
  binds the value now, which checks the element before writing and keeps what
  it finds. A rule test holds every textarea in the kit to that.

## [0.11.1] - 2026-08-31

### Fixed

- A click on a checkbox or radio landed on nothing. The visible box is a
  decorative element drawn over the real input, and it sat above it in the
  stacking order without forwarding the event, so the only reliable way to
  toggle one was the keyboard or a click that happened to land on the label.

## [0.11.0] - 2026-08-30

### Fixed

- The accordion panel snapped open and its text landed against the header. It now grows to the height of its own content over 200ms, and the body has room to breathe. The height comes from animating `grid-template-rows` between `0fr` and `1fr`, which resolves to the content's own height in CSS alone - nothing measures, nothing reflows per frame, and content of any size works.
- A stray coloured line under an open accordion header. It was the focus ring: the global `:focus-visible` outline sits two pixels *outside* the element, and the accordion clips its children, so three of its four edges were cropped and the fourth read as a rule. The accordion, the multi-select options and the toast dismiss button now draw an inset ring, which nothing can clip. Every component that clips and contains a button is checked for this.
- The table's row transition had no duration and the table itself had a pointless one. `[&_tbody_tr]:transition-colors duration-150` reads as one thought and is not: the bare duration lands on the element carrying the class. Both halves are scoped to the rows now.
- The table header read as another body row. It has its own ground.

### Added

- The kit honours `prefers-reduced-motion`. Every animation ran regardless of what the reader asked for - the drawer slid, the toast flew in, the indicator's ping looped forever. Handled once in `theme.css`, so it covers components added later too. Durations are reduced rather than zeroed, so anything waiting on an `animationend` still fires.
- The accordion wires its header to its panel: `aria-controls`, `role="region"`, `aria-labelledby`, and `inert` on a closed panel so the tab order and a screen reader agree with what the eye sees.

### Changed

- **A closed accordion panel stays in the DOM.** It has to, for the panel to animate to its own height. It is collapsed to nothing and `inert`, so it is neither visible, focusable, nor announced - but a test asserting the body is *absent* when closed will now fail. Assert `inert` and the collapsed row instead.

## [0.10.1] - 2026-08-30

### Fixed

- `homepage` pointed at `ui.lyeve.com`, which has no DNS record and has never
  resolved. The docs site is served from `ui-kit.lyeve.com`. An estate audit
  noted the mismatch in July; the link has been dead on the npm package page
  since 0.7.0.


## [0.10.0] - 2026-08-30

One sweep, so that no component looks like it came from a different library
than the one beside it. Two internal modules now hold what forty-eight
components each spelled out for themselves, and a source-reading test suite
fails when they drift apart again.

### Added

- `label` on Select, Textarea, NumberInput and SearchInput; `hint` on Select
  and NumberInput. Every field now offers the same set.
- `class` on Button, Checkbox, Radio and Toggle. Button had accepted one only
  through its rest spread, where it replaced the computed class string instead
  of adding to it, so `class="w-40"` silently dropped every variant and size.
- `aria-invalid` and `aria-describedby` on every field. Only Input carried
  either, so a screen reader announced the control and never the reason it was
  rejected.
- `neutral` on Alert, matching Banner, and on Progress, matching the other
  accent components.
- `--spacing-control`, the height of a single-line control, stated once.

### Fixed

- the kit shipped its palette tokens and none of the utility classes its own
  components are built from. Tailwind skips node_modules unless told otherwise,
  so it never read them. A component rendered only the classes its host app
  happened to use elsewhere in its own pages, which is why the same component
  looked different in two apps and why some of it looked unfinished in both.
  `theme.css` now declares `@source`, and every class a component needs comes
  from the kit. Expect the first build after upgrading to add a few kilobytes
  of CSS that should have been there all along.
- a NumberInput sat two pixels short of the Input beside it: it was the one
  control whose height was a literal rather than derived from the same padding
  as the rest.
- Select and Textarea moved their border to `border-brand/50` on focus while
  the other seven fields moved to full strength, and showed `border-danger/70`
  where the rest showed `border-danger`.
- Select, Textarea and NumberInput spaced their label, control and message row
  a quarter-step tighter than the six fields around them.
- Textarea rendered its hint underneath its error. Every field now replaces
  the hint with the error.
- Checkbox was laid out `flex` where Radio and Toggle were `inline-flex`, so it
  stretched to fill its row while they did not.
- Alert, Toaster, Modal, Drawer, Autocomplete, MultiSelect and NumberInput drew
  their close, check, warning and step icons as the literal characters
  `x`, `v`, `!` and `-`, which take whatever weight the reader's font gives
  them. All icons are stroked SVG on one grid.
- every colour transition names its duration rather than inheriting one.

### Changed

- `brand` is the canonical name for the cyan tone. Alert, Banner and the toast
  store called it `info`; Badge, Tag, Indicator and Progress called the same
  colour `brand`. `info` still resolves to `brand`, so `toast.info(...)` and
  `tone="info"` keep working - but `toast.info` now records the tone as
  `brand`, which is visible to anything reading `toast.items[].tone`.
- Button transitions its colours rather than every animatable property.


## [0.9.4] - 2026-08-25

### Fixed

- avatar falls back to initials for a broken image under a script-src policy
  with no unsafe-inline, where the inline handler the server renderer emitted
  was blocked

### Changed

- derive the exported `VERSION` constant from package.json; the build and the
  test suite fail when package.json, `VERSION` and this file disagree

0.9.2 and 0.9.3 were tagged but never reached the registry, so this release
carries their changes as well. 0.9.1 is the last version consumers can install.


## [0.9.3] - 2026-08-23

### Fixed

- brighten dark-palette success and warn tokens to meet AA contrast


## [0.9.2] - 2026-08-23

### Fixed

- raise the faint token above the WCAG AA contrast floor in both palettes


## [0.9.1] - 2026-08-11

### Changed

- Move to node 24 and pnpm 10.33.4.
- Replace em-dashes in comments.

Carries the 0.9.0 changes as well. 0.9.0 was tagged but never published, so this
is the first release to reach the registry since 0.8.4.

## [0.9.0] - 2026-08-06

### Added

- **page-header:** Name the page title for tests.

### Changed

- Apply prettier formatting.

## [0.8.4] - 2026-08-04

### Fixed

- Drop the unused Vite config that made `svelte-package` fail.
- Stop shipping the Playwright component test suites in the published package.

## [0.8.3] - 2026-07-28

Published with no user-facing changes; repository tooling only.

## [0.8.2] - 2026-07-24

### Fixed

- Fix broken HTML example and dead external links in README.
- Remove em dashes from README, CONTRIBUTING, CHANGELOG, and package.json.

## [0.8.1] - 2026-07-23

### Fixed

- Block `javascript:` and `data:` URIs on `href` props in Button and Breadcrumb.
- Guard against null `name`, empty string, and missing accordion context in
  Avatar and AccordionItem.
- Guard against NaN and Infinity in Progress and Pagination.
- Add `typeof document` checks to dialog manager body-scroll functions so the
  module loads safely during SSR.
- Set loading state before calling `closeDialog` in ConfirmDialog to avoid
  updating a component after it unmounts.
- Add `Escape` key `stopPropagation` in Drawer and Modal so parent listeners
  don't also fire.
- Fix Drawer enter animation direction for left-side variant.
- Add blur handler to Autocomplete to close the option list on focus loss.

### Changed

- Replace hardcoded Tailwind colors with semantic design tokens in Dialog,
  ConfirmDialog, and Toggle.
- Replace unsafe `as` type casts with runtime type guards in ConfirmDialog.
- Narrow `Record<string, X>` to specific key unions in Avatar and Toggle.
- Add explicit return types to toast store methods.
- Add `Promise<void>` return types to Dialog dismiss and close handlers.
- Replace `.ts` import extensions with `.js` in dialog components.
- Remove redundant `else` branch in Dropdown `$effect`.
- Add `sideEffects: false` to package.json so bundlers can tree-shake unused
  barrel exports.
- Remove stale `pnpm.overrides.cookie` (no longer a transitive dependency).
- Remove unused `@types/node` dev dependency.
- Loosen `@vitest/coverage-v8` from exact pin to `^2.1.9`.
- Remove dead `build:docs` CI step.
- Remove legacy `package` entry from `.prettierignore`.
- Remove `@sveltejs/kit` type annotation from `svelte.config.js`.

## [0.8.0] - 2026-07-23

### Changed

- Stripped SvelteKit app layer. Ui-kit is now a pure component library.
  Removed `src/routes/` (docs site), `@sveltejs/kit`, `@sveltejs/adapter-static`,
  `tailwindcss`, `@tailwindcss/vite`, and `vite`. The npm package API is unchanged;
  consumers see the same `dist/` output as before.

## [0.7.2] - 2026-07-21

### Fixed

- `Dropdown` menu-item `icon` is a Svelte component prop; the icon test now
  passes a real Lucide component instead of a snippet, matching the documented type.
- Suppressed a false-positive `a11y_no_noninteractive_tabindex` warning on the
  clickable `Card`. The element receives `role="button"` and a focusable
  `tabindex` together whenever `onclick` is set.
- Dialog tests now consume the rejection from `openDialog` when a dialog is
  dismissed, eliminating unhandled promise rejections during the test run.

_No runtime changes to shipped components._

## [0.7.1] - 2026-07-20

### Added

- Additional component unit-test coverage (raised to 80%+).

## [0.7.0] - 2026-07-16

### Added

- `EmptyState` now accepts an `iconSnippet` prop, so consumers can render a
  custom icon component (e.g. a Lucide icon) in the icon chip instead of only a
  text/emoji `icon` string. `iconSnippet` takes precedence over `icon` when both
  are supplied.

## [0.6.2] - 2026-07-13

### Changed

- Apply prettier formatting to component test files.
- Exclude generated CHANGELOG from prettier check.

## [0.6.1] - 2026-07-10

### Changed

- Pin pnpm 9.15.0 in mise to match packageManager + lockfile.
- Add render tests for all primitives + logic coverage.

### Fixed

- Key Pagination ellipses by index to avoid each_key_duplicate.

## [0.6.0] - 2026-07-05

### Added

- Imperative dialog stack (openDialog/confirm), release v0.3.0.

### Changed

- Refine theme tokens.
- Bump deps and pin cookie>=0.7.0 for CVE fix.
- Sync pnpm-lock.yaml with package.json.
- Apply prettier formatting to satisfy CI format gate.

## [0.5.0] - 2026-05-27

### Added

- Brand identity.

### Changed

- v0.2.0.

## [0.4.0] - 2026-05-23

### Added

- Interactive playground page.

### Changed

- README, CHANGELOG, CONTRIBUTING, MEMORY.
- Add GitHub Actions workflow + PR template.
- Green the install + check + test + package + docs-build pipeline.
- Finish reference pages for the remaining 30 components.
- Pre-publish polish.
- Resolve styles.css to source for file: dev workflows.
- PUBLISHING.md + publishConfig for the public npm push.
- Pin Node 20 via mise to fix crypto.getRandomValues on build.
- Ignore PUBLISHING.md and NOTES.md from git tracking.

## [0.3.0] - 2026-05-22

### Added

- Wire up the public API surface.
- Scaffold docs site shell.
- Landing page + getting-started + foundations.

### Changed

- Add reference pages for the launch set.

## [0.2.0] - 2026-05-21

### Added

- cn() class merger and theme helpers.
- Toast service backed by Svelte 5 $state.
- The 45-component primitive set.

## [0.1.0] - 2026-05-20

### Added

- Soft Dark + Soft Light token sheet.

### Changed

- Scaffold svelte-package + sveltekit project.
