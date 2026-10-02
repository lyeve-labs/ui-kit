/**
 * The cart's shape and the volume ladder, shared by every surface that sells.
 *
 * Two sites sold the same catalog from two components. One posted the
 * selection to the server and rendered the price that came back, the other
 * computed a total in the browser from a catalog it had fetched, with a
 * hardcoded list behind it for when the fetch failed. They agreed by
 * coincidence, and the second carried a comment recording how thin the
 * coincidence was: the discount has to be truncated rather than rounded, or
 * the quote is a cent deeper than the charge.
 *
 * So nothing here computes a price. The types describe what the sales API
 * returns, and the functions are presentation over the ladder: which rung a
 * selection stands on and how far the next one is. The total always comes
 * from the server, on both sites, because a price computed twice is a price
 * that will disagree once.
 */

/** One sellable capability, as the catalog endpoint reports it. */
export interface CartPlugin {
  sku: string;
  name: string;
  /** Integer cents, always. No float ever holds money here. */
  price_cents: number;
  category?: string;
  blurb?: string;
  /** `soon` is shown and cannot be bought. Anything else sells. */
  status?: string;
}

/** One rung of the volume ladder. */
export interface DiscountBracket {
  plugins: number;
  discount_pct: number;
}

/** The catalog endpoint's whole answer. */
export interface CartCatalog {
  plugins: CartPlugin[];
  discount_brackets: DiscountBracket[];
}

/** One line of a priced cart. */
export interface CartQuoteItem {
  sku: string;
  name: string;
  unit_cents: number;
  discounted_cents: number;
}

/**
 * The server's price for one selection. Rendered, never recomputed.
 *
 * `count` and `items` are here so a consumer can tell whether the quote it
 * holds still describes what the reader has selected. A stale total beside a
 * changed cart is the one failure this component cannot show its way out of.
 */
export interface CartQuote {
  items: CartQuoteItem[];
  count: number;
  subtotal_cents: number;
  volume_discount_pct: number;
  volume_discount_cents: number;
  community_discount_pct: number;
  community_discount_cents: number;
  total_cents: number;
  /** A year at ten months' price. Zero on a monthly quote. */
  annual_total_cents?: number;
}

export type BillingPeriod = 'monthly' | 'annual';

/** Where a selection stands on the ladder, and what the next rung is worth. */
export interface LadderState {
  /** The plugin count the ladder was read at. */
  count: number;
  /** The discount that count has reached. */
  reachedPct: number;
  /** The first rung above the count worth more than the one reached. */
  next: { plugins: number; discount_pct: number; more: number } | null;
  /** Index of the rung the count stands on, ascending, or -1 below the first. */
  active: number;
}

export function ladderState(brackets: DiscountBracket[], count: number): LadderState {
  const sorted = [...brackets].sort((a, b) => a.plugins - b.plugins);
  const reachedPct = sorted
    .filter((b) => b.plugins <= count)
    .reduce((m, b) => Math.max(m, b.discount_pct), 0);
  const step = sorted.find((b) => b.plugins > count && b.discount_pct > reachedPct);
  let active = -1;
  sorted.forEach((b, i) => {
    if (count >= b.plugins) active = i;
  });
  return {
    count,
    reachedPct,
    next: step
      ? { plugins: step.plugins, discount_pct: step.discount_pct, more: step.plugins - count }
      : null,
    active,
  };
}

/**
 * How many capabilities the bill will carry.
 *
 * For a new cart that is what is selected. For a change to a live
 * subscription it is what is held as well, because that is the count the
 * server prices the change at. Reading the cart alone put a subscriber on the
 * list-price rung beside a total that had already taken the discount.
 */
export function billedCount(opts: {
  selected: Iterable<string>;
  held?: Iterable<string>;
  change?: boolean;
  pricedSkus?: string[] | null;
}): number {
  const added = new Set(opts.selected);
  if (!opts.change) return added.size;
  if (opts.pricedSkus) return new Set(opts.pricedSkus).size;
  return new Set([...(opts.held ?? []), ...added]).size;
}

/** One row per rung, labeled by the range it covers. */
export function ladderRows(
  brackets: DiscountBracket[],
): { from: number; to: number | null; discount_pct: number }[] {
  const sorted = [...brackets].sort((a, b) => a.plugins - b.plugins);
  return sorted.map((b, i) => {
    const next = sorted[i + 1];
    return { from: b.plugins, to: next ? next.plugins - 1 : null, discount_pct: b.discount_pct };
  });
}

/**
 * Money, for display.
 *
 * The locale is fixed for the reason `number.ts` states: a server and the
 * browser that hydrates its output do not have to report the same one, and a
 * figure that changes under the reader is worse than one that is not local to
 * them.
 */
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * A plugin's blurb split into what it does and whether it is still in beta.
 *
 * The catalog carries no beta flag, only a sentence: a trailing "Beta." or a
 * "Beta:" that opens a caveat. Reading it here lets the card show one badge
 * instead of a word buried in a paragraph. A blurb that says neither comes
 * back untouched and unbadged, so a change of wording costs a badge, never a
 * claim.
 */
export function betaOf(blurb: string | undefined): { text: string; beta: boolean } {
  const text = (blurb ?? '').trim();
  // "Beta." standing as a sentence of its own says nothing the badge does not,
  // wherever it falls. A "Beta:" caveat says more, so it stays.
  const alone = /(^|\s)Beta\.(?=\s|$)/;
  if (alone.test(text)) return { text: text.replace(/\s*Beta\.(?=\s|$)/, '').trim(), beta: true };
  return { text, beta: /(^|\s)Beta:/.test(text) };
}
