<script lang="ts">
  let {
    items,
    active,
    class: cls = '',
    onchange,
  }: {
    items: { id: string; label: string; count?: number }[];
    active: string;
    class?: string;
    onchange: (id: string) => void;
  } = $props();
</script>

<div role="tablist" class="flex gap-0.5 border-b border-line {cls}">
  {#each items as tab (tab.id)}
    <button
      type="button"
      role="tab"
      aria-selected={active === tab.id}
      onclick={() => onchange(tab.id)}
      class="relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap
        {active === tab.id
        ? 'text-fg after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t'
        : 'text-faint hover:text-fg'}"
    >
      {tab.label}
      {#if tab.count !== undefined}
        <span
          class="ml-1.5 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1
            rounded-full text-[10px] font-semibold
            {active === tab.id ? 'bg-brand/40 text-brand' : 'bg-surface-2 text-faint'}"
        >
          {tab.count}
        </span>
      {/if}
    </button>
  {/each}
</div>
