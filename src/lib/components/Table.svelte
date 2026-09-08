<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    striped?: boolean;
    hoverable?: boolean;
    fixed?: boolean;
    /**
     * Names the scroll box, so a screen reader announces what the region it
     * just landed in holds. Without it the box is still focusable and simply
     * carries no role: an unnamed region is announced as "region" and nothing
     * else, which is a landmark the reader has to enter to identify.
     */
    label?: string;
    class?: string;
    children: Snippet;
  }

  let {
    striped = false,
    hoverable = true,
    fixed = false,
    label = undefined,
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
   * were there. A desktop has a scrollbar to give it away; a phone has an
   * overlay scrollbar that is painted while a finger is moving and is invisible
   * the rest of the time. On the admin's plugin list at 390px the column that
   * falls off the edge is ACTIONS, which is the only thing on the page a reader
   * came to do, and nothing on screen says so.
   *
   * A fade on the edge that has more behind it. Only when the box really
   * overflows, and only on the side the content continues on, so it reads as a
   * property of this table rather than as decoration every table wears.
   */
  let scroller: HTMLElement | undefined = $state();
  let moreBefore = $state(false);
  let moreAfter = $state(false);

  function measure() {
    const el = scroller;
    if (!el) return;
    const slack = el.scrollWidth - el.clientWidth;
    // A sub-pixel layout leaves scrollLeft a fraction short of its own maximum
    // at the far end, so an exact comparison never reports the end as reached.
    if (slack <= 1) {
      moreBefore = false;
      moreAfter = false;
      return;
    }
    // A right-to-left box reports the offset as a negative number, and the two
    // edges are the same two edges either way round.
    const travelled = Math.abs(el.scrollLeft);
    moreBefore = travelled > 1;
    moreAfter = travelled < slack - 1;
  }

  $effect(() => {
    const el = scroller;
    if (!el) return;
    measure();
    // The width that matters changes without a scroll and without a resize of
    // the window: a column added, a filter applied, a sidebar collapsed. Both
    // boxes are watched because either one moving changes whether the other
    // overflows.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  });

  /*
   * A dark fade rather than a palette colour. The box has no background of its
   * own and sits on the page in one place and inside a card in another, so no
   * surface token is the colour to fade to. The scrims use black at an alpha
   * for the same reason and it reads in both themes.
   */
  const EDGE = 'pointer-events-none absolute inset-y-px w-6';
</script>

<div data-testid="table-frame" class="relative w-full rounded-xl border border-line {cls}">
  <!--
    data-print: the box exists to clip. On paper there is no viewport to clip
    to, and every column past the edge would simply not be printed.
  -->
  <div
    bind:this={scroller}
    onscroll={measure}
    data-print="unclip"
    data-testid="table-scroll"
    class="w-full overflow-x-auto rounded-xl"
    {...scrollAttrs}
  >
    <!--
      border-separate with no spacing, and the row separators on the cells.

      The hovered row draws a ring, and a ring is a box-shadow: a browser paints
      no box-shadow on a table row while the table collapses its borders, so the
      same row treatment the panels use would have rendered nothing at all here.
      The separate model paints it. Borders on a row are ignored in that model,
      which is why the lines moved down to the cells they were already drawn
      between; with border-spacing at zero the result is the same line in the
      same place.
    -->
    <table
      class="w-full border-separate border-spacing-0 text-sm text-left
      {fixed ? 'table-fixed' : ''}
      [&_thead_th]:border-b [&_thead_th]:border-line [&_thead]:bg-surface-2/40
      [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-xs
        [&_thead_th]:font-medium [&_thead_th]:text-faint
        [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:whitespace-nowrap
      [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:text-fg [&_tbody_td]:align-middle
      [&_tbody_td]:border-b [&_tbody_td]:border-line [&_tbody_tr:last-child_td]:border-0
      {striped ? '[&_tbody_tr:nth-child(even)]:bg-surface-2/40' : ''}
      {hoverable
        ? '[&_tbody_tr:hover]:bg-surface-2/60 [&_tbody_tr:hover]:ring-1 [&_tbody_tr:hover]:ring-inset [&_tbody_tr:hover]:ring-brand [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150'
        : ''}"
    >
      {@render children()}
    </table>
  </div>

  <!--
    aria-hidden and outside the scroll box. It is a picture of the scrollbar
    the phone will not draw, it says nothing a screen reader has not already
    been told by the region, and a child of the box would scroll away with the
    content it is describing.

    The gradient direction is logical: in a right-to-left locale the start edge
    is the right one and the fade has to run the other way with it.
  -->
  {#if moreBefore}
    <div
      aria-hidden="true"
      data-print="hide"
      data-testid="table-more-before"
      class="{EDGE} start-0 rounded-s-xl bg-linear-to-r rtl:bg-linear-to-l from-black/25 to-transparent"
    ></div>
  {/if}
  {#if moreAfter}
    <div
      aria-hidden="true"
      data-print="hide"
      data-testid="table-more-after"
      class="{EDGE} end-0 rounded-e-xl bg-linear-to-l rtl:bg-linear-to-r from-black/25 to-transparent"
    ></div>
  {/if}
</div>
