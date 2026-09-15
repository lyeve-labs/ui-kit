<script lang="ts">
  import { HIT_AREA } from '../internal/touch.js';

  let {
    items,
    class: cls = '',
  }: {
    items: { label: string; href?: string }[];
    class?: string;
  } = $props();

  function safeUrl(url: string | undefined): string | undefined {
    return url && !/^(javascript|data):/i.test(url) ? url : undefined;
  }
</script>

<nav aria-label="Breadcrumb" class="flex items-center gap-1 text-xs {cls}">
  {#each items as item, i}
    {#if i > 0}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-faint shrink-0 rtl:rotate-180"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    {/if}

    {#if item.href && i < items.length - 1}
      <!-- The link is a flex box around a truncating span rather than
           truncating itself: `truncate` clips overflow, and the hit box a
           finger gets is drawn outside the link's own edges. -->
      <a
        href={safeUrl(item.href)}
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
