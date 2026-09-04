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
    class?: string;
    actions?: Snippet;
  }

  let {
    title,
    description = undefined,
    compact = false,
    class: klass = '',
    actions,
  }: Props = $props();
</script>

<!-- No margin of its own. The header carried mb-8 ahead of the consumer's
     class, so a page that wanted a different gap shipped two margin utilities
     in one attribute and Tailwind's emitted order picked the winner, not the
     page. PageShell's section stack supplies the gap now. -->
<header class="flex flex-wrap items-start justify-between gap-4 {klass}">
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
