# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
