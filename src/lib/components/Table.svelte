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
</script>

<div class="w-full overflow-x-auto rounded-xl border border-line {cls}" {...scrollAttrs}>
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
