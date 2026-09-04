<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    /**
     * The title row for a page with no room for one: the title drops to body
     * size and the description is not rendered. A full-height page, a split
     * pane or a canvas, spends every pixel it does not give away.
     */
    compact?: boolean;
    /**
     * Drop the bottom margin, for a caller that owns the rhythm itself.
     *
     * The margin is opt-out rather than removed. Forty-three pages across the
     * estate render this component directly and take their heading gap from
     * it, so deleting it outright would have moved every one of them by 32px
     * with nothing in their own source to explain why.
     */
    flush?: boolean;
    class?: string;
    actions?: Snippet;
  }

  let {
    title,
    description = undefined,
    compact = false,
    flush = false,
    class: klass = '',
    actions,
  }: Props = $props();
</script>

<!-- The margin is stated before the consumer's class so a page can still
     override it, which is the whole reason it is a separate token rather than
     part of the layout: it used to be appended ahead of `klass` unconditionally,
     and a page asking for a different gap shipped two competing margin
     utilities in one attribute with Tailwind's emitted order picking the winner
     rather than the page. -->
<header class="flex flex-wrap items-start justify-between gap-4 {flush ? '' : 'mb-8'} {klass}">
  <div class="min-w-0">
    <!-- The app shells render their own h1 for the current route, so a heading
         lookup by name matches two elements. This names the page's own title. -->
    <h1
      data-testid="page-title"
      class={compact ? 'text-sm font-semibold text-fg' : 'text-2xl font-bold text-fg'}
    >
      {title}
    </h1>
    {#if description && !compact}<p class="mt-1 text-sm text-muted">{description}</p>{/if}
  </div>
  {#if actions}
    <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
  {/if}
</header>
