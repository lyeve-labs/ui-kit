<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: cls = '', children }: Props = $props();
</script>

<kbd
  class="inline-flex items-center justify-center rounded border border-line bg-surface-2
    px-1.5 py-0.5 font-mono text-[11px] text-muted
    shadow-[inset_0_-1px_0] shadow-line {cls}"
>
  {@render children()}
</kbd>
