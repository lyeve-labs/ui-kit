<script lang="ts">
  /**
   * The row of filters and actions above a table or a list.
   *
   * Every filter row was hand-rolled, and they disagreed with each other about
   * how their controls sit: some stretched their children to the tallest one,
   * some aligned on the top edge, so a search box, a select and a button in one
   * row sat visibly off by a couple of pixels. The alignment is stated once
   * here, on their vertical centres, which is the only arrangement that holds
   * when one control is taller than the rest.
   *
   * The row wraps. A filter row that overflows takes a horizontal scrollbar the
   * user has to find before the last filter can be reached, and on a phone that
   * is every filter row.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    /** Accessible name, so a screen reader can tell two toolbars apart. */
    label?: string;
    class?: string;
    /** Pushed to the trailing edge. */
    actions?: Snippet;
    children: Snippet;
  }

  let { label = undefined, class: klass = '', actions, children }: Props = $props();
</script>

<!-- The children are flex items of the toolbar itself rather than of a wrapper.
     A wrapper would align its own contents and leave the toolbar aligning one
     box, which is how a filter row loses the alignment it is here to keep. -->
<div role="toolbar" aria-label={label} class="flex flex-wrap items-center gap-3 {klass}">
  {@render children()}

  {#if actions}
    <div class="ms-auto flex flex-wrap items-center gap-2">{@render actions()}</div>
  {/if}
</div>
