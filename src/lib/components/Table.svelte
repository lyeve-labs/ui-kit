<script lang="ts" module>
  /**
   * How a body cell treats content wider than its column.
   *
   * `wrap` breaks anywhere it has to. `truncate` keeps the cell to one line and
   * ends it with an ellipsis. `auto` is the browser's own table algorithm, with
   * no cap of any kind.
   */
  export type CellFit = 'auto' | 'wrap' | 'truncate';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createScrollFades } from '../internal/scroll-fades.svelte.js';
  import ScrollFades from '../internal/ScrollFades.svelte';
  import { CARD_FRAME } from '../internal/layout.js';

  interface Props {
    /** Tints every other body row. */
    striped?: boolean;
    /** Fills the row under the pointer. On by default. */
    hoverable?: boolean;
    /** Uses the fixed table layout, so columns take the widths the head sets rather than their content's. */
    fixed?: boolean;
    /**
     * Names the scroll box, so a screen reader announces what the region it
     * just landed in holds. Without it the box is still focusable and simply
     * carries no role: an unnamed region is announced as "region" and nothing
     * else, which is a landmark the reader has to enter to identify.
     */
    label?: string;
    /**
     * What a body cell does with content too wide for its column. `wrap` by
     * default: it breaks a token with no spaces (an API key, a signed URL)
     * mid-string and leaves prose breaking at its spaces, so no column can
     * grow the table past its container. `truncate` hides, so it is opted
     * into.
     */
    cell?: CellFit;
    /**
     * The width a truncating cell stops at. Any CSS length.
     *
     * Read through a custom property, so a single column can disagree with the
     * table by setting `--cell-truncate` in its own style attribute.
     */
    truncateAt?: string;
    class?: string;
    children: Snippet;
  }

  /**
   * The hovered row: surface-2, the fill every kit row takes under the
   * pointer, and nothing else. The head row is the brand band, so the two
   * never share a color and a hovered first row cannot read as a second head
   * row. A row of header cells only, such as a group label, is not a row a
   * reader acts on, so `:has(>td)` keeps it out.
   */
  const HOVER_FILL = [
    '[&_tbody_tr:has(>td):hover]:bg-surface-2',
    '[&_tbody_tr]:transition-colors',
  ].join(' ');

  let {
    striped = false,
    hoverable = true,
    fixed = false,
    label = undefined,
    cell = 'wrap',
    truncateAt = '20rem',
    class: cls = '',
    children,
  }: Props = $props();

  /*
   * The scroll box is a tab stop. A wide table scrolls sideways, and a mouse is
   * the only thing that could reach the columns past the right edge: nothing
   * inside a plain table takes focus, so the arrow keys never had an element to
   * act on (SC 2.1.1).
   *
   * Spread rather than written on the element. The compiler reads a literal
   * tabindex on any element it does not consider interactive as a defect, and
   * a focusable scroll container is the one case where that is the fix rather
   * than the fault. The rule cannot express it and the gate stays on for
   * everything else, so the attributes are assembled here.
   */
  const scrollAttrs = $derived(
    label === undefined ? { tabindex: 0 } : { tabindex: 0, role: 'region', 'aria-label': label },
  );

  /*
   * Reachable is not the same as discoverable.
   *
   * Making the box a tab stop answered SC 2.1.1 and told nobody the columns
   * were there. A desktop has a scrollbar to give it away. A phone has an
   * overlay scrollbar that is painted while a finger is moving and is invisible
   * the rest of the time. On the admin's plugin list at 390px the column that
   * falls off the edge is ACTIONS, which is the only thing on the page a reader
   * came to do, and nothing on screen says so.
   *
   * A fade on the edge that has more behind it. Only when the box really
   * overflows, and only on the side the content continues on, so it reads as a
   * property of this table rather than as decoration every table wears.
   */
  const fades = createScrollFades();

  /*
   * The table-wide treatment, applied only to cells that did not ask for their
   * own.
   *
   * `:not([data-cell])` is what keeps the two apart. Without it a column that
   * opted out still matched the table's rule for the same property, and which
   * of the two won came down to the order Tailwind happened to emit them in.
   */
  const CELL_FIT: Record<CellFit, string> = {
    auto: '',
    wrap: '[&_tbody_td:not([data-cell])]:[overflow-wrap:anywhere]',
    truncate:
      '[&_tbody_td:not([data-cell])]:max-w-[var(--cell-truncate)] [&_tbody_td:not([data-cell])]:truncate',
  };

  /*
   * The per-cell opt-in, always present so a caller can mix treatments down one
   * row: `data-cell="nowrap"` on a timestamp, `data-cell="truncate"` on a
   * description, nothing at all on the rest.
   */
  const CELL_NAMED =
    '[&_tbody_td[data-cell=wrap]]:[overflow-wrap:anywhere] ' +
    '[&_tbody_td[data-cell=nowrap]]:whitespace-nowrap ' +
    '[&_tbody_td[data-cell=truncate]]:max-w-[var(--cell-truncate)] ' +
    '[&_tbody_td[data-cell=truncate]]:truncate';

  /*
   * Column alignment. Head cells align start: the table already said
   * `text-start`, and the browser's own `th { text-align: center }` beat the
   * inherited value, so every heading floated over a left-aligned column
   * until the page wrote `text-left` on each one. A numeric column is the one
   * kind that reads better ranged right, and its digits line up only in a
   * tabular figure, so a caller marks its cells `data-col="numeric"` and the
   * heading and the cells take both together.
   */
  const COLUMN_ALIGN =
    '[&_thead_th]:text-start ' +
    '[&_th[data-col=numeric]]:text-end [&_td[data-col=numeric]]:text-end ' +
    '[&_td[data-col=numeric]]:tabular-nums';

  /*
   * A sort control in a heading is the caller's button, and the head row is
   * 40px. The hit box every small kit control grows under a finger is given
   * to it here, so a table sorted from its headings needs nothing from the
   * page to meet the finger.
   */
  const HEAD_CONTROLS = '[&_thead_th_button]:relative [&_thead_th_button]:hit-area';

  /** Marks a title this component put there, so it can take it back again. */
  const OWNED = 'data-cell-title';

  /**
   * Gives a clipped cell its full value back.
   *
   * The text is never removed from the document, so a screen reader already
   * reads the whole of it and it is the sighted pointer user who loses the tail
   * to the ellipsis. The title that returns it is attached when a pointer or
   * the keyboard actually reaches the cell, from one listener on the scroll
   * box, rather than measured for every cell as the table renders: a tenant
   * with 10,000 rows would pay for 10,000 measurements and 10,000 title
   * attributes to answer a question asked of about three of them.
   */
  function reveal(event: Event) {
    const from = event.target;
    if (!(from instanceof Element)) return;
    const td = from.closest('td');
    if (!(td instanceof HTMLElement)) return;

    const named = td.dataset.cell;
    const clipping = named === 'truncate' || (named === undefined && cell === 'truncate');
    if (!clipping) return;

    const ours = td.hasAttribute(OWNED);
    // A title the caller wrote is theirs. It may well say more than the cell
    // holds, and replacing it with the visible text would be a downgrade.
    if (td.hasAttribute('title') && !ours) return;

    const full = (td.textContent ?? '').trim();
    if (full && td.scrollWidth - td.clientWidth > 1) {
      td.setAttribute('title', full);
      td.setAttribute(OWNED, '');
    } else if (ours) {
      // The column widened, or the row now holds something shorter. A tooltip
      // repeating text the reader can already see is noise.
      td.removeAttribute('title');
      td.removeAttribute(OWNED);
    }
  }
</script>

<!-- overflow-hidden on the frame, not only on the scroller: the hovered row's
     fill is square and the frame is not, and the last row's corners drew past
     the frame's rounded ones.

     The frame is a card: the same surface, radius and shadows, so a table and
     the cards above it sit at one depth. It leaves out the card's top wash,
     for the reason at CARD_FRAME. It paints its own surface rather than
     showing the page through, which the shadow under it needs to read as a
     raised sheet. -->
<div data-testid="table-frame" class="relative w-full overflow-hidden {CARD_FRAME} {cls}">
  <!--
    data-print: the box exists to clip. On paper there is no viewport to clip
    to, and every column past the edge would simply not be printed.
  -->
  <div
    use:fades.track
    onpointerover={reveal}
    onfocusin={reveal}
    data-print="unclip"
    data-testid="table-scroll"
    class="w-full overflow-x-auto rounded-card"
    {...scrollAttrs}
  >
    <!--
      border-separate with no spacing, and the row separators on the cells.

      The last row's outer cells are rounded to the frame's inner radius,
      which a cell takes only in the separate model. A row takes no radius,
      so a hovered last row painted a square corner over the frame's arc.

      Borders on a row are ignored in that model, which is why the lines sit
      on the cells they are drawn between. With border-spacing at zero the
      result is the same line in the same place.

      The head row takes the band, the brand mixed into the surface a step
      stronger than the tint. It is one opaque color, so the contrast suite
      measures the head's labels on it, and it stays apart from a hovered
      row, which is surface-2.
    -->
    <table
      style="--cell-truncate: {truncateAt}"
      class="w-full border-separate border-spacing-0 text-sm text-start
      {fixed ? 'table-fixed' : ''}
      {CELL_FIT[cell]} {CELL_NAMED} {COLUMN_ALIGN} {HEAD_CONTROLS}
      [&_thead_th]:border-b [&_thead_th]:border-line [&_thead]:bg-band
      [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-xs
        [&_thead_th]:font-medium [&_thead_th]:text-faint
        [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:whitespace-nowrap
      [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:text-fg [&_tbody_td]:align-middle
      [&_tbody_td]:border-b [&_tbody_td]:border-line [&_tbody_tr:last-child_td]:border-0
      {striped ? '[&_tbody_tr:nth-child(even)]:bg-surface-2/40' : ''}
      [&_tbody_tr:last-child>td:first-child]:rounded-es-[calc(var(--radius-card)-1px)]
      [&_tbody_tr:last-child>td:last-child]:rounded-ee-[calc(var(--radius-card)-1px)]
      {hoverable ? HOVER_FILL : ''}"
    >
      {@render children()}
    </table>
  </div>

  <ScrollFades before={fades.before} after={fades.after} testId="table" rounded />
</div>
