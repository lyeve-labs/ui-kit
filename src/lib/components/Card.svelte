<script lang="ts">
  import type { Snippet } from 'svelte';

  type Pad = 'none' | 'sm' | 'md' | 'lg';

  interface Props {
    title?: string;
    description?: string;
    pad?: Pad;
    hover?: boolean;
    class?: string;
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
  }

  let {
    title = undefined,
    description = undefined,
    pad = 'md',
    hover = false,
    class: klass = '',
    header,
    footer,
    children,
  }: Props = $props();

  const pads: Record<Pad, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };
</script>

<div
  class="bg-surface border border-line rounded-xl overflow-hidden transition-colors {hover
    ? 'hover:border-line/0 hover:ring-1 hover:ring-brand/30'
    : ''} {klass}"
>
  {#if header || title}
    <div class="px-5 py-4 border-b border-line">
      {#if header}
        {@render header()}
      {:else}
        <h3 class="font-semibold text-fg">{title}</h3>
        {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
      {/if}
    </div>
  {/if}

  <div class={pads[pad]}>
    {@render children()}
  </div>

  {#if footer}
    <div class="px-5 py-3 border-t border-line bg-surface-2/40">
      {@render footer()}
    </div>
  {/if}
</div>
