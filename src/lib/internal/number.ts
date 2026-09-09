/**
 * Digit grouping for a figure a reader is meant to take in at a glance.
 *
 * The locale is fixed rather than the runtime's. `toLocaleString()` with no
 * argument formats by whatever locale the environment reports, and the server
 * that renders a page and the browser that hydrates it do not have to report
 * the same one: the same figure then arrives as `4,210` in the HTML and as
 * `4.210` or `4210` after hydration, which is a mismatch the framework warns
 * about and a number the reader watches change under them. A component library
 * has no way to know which locale a host has configured either, so the
 * separator has to be a decision the kit makes once.
 *
 * `en-US` because that is the language every string in the kit is written in,
 * and an English sentence carrying a German separator is the worse of the two
 * inconsistencies.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/**
 * Built at module load, not per call.
 *
 * Constructing an `Intl` formatter is the expensive half of using one, and a
 * pager re-renders on every keystroke that filters the list behind it.
 */
const GROUPED = new Intl.NumberFormat('en-US');

/**
 * A count, grouped in threes.
 *
 * A value that is not a finite number reads as zero rather than reaching the
 * formatter, which spells infinity as a glyph no summary line should carry and
 * NaN as a word no reader can act on.
 */
export function formatCount(n: number): string {
  return Number.isFinite(n) ? GROUPED.format(n) : '0';
}
