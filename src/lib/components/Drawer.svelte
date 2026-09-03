<script lang="ts">
  import type { Snippet } from 'svelte';
  import { overlay } from '../internal/overlay.js';

  type Side = 'left' | 'right';
  type Size = 'sm' | 'md' | 'lg' | 'xl';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    side?: Side;
    size?: Size;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title = undefined,
    description = undefined,
    side = 'right',
    size = 'md',
    onclose = undefined,
    children,
    footer,
  }: Props = $props();

  const widths: Record<Size, string> = {
    sm: 'w-72',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[480px]',
  };

  const headingId = $props.id();
  const descriptionId = `${headingId}-description`;

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
  <div class="fixed inset-0 z-50 flex {side === 'right' ? 'justify-end' : 'justify-start'}">
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      onclick={close}
    ></button>

    <div
      use:overlay
      class="relative flex h-full max-w-full flex-col {widths[size]} bg-surface shadow-2xl
        {side === 'right' ? 'border-l' : 'border-r'} border-line
        {side === 'right'
        ? 'animate-[drawer-in-right_150ms_ease-out]'
        : 'animate-[drawer-in-left_150ms_ease-out]'}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? headingId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={title ? undefined : 'Panel'}
    >
      {#if title}
        <div class="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={headingId} class="font-semibold text-fg">{title}</h2>
            {#if description}
              <p id={descriptionId} class="mt-0.5 text-sm text-muted">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            onclick={close}
            class="-mt-0.5 text-xl leading-none text-faint transition-colors duration-150 hover:text-fg"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
            >
          </button>
        </div>
      {/if}

      <div class="flex-1 overflow-y-auto px-5 py-4">
        {@render children()}
      </div>

      {#if footer}
        <div
          class="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-2/40 px-5 py-3"
        >
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes drawer-in-right {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes drawer-in-left {
    from {
      opacity: 0;
      transform: translateX(-16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
