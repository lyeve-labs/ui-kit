<script lang="ts">
  /**
   * The fades on the edges a scroll box continues past. aria-hidden and
   * outside the scroll box: a picture of the scrollbar a phone will not draw,
   * saying nothing the box has not already said, and a child of the box would
   * scroll away with the content it describes.
   */
  import { SCROLL_EDGE, SCROLL_EDGE_END, SCROLL_EDGE_START } from './scroll-edges.js';

  interface Props {
    before: boolean;
    after: boolean;
    /** The test id prefix: `<testId>-more-before` and `<testId>-more-after`. */
    testId: string;
    /** Rounds each fade into its container's corners. */
    rounded?: boolean;
  }

  let { before, after, testId, rounded = false }: Props = $props();
</script>

{#if before}
  <div
    aria-hidden="true"
    data-print="hide"
    data-testid="{testId}-more-before"
    class="{SCROLL_EDGE} {SCROLL_EDGE_START} {rounded ? 'rounded-s-card' : ''}"
  ></div>
{/if}
{#if after}
  <div
    aria-hidden="true"
    data-print="hide"
    data-testid="{testId}-more-after"
    class="{SCROLL_EDGE} {SCROLL_EDGE_END} {rounded ? 'rounded-e-card' : ''}"
  ></div>
{/if}
