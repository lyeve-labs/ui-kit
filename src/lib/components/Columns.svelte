<script lang="ts">
  /**
   * Each child is a column. Columns stand side by side while each keeps the
   * site's minimum column width and stack once one would fall under it, so
   * they need no breakpoint: a narrow container stacks them as a phone does.
   *
   * `max` caps how many stand in one row. Without it as many fit as the width
   * allows. The cap works by raising each column's minimum to its share of the
   * row, so it holds without a media query.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    max?: 2 | 3 | 4;
    children: Snippet;
    class?: string;
  }

  let { max = undefined, children, class: klass = '' }: Props = $props();

  const TRACKS = {
    auto: 'grid-cols-[repeat(auto-fit,minmax(min(100%,var(--spacing-column-min)),1fr))]',
    2: 'grid-cols-[repeat(auto-fit,minmax(min(100%,max(var(--spacing-column-min),calc((100%_-_var(--spacing-gutter))/2))),1fr))]',
    3: 'grid-cols-[repeat(auto-fit,minmax(min(100%,max(var(--spacing-column-min),calc((100%_-_2*var(--spacing-gutter))/3))),1fr))]',
    4: 'grid-cols-[repeat(auto-fit,minmax(min(100%,max(var(--spacing-column-min),calc((100%_-_3*var(--spacing-gutter))/4))),1fr))]',
  } as const;
</script>

<div class="grid gap-gutter {TRACKS[max ?? 'auto']} {klass}">
  {@render children()}
</div>
