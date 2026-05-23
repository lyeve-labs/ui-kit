<script lang="ts">
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
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-faint shrink-0"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    {/if}

    {#if item.href && i < items.length - 1}
      <a href={item.href} class="text-muted hover:text-fg transition-colors truncate">
        {item.label}
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
