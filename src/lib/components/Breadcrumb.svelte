<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { safeHref } from '../internal/href.js';
  import { HIT_AREA } from '../internal/touch.js';

  let {
    items,
    class: cls = '',
  }: {
    items: { label: string; href?: string }[];
    class?: string;
  } = $props();
</script>

<nav aria-label="Breadcrumb" class="flex items-center gap-1 text-xs {cls}">
  {#each items as item, i}
    {#if i > 0}
      <ChevronRight size={12} class="text-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
    {/if}

    {#if item.href && i < items.length - 1}
      <!-- The link is a flex box around a truncating span rather than
           truncating itself: `truncate` clips overflow, and the hit box a
           finger gets is drawn outside the link's own edges. -->
      <a
        href={safeHref(item.href)}
        class="{HIT_AREA} inline-flex min-w-0 text-muted hover:text-fg transition-colors"
      >
        <span class="min-w-0 truncate">{item.label}</span>
      </a>
    {:else}
      <span
        class="text-fg font-medium truncate"
        aria-current={i === items.length - 1 ? 'page' : undefined}
      >
        {item.label}
      </span>
    {/if}
  {/each}
</nav>
