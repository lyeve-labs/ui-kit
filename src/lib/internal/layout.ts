/**
 * The single source of truth for how a page, a card, a table and a modal are
 * spaced.
 *
 * Nothing in the library owned the page frame, so every page invented one. The
 * same gutter ships in four spellings, five content caps are in use with no
 * rule for picking between them, a section heading is spelled fourteen ways,
 * and card surfaces are hand-rolled in nine paddings while Card itself goes
 * unused. The components disagree with each other too: Card pads its header
 * 16px down and its footer 12px down for no reason a reader can infer, and
 * Modal insets its panel 20px where Dialog insets the same kind of panel 24px.
 *
 * Every value composes from a `--spacing-*` token rather than a Tailwind
 * number. That is the only thing that makes the tokens real. Of the ten the
 * theme declares, `--spacing-control` was the one with any uses, and it had
 * them because the field contract composes from it.
 *
 * Not exported from the package entry point - this is an implementation detail.
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
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-full',
};

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
 */
export const CARD_SURFACE = 'bg-surface border border-line rounded-xl';

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
export const CARD_FOOTER = 'px-card py-card-sm border-t border-line bg-surface-2/40';

/**
 * A placeholder inside a card, where three spellings of the same centred muted
 * line currently ship.
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

/** The body cell of a table. TABLE_CELL_HEAD's padding, at body weight and colour. */
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
 * Fourteen distinct class strings serve this role, so two sections on the same
 * page can render at different sizes and weights. Taking the level rather than
 * a free-form string means the class cannot disagree with the heading element
 * the caller is already writing.
 *
 * `eyebrow` is the small uppercase label the consoles use to head a band of
 * content. It is a second treatment rather than a third level because the
 * element is a decision about document structure and the treatment is not: an
 * eyebrow appears at both levels. It went unnamed here while thirty of them
 * shipped hand rolled across two apps in four different bottom margins, and a
 * margin is exactly what this function must not carry - the stack around the
 * heading owns the distance to what follows.
 */
export function sectionHeading(level: 2 | 3, variant: SectionVariant = 'default'): string {
  // The eyebrow reads the same at both levels. It is a label for the band under
  // it rather than a title, so it does not take the level's size at all.
  if (variant === 'eyebrow') return 'text-xs font-medium uppercase tracking-wide text-faint';
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
  return level === 2
    ? 'text-h3 leading-h3 tracking-h3 font-semibold text-fg'
    : 'text-sm font-semibold text-fg';
}

/**
 * The authed app frame, stated once for every app that has one.
 *
 * Three apps hand rolled this and none of the three agreed. The sidebar was
 * `w-56` in the admin and `w-60` in the other two, `bg-surface` in two and
 * `bg-surface/30` in the third; the header existed in one and not in the other
 * two. None of that was visible from inside any one app, which is why it went
 * on being three shells for as long as it did.
 *
 * `border-e` and not `border-r`: the shell is the one place a right-to-left
 * locale flips, and a physical border leaves the rule on the wrong edge.
 */
export const APP_SIDEBAR = 'h-full w-sidebar shrink-0 flex-col border-e border-line bg-surface';

/**
 * The header bar. Its gutter is the page gutter, so the section name in the
 * header sits directly above the page title under it rather than 8px off.
 */
export const APP_HEADER =
  'flex h-header shrink-0 items-center gap-2 border-b border-line bg-surface px-page-x';

/**
 * The sidebar's brand row. Exactly as tall as the header beside it: the two
 * meet at the top left corner and a 4px disagreement there reads as a seam.
 * Its inset is the nav row inset, so the mark lines up with the nav icons
 * under it instead of with their labels.
 */
export const APP_BRAND = 'flex h-header shrink-0 items-center gap-2 border-b border-line px-inline';

/** A band at the foot of the sidebar, on the nav's own inset. */
export const APP_SIDEBAR_BAND = 'shrink-0 border-t border-line px-inline py-3';
