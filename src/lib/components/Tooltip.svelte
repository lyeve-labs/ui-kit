<script lang="ts">
  import type { Snippet } from 'svelte';

  type Position = 'top' | 'bottom' | 'left' | 'right';

  interface Props {
    text: string;
    position?: Position;
    class?: string;
    children: Snippet;
  }

  let { text, position = 'top', class: cls = '', children }: Props = $props();

  let visible = $state(false);

  const pos: Record<Position, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  class="relative inline-flex {cls}"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
  onfocus={() => (visible = true)}
  onblur={() => (visible = false)}
>
  {@render children()}
  {#if visible}
    <span
      role="tooltip"
      class="pointer-events-none absolute {pos[position]} z-50
        whitespace-nowrap rounded-lg border border-line bg-surface-2
        px-2.5 py-1.5 text-xs text-fg shadow-xl"
    >
      {text}
    </span>
  {/if}
</span>
