# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Seven internal contracts the components compose from, in the shape of the
  existing field contract: the option filter, the floating panel, the choice
  surface, the page layout, calendar and clock arithmetic, and the tri-state
  roll-up. `FilterFn` is public, so a caller can replace the matcher with its
  own without reaching into a private path.
- `--spacing-panel-max`, `--spacing-nav-indent`, `--spacing-nav-rail` and
  `--spacing-sidebar`.

### Fixed

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
