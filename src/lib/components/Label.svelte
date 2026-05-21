<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    for: htmlFor,
    required = false,
    hint,
    class: cls = '',
    children,
  }: {
    for?: string;
    required?: boolean;
    hint?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<label
  for={htmlFor}
  class="flex items-center gap-1 text-xs font-medium text-muted uppercase tracking-wider {cls}"
>
  {@render children()}
  {#if required}
    <span class="text-danger font-bold leading-none" aria-label="required">*</span>
  {/if}
  {#if hint}
    <span class="text-faint normal-case font-normal ml-0.5">({hint})</span>
  {/if}
</label>
