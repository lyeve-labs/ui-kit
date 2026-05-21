<script lang="ts">
  import type { Snippet } from 'svelte';

  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    size?: Size;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title = undefined,
    description = undefined,
    size = 'md',
    onclose = undefined,
    children,
    footer,
  }: Props = $props();

  const widths: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  function close() {
    open = false;
    onclose?.();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }
</script>

<svelte:window onkeydown={open ? onkeydown : undefined} />

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      aria-label="Close"
      onclick={close}
    ></button>

    <div
      class="relative w-full {widths[size]} rounded-xl border border-line bg-surface shadow-2xl
             animate-[modal-in_120ms_ease-out]"
      role="dialog"
      aria-modal="true"
    >
      {#if title}
        <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
          <div>
            <h2 class="font-semibold text-fg">{title}</h2>
            {#if description}<p class="text-sm text-muted mt-0.5">{description}</p>{/if}
          </div>
          <button
            type="button"
            onclick={close}
            class="text-faint hover:text-fg transition-colors text-xl leading-none -mt-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      {/if}

      <div class="px-5 py-4">
        {@render children()}
      </div>

      {#if footer}
        <div
          class="flex items-center justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2/40"
        >
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
