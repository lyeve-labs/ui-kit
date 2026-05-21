<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    class: cls = '',
    children,
  }: {
    class?: string;
    children?: Snippet;
  } = $props();
</script>

{#if children}
  <div class="flex items-center gap-3 {cls}">
    <span class="flex-1 border-t border-line"></span>
    <span class="text-xs text-faint font-medium uppercase tracking-wider whitespace-nowrap">
      {@render children()}
    </span>
    <span class="flex-1 border-t border-line"></span>
  </div>
{:else}
  <hr class="border-t border-line {cls}" />
{/if}
