/**
 * Which edges of a horizontal scroll box have content behind them.
 *
 * Table and Tabs both fade the edge the content continues past, because a
 * phone paints its scrollbar only while a finger is moving and the column or
 * the tab past the edge is otherwise unannounced. The arithmetic is the same
 * in both and lives here so a third scroller cannot get it subtly different.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

export interface ScrollEdges {
  before: boolean;
  after: boolean;
}

/** The three metrics the answer is read from; an element has all of them. */
export interface ScrollMetrics {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}

export function scrollEdges(el: ScrollMetrics): ScrollEdges {
  const slack = el.scrollWidth - el.clientWidth;
  // A sub-pixel layout leaves scrollLeft a fraction short of its own maximum
  // at the far end, so an exact comparison never reports the end as reached.
  if (slack <= 1) return { before: false, after: false };
  // A right-to-left box reports the offset as a negative number, and the two
  // edges are the same two edges either way round.
  const traveled = Math.abs(el.scrollLeft);
  return { before: traveled > 1, after: traveled < slack - 1 };
}

/**
 * The fade itself: a dark gradient on the edge, outside the scroll box so it
 * does not scroll away with the content it describes. Dark rather than a
 * palette color, because the box sits on the page in one place and inside
 * a card in another and no surface token is the color to fade to; the
 * scrims use black at an alpha for the same reason and it reads in both
 * themes. The direction is logical, so a right-to-left page fades the other
 * way.
 */
export const SCROLL_EDGE = 'pointer-events-none absolute inset-y-px w-6';
export const SCROLL_EDGE_START =
  'start-0 bg-linear-to-r rtl:bg-linear-to-l from-black/25 to-transparent';
export const SCROLL_EDGE_END =
  'end-0 bg-linear-to-l rtl:bg-linear-to-r from-black/25 to-transparent';
