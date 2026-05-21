<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  interface DropdownItem {
    label: string;
    icon?: Component<{ size?: number; class?: string }>;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    onclick: () => void;
  }

  let {
    items,
    align = 'right',
    class: cls = '',
    trigger,
  }: {
    items: DropdownItem[];
    align?: 'left' | 'right';
    class?: string;
    trigger: Snippet<[{ open: boolean; toggle: () => void }]>;
  } = $props();

  let open = $state(false);
  let containerEl: HTMLDivElement | undefined = $state();

  function toggle() { open = !open; }

  function handleItemClick(item: DropdownItem) {
    if (item.disabled) return;
    open = false;
    item.onclick();
  }

  function handleOutsideClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleOutsideClick, { capture: true });
      document.addEventListener('keydown', handleKeydown);
    } else {
      document.removeEventListener('click', handleOutsideClick, { capture: true });
      document.removeEventListener('keydown', handleKeydown);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick, { capture: true });
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div bind:this={containerEl} class="relative inline-block {cls}">
  {@render trigger({ open, toggle })}

  {#if open}
    <div
      role="menu"
      class="absolute z-50 mt-1 py-1 min-w-36 rounded-xl border border-line
        bg-surface shadow-2xl
        {align === 'right' ? 'right-0' : 'left-0'}"
    >
      {#each items as item}
        <button
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onclick={() => handleItemClick(item)}
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
            {item.variant === 'danger'
              ? 'text-danger hover:bg-danger/10'
              : 'text-fg hover:bg-surface-2'}"
        >
          {#if item.icon}
            {@const Icon = item.icon}
            <Icon size={14} class="shrink-0" />
          {/if}
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
