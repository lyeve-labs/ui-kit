# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.29.0] - 2026-09-24

### Changed

- `Logo` draws the brand book lockup: a bold wordmark with the E in the brand
  accent, and the mark's faces in the brand book's colours for each theme, the
  same lockup the documentation and marketing sites ship. The mark used to
  borrow the text ramp, which darkens for contrast in the light theme and put
  the top face darker than the front.
- The mark paints from its own tokens: `--color-mark-ink`, `-foot`, `-step`,
  `-top`, `-side`, `-face` and `-accent`. A host that overrides `--color-brand`
  no longer recolours the mark; override the `--color-mark-*` tokens instead.
- The wordmark is announced once as "LyEve" rather than in fragments.

### Fixed

- Under forced colors the mark's neutral faces take `CanvasText` and
  `GrayText`, so the column no longer disappears on a high-contrast canvas.
- Printing keeps the light-theme faces, so the column is not white on paper.

## [0.28.0] - 2026-09-23

### Added

- `Banner` takes `autoDismiss`, on the same terms as `Alert`: a confirmation
  clears itself after five seconds and carries a close button, the timer holds
  while somebody is reading it, and a warning or a failure stays until
  dismissed. Which of the two components a surface reached for decided whether
  its confirmation ever left the screen.

## [0.27.0] - 2026-09-23

### Added

- `Alert` takes `autoDismiss`. A confirmation clears itself after five seconds
  and carries a close button, so nobody has to wait for it. The timer holds
  while the pointer is over the alert or focus is inside it. A warning and a
  failure are unaffected: they stay until dismissed, because the reader has to
  act on them.

### Changed

- `Alert` picks its live region from its tone. A failure and a warning take
  `role="alert"` and interrupt; a confirmation, a neutral note and a brand note
  take `role="status"` and wait for a pause. An assertive region that then
  removes itself is the worst of both.
- `AppShell` eases the sidebar between the rail and the expanded column, and
  eases the rail's elevation with it. Both changed in a single frame before.

### Fixed

- An icon inside a `Badge` took a line of its own, so a pill carrying a count
  and a glyph rendered two rows tall. Preflight makes every svg a block and the
  badge's label is a block, which is what gives it its ellipsis; the icon is
  inline again and sits on the text's optical centre.
- `Toggle` carries the `data-field` marker. Without it the fit that sizes an
  overlay to the form inside it could not see a toggle, and six drawers in the
  consuming applications opened a rung too narrow. The suite that checks for
  the marker now finds a control that is its own label, which is the shape it
  was missing.

## [0.26.0] - 2026-09-22

### Added

- One width ladder for every surface lifted off the page, and a `size` that
  measures instead of guessing. `Modal`, `Drawer` and the dialog stack kept
  three ladders and none agreed, so the same form read at 672px, 384px or
  512px depending on which surface a page opened it in. The five rungs are
  `--container-overlay-sm|md|lg|xl|full` (448, 576, 704, 896, 1088), each
  wider than the widest rung it replaces. `Modal` and `Drawer` default to
  `size="auto"`, which takes `md` up to four fields, `lg` past four and `xl`
  past eight; the count is read from the `data-field` marker every labelled
  control now carries, so a radio group counts once and a form that reveals
  fields while it is open is re-measured. A caller that names a rung keeps it.

- `AuthShell`, the frame for a page the app shell does not wrap: sign in,
  sign up, a password reset, an invitation, first-run setup. A full-height
  main on the ink token, a centred column at `md` (a form) or `lg` (a
  walkthrough), the lockup, one `h1` at one size, an optional description,
  the children on a card, an optional `actions` row above (a theme toggle)
  and an optional `footer` line under the card (the one link off the page).
  Every console hand-wrote this frame and no two agreed: three heading
  sizes, a lockup on some pages, a theme control on others, and one class
  that named no token at all. `AppShell` states the signed-in frame once;
  this states the signed-out one.

### Changed

- The page caps grew and became tokens: `--container-page-narrow` 896px,
  `--container-page-default` 1152px and `--container-page-wide` 1536px, up
  from Tailwind's 768, 1024 and 1280. `PageShell` reads them by name, so a
  console retunes the cap for every page at once rather than per page.

## [0.25.1] - 2026-09-15

### Fixed

- An overlay's exit now plays when the page removes the component, not only
  when the component closes itself. The presets were local Svelte
  transitions, which play only when their own block toggles, and every
  console wraps a `Modal` in a page-level `{#if}` so the form inside starts
  fresh each time; on those pages the dialog still snapped shut. Every
  preset directive in the kit is `|global` now, and the consistency suite
  refuses one that is not. A page's own surface on a preset needs the same
  modifier: `transition:motion.popover|global`.

## [0.25.0] - 2026-09-15

### Added

- `AppShell` takes `headerHidden`, bindable, which puts the header bar away
  above md: for a page that owns the viewport, such as an editor in a focus
  mode. Below md: the bar stays whatever the prop says, because it carries
  the hamburger and that is the only way into the drawer. A page that hides
  the bar keeps its own way back on screen, since the shell's controls go
  with it.
- `PageShell` takes `titleHidden`, which renders no title row at all and
  keeps the page's one h1 as `sr-only`. An editor whose toolbar is its header
  spent two rows before its canvas, the title row and then its own toolbar
  carrying the same name, with the shell's gap between them. A heading query
  and a screen reader still find exactly one h1; `back` renders nothing on
  such a page, so the page takes on the way back itself.
- `SegmentedControl` takes `href` per option. When every option carries one,
  each segment renders as a plain anchor with no click handler, the chosen
  segment carries `aria-current="page"`, and the group is a `group` rather
  than a `radiogroup`, so a page can keep its choice in the URL, survive a
  reload and work before any script has loaded. The arrows still move
  between segments, and the tab stop follows focus inside the group and
  returns to the current segment when focus leaves it. A row that mixes
  links and radios is refused with an error, since a radio beside two links
  would report a choice the URL never learns about. The value mode is
  unchanged.
- One motion vocabulary, declared in `styles.css` beside the palette: four
  durations (`--duration-fast`, `base`, `slow`, `progress`) and three curves
  (`--ease-enter`, `exit`, `move`), each named for what it is used for. The
  `transition-*` utilities now default to the fast rung and the move curve,
  so `transition-colors` on its own is complete, and `duration-base`,
  `duration-slow`, `duration-progress`, `ease-enter`, `ease-exit` and
  `ease-move` are utilities for the rest. The values were never stated in
  one place before: three entrances ran at 120, 140 and 150ms on Tailwind's
  `ease-out`, and fifty class attributes said `duration-150` to mean the
  default.
- `motion`, a namespace of Svelte transitions that read those tokens at run
  time: `dialog`, `scrim`, `drawer`, `popover`, `toast` for a surface that
  mounts and unmounts, and `reorder` for `animate:` on a keyed list. An exit
  runs one rung faster than its entrance, on the exit curve. Every preset
  plays nothing for a reader who has asked for reduced motion, and nothing
  in a document with no Web Animations API, so a test that mounts and
  unmounts a surface sees what it always saw.
- `AppShell` narrows the sidebar to a 56px icon rail between md: and lg:.
  At 768px the 224px column left the page 496px, and a flow editor with two
  docked panes had no canvas at all; `--spacing-nav-rail` existed and
  nothing used it. Under a pointer or with focus inside it the rail opens to
  the full column over the page, at the dropdown layer, and closes when
  either leaves, so the labels are one hover or one Tab away and the page
  keeps its width. The `brand`, `nav` and `sidebarFooter` snippets are
  told `{ rail }`, so a `SidebarNav` takes it as `collapsed` and a brand
  row can drop its wordmark; a snippet written for the old contract still
  renders, clipped to the rail. A page can ask for the rail at every width
  above md: with `rail`, which is the focus mode the flow editor wanted;
  the drawer below md: is unchanged, and a collapsible shell that is
  collapsed still puts the sidebar away. `SidebarState` is exported for a
  caller that types the snippet by hand.
- Every interactive primitive meets a finger at 44px and a mouse at the
  size it always had. Measured over 48 routes at 400px, 2,007 of 2,097
  visible controls were under 44px and the kit owned 96% of them, because
  the control height is 38px and it is right at 38px on a desktop. The fix
  keys on `pointer: coarse`, so the desktop is unchanged to the pixel, and
  works two ways. `--spacing-control` is 44px under a coarse pointer, and
  the controls whose visual may grow (`Button` at every size, `Tabs`,
  `SidebarNav` rows and disclosures, `ThemeToggle`, `AccountMenu`,
  `Collapsible`, `Dropdown` items) state `coarse:min-h-control`, so a
  button and the input beside it grow together and stay level. The
  controls that are small on purpose keep their visual and grow an
  invisible hit box centred on themselves through the new `hit-area`
  utility: `Toggle`, `Checkbox` and `Radio` (on the label, which reaches
  the input), `Breadcrumb` links, `PageShell`'s back link, `Pagination`,
  `CopyButton`, the close and dismiss crosses of `Modal`, `Drawer`,
  `Alert`, `Banner`, `Toaster` and `Tag`, the clear and reveal buttons
  inside `SearchInput` and `PasswordInput`, `MultiSelect`'s chip remove,
  and `DatePicker`'s days and month steps. The `coarse:` variant and the
  utility are declared in the theme file beside the tokens, so a consumer's
  build emits them and can use them on its own controls.

### Changed

- Every overlay now leaves the way it arrived. `Modal`, `Drawer`, the dialog
  stack and every toast played a CSS entrance and then vanished the instant
  their `{#if}` turned false, which read as a fault after the easing in.
  `Dropdown`, `Select`, `MultiSelect`, `Autocomplete` and `DatePicker`
  panels, which appeared with no motion at all, now unfold from the edge
  they hang off; `Tooltip` fades and settles; the `AccountMenu` panel plays
  the same frame on the way in. A `SidebarNav` group collapses its row to
  nothing the way an `AccordionItem` does instead of toggling display, and
  stays in the document, inert, so the disclosure's `aria-controls` keeps
  its target.
- The dialog stack no longer waits a hand-written 200ms `setTimeout` before
  removing an entry: removing the entry plays the exit.

### Fixed

- A `DatePicker`'s calendar, and so a `DateTimePicker`'s, is no longer cut
  off inside a modal. The calendar sat under its trigger unconditionally, so
  a picker near the bottom of a modal body opened into the part of the
  scroll region nobody could reach and was cropped below the weekday row.
  The calendar is now the shared panel surface, placed the way every listbox
  panel is: it opens upward when the room below inside the nearest clipping
  ancestor is short and the room above is larger, it is re-measured on
  resize and on scroll, and inside a container too short for it on either
  side it scrolls rather than being cut. Its width moved from an arbitrary
  value onto the spacing scale; the calendar itself is unchanged.
- `Badge` and `Button` labels never break inside a word. Neither carried
  `whitespace-nowrap`, so under a `Table`'s default `overflow-wrap: anywhere`
  a status badge rendered as `dra ft`, a role as `sup er_a dmi n`, and a
  two-word ghost button in a flex row broke across two lines; one console
  marked 156 cells `data-cell="nowrap"` to stop it. A `Badge` also caps at
  its container's width and truncates with an ellipsis when its caller sets
  a narrower one; its label sits in a span of its own for that, because
  `text-overflow` does not reach into a flex item. A `Button` whose width
  is capped wraps its label in a `truncate` span itself, since the label and
  an icon before it are flex items and the button cannot tell them apart.
- `Table` head cells align to the start. The table said `text-start` and
  the browser's own `th { text-align: center }` beat the inherited value,
  so every heading floated over a left-aligned column unless the page wrote
  `text-left` on each one. A column marked `data-col="numeric"` on its
  head and body cells ranges to the end in tabular figures instead. A sort
  button the page puts in a heading gets the same 44px hit box the kit's
  own small controls grow under a coarse pointer, through the table.
- `Tabs` scroll sideways when the strip does not fit, and say so. Five
  tabs are 480px, and at 400px the fifth was past the edge with nothing on
  screen to say it existed; the workaround was a wrapped strip, which
  breaks the one line the underline runs along. The strip is a scroll box
  now, with the edge fades `Table` already draws on the side the tabs
  continue past, no scrollbar of its own, and the active tab scrolled into
  view when it changes. A tab never breaks inside its label, its focus ring
  is inset where the box cannot clip it, and the count pill is 12px, the
  last text on a measured page under that floor. The caller's `class` lands
  on the frame around the strip, so a margin does not scroll with it.
- `PageHeader` and `SectionHeading` action slots wrap. Both were
  `shrink-0`, which sizes a flex item to its content and so cannot wrap
  even when the page puts a wrapping row inside it: four actions pushed
  `New flow` 83px past a 400px screen, and five filter chips ran 212px
  past it. The slot now sits beside the title while both fit, drops under
  it at the end edge when they do not, and wider than the row on its own
  wraps its controls inside itself with every line ending at the end edge,
  in the order given.

### Removed

- `--duration-modal-in`, `--duration-toast-in`, `--duration-drawer-in` and
  `--duration-collapse`, with the `modal-in`, `drawer-in-*` and `toast-in`
  keyframes. Nothing outside the kit read them; the presets replace them.

## [0.24.0] - 2026-09-15

### Added

- `PageShell` takes `back`, an `{ href, label }` pair rendered above the title
  as an arrow and the parent page's name. A page two levels into a console had
  only the sidebar and the browser to get back with; a third of the nested
  pages in one app built a breadcrumb of their own, half of those drew an
  arrow by hand, and the rest offered nothing. The link is a plain anchor in
  the muted token, foreground on hover, with the kit's focus ring, and it
  shares the breadcrumb's row when both are given, the back link first, so a
  page with both does not stack two lines of navigation over its title.
  `PageHeader` is unchanged.

### Fixed

- A `Toggle`'s off track reads as a control on a raised panel. The track
  was painted in surface-2 with no edge, and a form that sits on a
  surface-2 panel painted the panel the same shade, so until the switch was
  on only the knob showed, as a lone dot beside its label. The track now
  carries the same resting border every other control draws, which clears
  3:1 against both surface levels in both themes; on, the border takes the
  fill's colour, so the on state, the disabled state and the focus ring look
  as they did, and the knob's travel is unchanged.

## [0.23.3] - 2026-09-14

### Fixed

- A listbox row's active ring and hover tint stay inside the panel. The
  rows were square and full width inside a rounded, clipping surface, so on
  the first and last row the ring's corners were cut by the frame and the
  arc read unfinished. The list now insets its rows and each row carries a
  radius one step inside the surface's, so what a row paints has corners of
  its own; group headings and the empty line keep their text flush with the
  rows.

- A panel opens upward when there is no room below. `Select`, `MultiSelect`,
  `Autocomplete` and `Dropdown` always hung their panel under the trigger,
  and nothing measured the space it needed, so a listbox near the bottom of
  a modal opened into the part of the modal body nobody could see without
  scrolling first. Each panel now measures its anchor against the nearest
  scrolling or clipping ancestor, or the viewport, on open, on resize and on
  scroll of that ancestor; it goes above only when it does not fit below and
  there is more room above, and its list is capped to the room on the chosen
  side. `Dropdown` takes the shared surface and scroll cap with it, so a long
  menu scrolls instead of running off the window.

## [0.23.2] - 2026-09-13

### Fixed

- A `CheckboxGroup` or `RadioGroup` legend keeps its distance from the first
  option. A rendered legend is not a flex item, so the fieldset's gap applied
  between the option list and the hint and never under the heading, and
  "Events" sat on its first row of boxes where an `Input` label sits 6px
  above its control. The legend now carries that 6px itself, the same
  distance a `Field` uses, and a hidden legend takes none.

- A `Table` row's hover ring follows the frame's rounded corner. The ring
  was a box-shadow on the row, which takes no radius, so on the last row it
  drew square inside a rounded frame and the two bottom arcs sat bare
  outside it. The ring is drawn on the cells now, with the last row's outer
  cells rounded to the frame's inner radius so the shadow goes round the
  corner with it.

## [0.23.1] - 2026-09-13

### Fixed

- A tooltip is sized to its text and placed outside any scroller. The box
  was positioned inside an inline wrapper the size of its trigger, so the
  hint on an icon button took the button's width and broke one character
  per line, and a scrolling ancestor clipped it: a table's horizontal
  scroller clips vertically as well, so a hint on a row action was cut at
  the header row. The box is now fixed to the viewport and positioned from
  the trigger when it opens; a scroll anywhere closes it, since a fixed box
  cannot follow a trigger that scrolls out from under it.

## [0.23.0] - 2026-09-13

### Added

- An icon-only `Button` shows its name on hover and focus. The name was
  already there as `aria-label`, announced to a screen reader and shown to
  nobody else, so what a trash can or a toggle did was learned by pressing
  it. `hint` takes a string to say something other than the name, or
  `false` to keep the button silent; a full-width button stays full inside
  its hint, and a button with visible text and no `aria-label` renders as
  before.

- `Tooltip` takes `describe`, on by default. Off, the text stays visual and
  the trigger gets no `aria-describedby`, for a trigger that already carries
  the same words as its name; with it on, a button named Delete was announced
  as "Delete, Delete".

## [0.22.2] - 2026-09-13

### Fixed

- A confirm dialog no longer renders the generic header above its own title.
  That header was an empty row holding only the close control, and the
  overlay put the first focus on that control, so a dialog asking "Delete?"
  opened with the ring on an X and Enter one Tab away from the danger button.
  The title now sits beside the warning icon, Cancel is the way out, and
  Escape still dismisses.

- Focus lands on Cancel when a confirm dialog opens, so an Enter pressed
  before the dialog was read does nothing.

### Added

- The overlay honours `data-initial-focus` before falling back to the first
  focusable element, so a panel can name where focus lands.

- `confirm()` takes a `detail` option, rendered on its own monospace line
  under the message. It holds the identifier a message used to carry
  mid-sentence, where a UUID wrapped.

## [0.22.1] - 2026-09-12

### Fixed

- A listbox row's active ring no longer draws past the rounded corners of the
  panel that holds it. The ring is square and the panel is not, so on the first
  or last row the corners poked out of the panel. The surface clips now, and
  `Table` takes the same clip on its frame so nothing a row draws can pass the
  frame's corners.
- `AppShell` drops the browser's default outline on its landing region. The
  region is a target for the skip link, not a control, and the outline boxed
  the whole page body the moment the link had been used.

### Changed

- The declared Node floor is 24. Continuous integration has run on Node 24 for
  some time and the manifest still said 20, which described a runtime nothing
  was tested against. Node 22 consumers are no longer within the declared
  range.

## [0.22.0] - 2026-09-09

### Changed

- Nothing in the package. The release carried edits to the pull request
  template only. The entry that stood here repeated the 0.21.0 entry below.

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
  application that consumes the kit depends on it directly too, so each resolved two
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
  `Collapsible`, each replacing something the consuming applications had hand-rolled: a copy
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
  across the consuming applications render the component directly and take their heading gap
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
  exists inside the consuming applications for no benefit.

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
  resolved. The docs site is served from `ui-kit.lyeve.com`. An audit
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
