/**
 * The single source of truth for how a page, a card, a table and a modal are
 * spaced.
 *
 * Before this module nothing in the library owned the page frame, so every
 * page invented one: four spellings of one gutter, five content caps with no
 * rule for picking between them, fourteen section headings, and card surfaces
 * in nine paddings while Card itself went unused.
 *
 * Every value composes from a `--spacing-*` token rather than a Tailwind
 * number, so changing a token changes every surface that uses it.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

/** The treatment a section heading takes, independent of its level. */
export type SectionVariant = 'default' | 'eyebrow';

/** How much of the viewport a page's content is allowed to fill. */
export type PageWidth = 'narrow' | 'default' | 'wide' | 'full';

/**
 * The gutter a page sits in, stated once.
 *
 * Two pages in the same shell started their content at different distances
 * from the edge because each spelled its own gutter. The horizontal and
 * vertical tokens resolve to the same 24px and keep separate names, so a
 * design that wants a taller page gutter changes one token, not every page.
 */
export const PAGE_PAD = 'mx-auto w-full px-page-x py-page-y';

/**
 * Content cap by name. Four named slots replace the five raw max-w values
 * chosen per page with no rule.
 *
 * `narrow` is one column: a form, a settings pane, a page of prose. `default`
 * is a page of stacked cards. `wide` is a data page whose table needs the
 * room. `full` opts out, for a canvas or a split pane that owns the viewport.
 * The names carry the decision, so a page picks a role rather than a number.
 */
export const PAGE_WIDTH: Record<PageWidth, string> = {
  narrow: 'max-w-page-narrow',
  default: 'max-w-page-default',
  wide: 'max-w-page-wide',
  full: 'max-w-full',
};

/** How wide a surface lifted off the page may get. */
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * One ladder for Modal, Drawer and the dialog stack.
 *
 * The three carried three ladders and none of them agreed: a modal's `lg` was
 * 672px, a drawer's was 384px, and a dialog's was 512px, so the same form read
 * as three different sizes depending on which surface a page happened to open
 * it in. Every rung here is wider than the widest of the three it replaces.
 *
 * A component takes the slice of the ladder its role allows, which is why the
 * names and not the numbers are its prop: a drawer stops at `xl` because a
 * panel docked to an edge that covers the page is a modal with extra steps.
 *
 * Spelled out in full rather than composed from the rung name. Tailwind
 * generates a utility only for a class it can read whole in the source, so
 * `max-w-${rung}` would compile to nothing at all.
 */
export const OVERLAY_WIDTH: Record<OverlaySize, string> = {
  sm: 'max-w-overlay-sm',
  md: 'max-w-overlay-md',
  lg: 'max-w-overlay-lg',
  xl: 'max-w-overlay-xl',
  full: 'max-w-overlay-full',
};

/**
 * The rung a body of this many labeled fields needs.
 *
 * A panel is sized by its caller today, and the caller is guessing: all 18
 * drawers measured across three consuming applications ask for the widest rung
 * the ladder had, and that rung still puts a two-column field grid into two
 * 170px columns. The content knows the answer, so it gives it: four fields fit
 * a single column, more than four is where a form starts pairing them, and
 * past eight it is a page that happens to be in a panel.
 *
 * Fields, not controls. A radio group is one field however many inputs it
 * renders, and the marker the count reads sits on the field wrapper for
 * exactly that reason.
 */
export function fitOverlay(fields: number): OverlaySize {
  if (fields > 8) return 'xl';
  if (fields > 4) return 'lg';
  return 'md';
}

/**
 * The vertical rhythm between a page's top-level sections. A property of the
 * shell, so a page cannot choose its own.
 *
 * PageHeader already drops 32px below the title and every page that sets a
 * section gap sets the same 32px, so the value was agreed and unstated. A gap
 * on the shell also means adding a section is appending a child, rather than
 * remembering to put a margin on it.
 */
export const PAGE_STACK = 'flex flex-col gap-section';

/**
 * The card surface, without its padding.
 *
 * Padding is separate because a card wrapping a table or a list wants its
 * children flush to the border. `overflow-hidden` is deliberately absent: the
 * focus ring sits 2px outside the element it belongs to, so a clipping surface
 * crops the ring of every button inside it down to whichever edge fits.
 *
 * The depth is a few percent of light at the top, a 1px light along the top
 * edge and a soft drop under the card. The light is a translucent background
 * image laid over the background color, so a caller who passes its own bg-*
 * keeps that color under it. The rest are shadows, so the card is the same
 * size with or without them and the 1px border stays the boundary a forced
 * colors scheme keeps.
 */
export const CARD_SURFACE =
  'bg-surface bg-card border border-line rounded-card shadow-card inset-shadow-highlight';

/**
 * The card surface without the card's gradient, for a frame around rows. In
 * light the gradient darkens a card toward its foot, so the last rows would be
 * darker than the first and a hover would show unevenly down the table.
 */
export const CARD_FRAME =
  'bg-surface border border-line rounded-card shadow-card inset-shadow-highlight';

/**
 * The card surface in the danger tone, for a group of destructive actions.
 *
 * The fill is danger mixed into surface rather than a translucent tint, so it
 * is opaque and paints the same on the page ground and inside a card. Five
 * percent keeps the controls of a form inside it on a ground they were drawn
 * for. The contrast suite reads the share from this string.
 */
export const PANEL_DANGER_SURFACE =
  'bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))] border border-danger/40 rounded-card shadow-card inset-shadow-highlight';

/**
 * Card padding by name.
 *
 * `md` is the 20px the theme names `--spacing-card`: the measured mode across
 * the card surfaces in use, and what Card itself paints. `lg` is the page
 * gutter, so a card padded `lg` holds its content on the same rhythm as the
 * page around it. Nine hand-rolled paddings collapse onto these four.
 */
export const CARD_PAD: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-card-sm',
  md: 'p-card',
  lg: 'p-page-x',
};

/**
 * The band above a card's content.
 *
 * Card insets its header 20px across and 16px down, and its footer 20px across
 * and 12px down. Nothing tells the two bands apart, so they share one inset
 * here and differ only in which edge carries the rule.
 */
export const CARD_HEADER = 'px-card py-card-sm border-b border-line';

/** The band below a card's content. CARD_HEADER's inset, with the rule on top. */
export const CARD_FOOTER = 'px-card py-card-sm border-t border-line bg-surface-2/40 rounded-b-card';

/**
 * A placeholder inside a card: one centered muted line.
 *
 * An empty list is not an error, so it reads as muted body copy and not as a
 * warning. The section gap above and below keeps a card holding nothing from
 * collapsing to a single line of text.
 */
export const CARD_EMPTY = 'py-section text-center text-sm text-muted';

/**
 * The head cell of a table: its padding and the type treatment that marks it
 * as a label rather than data.
 *
 * The hand-rolled tables split four ways on cell padding, so two tables on one
 * page ran at different row heights. Horizontal is the compact card step, so a
 * full-bleed table inside a card lines its first column up with the card's own
 * text. Vertical is the control step: 12px and 8px were both already in use in
 * near equal numbers, and 8px is the one the token scale names.
 */
export const TABLE_CELL_HEAD =
  'px-card-sm py-input-y text-xs font-medium uppercase tracking-wider whitespace-nowrap text-faint';

/** The body cell of a table. TABLE_CELL_HEAD's padding, at body weight and color. */
export const TABLE_CELL_BODY = 'px-card-sm py-input-y text-fg align-middle';

/**
 * The gutter every modal surface uses. Modal paints 20px and Dialog paints
 * 24px for the same kind of surface.
 *
 * A dialog opened over a modal showed both insets at once. A modal panel is a
 * card lifted off the page, so a banded modal takes CARD_HEADER and
 * CARD_FOOTER, which resolve to this same inset.
 */
export const MODAL_PAD = 'px-card py-card-sm';

/**
 * A section heading below the page title. Level 2 sits under the title, level 3
 * inside a card.
 *
 * Taking the level rather than a free-form string means the class cannot disagree with the heading element
 * the caller is already writing.
 *
 * `eyebrow` is the small uppercase label the consoles use to head a band of
 * content. It is a second treatment rather than a third level because the
 * element is a decision about document structure and the treatment is not: an
 * eyebrow appears at both levels. It went unnamed here while thirty of them
 * shipped hand rolled across two apps in four different bottom margins, and a
 * margin is exactly what this function must not carry: the stack around the
 * heading owns the distance to what follows.
 */
export function sectionHeading(level: 2 | 3, variant: SectionVariant = 'default'): string {
  // The eyebrow reads the same at both levels. It is a label for the band under
  // it rather than a title, so it does not take the level's size at all.
  //
  // It is muted and semibold rather than faint and medium. A band label in the
  // faintest gray read as metadata beside the stronger page title, so it
  // stepped up once in weight and once in color.
  if (variant === 'eyebrow') return 'text-xs font-semibold uppercase tracking-wider text-muted';
  // Level 2 is the brand ramp's H3, which the guideline describes as the card
  // and group head this is. Its leading and tracking come with it: a --text-*
  // token sets font-size and nothing else, so the ratio has to be asked for by
  // name or the heading inherits whatever line-height its parent had.
  //
  // Level 3 drops a size rather than a weight. Inside a card it sits under the
  // card's own semibold title, and two semibold lines at the same size read as
  // one heading broken in half. It stays at text-sm: the ramp holds nothing
  // between 16px and 22px, and 16px is exactly the size of the card title it
  // has to sit below.
  //
  // Both levels take the heading face, which is the body face until a site
  // sets its own.
  return level === 2
    ? 'font-heading text-h3 leading-h3 tracking-h3 font-semibold text-fg'
    : 'font-heading text-sm font-semibold text-fg';
}

/**
 * The authed app frame, stated once for every app that has one.
 *
 * Three apps hand rolled this and none of the three agreed. The sidebar was
 * `w-56` in the admin and `w-60` in the other two, `bg-surface` in two and
 * `bg-surface/30` in the third. The header existed in one and not in the other
 * two. None of that was visible from inside any one app, which is why it went
 * on being three shells for as long as it did.
 *
 * `border-e` and not `border-r`: the shell is the one place a right-to-left
 * locale flips, and a physical border leaves the rule on the wrong edge.
 *
 * The sidebar runs from the surface at the top a step toward ink at the foot,
 * and its edge is a rule that fades in and out at its ends, drawn over a
 * transparent border. The border keeps the column's width, and a forced
 * colors scheme, which draws no gradient, paints that border in the system
 * text color, so the edge is still there.
 */
export const APP_SIDEBAR =
  'relative h-full shrink-0 flex-col border-e border-transparent bg-surface bg-sidebar ' +
  'transition-[width] duration-base ease-move';

/**
 * The faded edge of the sidebar, a 1px line laid over its transparent
 * border. It sets a width of its own, so it stays out of APP_SIDEBAR, which
 * holds no width at all.
 */
export const APP_SIDEBAR_EDGE =
  'after:pointer-events-none after:absolute after:inset-y-0 after:-end-px after:w-px after:bg-rule-y';

/**
 * The sidebar's two widths. Expanded is the 224px column every authed screen
 * had. The rail is the 56px icon column the theme had named and nothing used:
 * at 768px the expanded column left 496px for the page, and a flow editor with
 * two docked panes had no canvas at all. The shell picks between them. The
 * width is not part of APP_SIDEBAR so the aside cannot carry both.
 *
 * The travel between them is on APP_SIDEBAR, which is the one class both
 * widths share. It is a disclosure opening sideways, which is the same thing
 * an accordion does downwards, so it takes the accordion's rung and curve:
 * base and move. It was the most frequent state change in the product and the
 * only one that happened in a single frame.
 */
export const APP_SIDEBAR_WIDE = 'w-sidebar';
export const APP_SIDEBAR_RAIL = 'w-nav-rail';

/**
 * The header bar. Its gutter is the page gutter, so the section name in the
 * header sits directly above the page title under it rather than 8px off.
 *
 * The surface is translucent, so the light at the top of the canvas carries
 * up under it and the header reads as part of the page rather than a lid on
 * it. Its rule fades out toward the end edge and stays solid where it meets
 * the brand row's, so the two read as one line across the top. The rule sits
 * over a transparent border, for the same reason as the sidebar's.
 */
export const APP_HEADER =
  'relative flex h-header shrink-0 items-center gap-2 border-b border-transparent bg-surface/70 px-page-x ' +
  'after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-rule-end ' +
  'rtl:after:-scale-x-100';

/**
 * The sidebar's brand row. Exactly as tall as the header beside it: the two
 * meet at the top left corner and a 4px disagreement there reads as a seam.
 * Its inset is the nav row inset, so the mark lines up with the nav icons
 * under it instead of with their labels.
 */
export const APP_BRAND = 'flex h-header shrink-0 items-center gap-2 border-b border-line px-inline';

/**
 * The brand row on the rail. The rail's entries are centered squares, so the
 * mark is centered over them. With the column's inset it sat 6px left of the
 * icons under it. A brand wider than the rail keeps its start, as the clipped
 * row always has.
 */
export const APP_BRAND_RAIL =
  'flex h-header shrink-0 items-center justify-center-safe overflow-hidden border-b border-line';

/** A band at the foot of the sidebar, on the nav's own inset. */
export const APP_SIDEBAR_BAND = 'shrink-0 border-t border-line px-inline py-3';

/**
 * A row in a navigation list: SidebarNav's entries and AccountMenu's. Each
 * adds its own inline padding. The focus ring is inset because both lists sit
 * in a box that clips or scrolls, which crops a ring drawn outside the row.
 */
export const NAV_ROW =
  'flex w-full items-center gap-2.5 rounded-lg py-2 text-sm text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus';

/**
 * An entry on the icon rail. Nothing sits beside its icon, so it is a 40px
 * square centered in the rail, the same box at rest, under the pointer and
 * current. A full-width row with its label hidden put the icon 10px left of
 * center and ran the current fill under the rail's edge. The 2px border is
 * transparent in every state and shows only in a forced colors scheme, on the
 * current entry, where it is the whole mark.
 */
export const NAV_RAIL_ROW =
  'mx-auto flex size-10 shrink-0 items-center justify-center gap-0.5 rounded-lg border-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus';

/** A navigation row at rest, which answers the pointer and a held finger. */
export const NAV_ROW_REST =
  'text-muted hover:bg-surface-2 hover:text-fg active:bg-line active:text-fg';
