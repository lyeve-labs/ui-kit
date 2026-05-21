<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    class?: string;
    children: Snippet;
  }

  let { id, title, class: cls = '', children }: Props = $props();

  const ctx = getContext<{
    isOpen: (id: string) => boolean;
    toggle: (id: string) => void;
    flush: boolean;
  }>('accordion');

  let open = $derived(ctx.isOpen(id));
</script>

<div class="bg-surface {cls}">
  <button
    type="button"
    onclick={() => ctx.toggle(id)}
    aria-expanded={open}
    class="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium
      text-fg transition-colors hover:bg-surface-2/50"
  >
    <span>{title}</span>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 text-faint transition-transform {open ? 'rotate-180' : ''}"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>
  {#if open}
    <div class="px-5 pb-4 text-sm text-muted">
      {@render children()}
    </div>
  {/if}
</div>
