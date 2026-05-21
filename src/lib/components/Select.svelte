<script lang="ts">
  import type { Snippet } from 'svelte';

  type SE = Event & { currentTarget: HTMLSelectElement };

  let {
    value,
    id,
    name,
    required = false,
    disabled = false,
    error,
    class: cls = '',
    onchange,
    children,
  }: {
    value?: string | null;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
    onchange?: (e: SE) => void;
    children?: Snippet;
  } = $props();

  const base =
    'w-full bg-surface-2 rounded-lg px-3 py-2 text-sm text-fg ' +
    'focus:outline-none transition-colors appearance-none cursor-pointer ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';
</script>

<div class="flex flex-col gap-1 {cls}">
  <div class="relative">
    <select
      {id}
      {name}
      {required}
      {disabled}
      value={value ?? ''}
      {onchange}
      class="{base}
        {error
        ? 'border border-danger focus:border-danger/70'
        : 'border border-line focus:border-brand/50'}
        pr-8"
    >
      {@render children?.()}
    </select>
    <span
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint"
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 4l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>
  {#if error}
    <p class="text-xs text-danger">{error}</p>
  {/if}
</div>
