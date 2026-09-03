<script lang="ts">
  import type { Snippet } from 'svelte';
  import { overlay } from '../internal/overlay.js';

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

  // aria-labelledby needs an id that is unique per instance, because two modals
  // can be mounted at once while one animates out.
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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      onclick={close}
    ></button>

    <div
      use:overlay
      class="relative flex max-h-[calc(100dvh-2rem)] w-full {widths[size]} flex-col
             overflow-hidden rounded-xl border border-line bg-surface shadow-2xl
             animate-[modal-in_120ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? headingId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={title ? undefined : 'Dialog'}
    >
      {#if title}
        <div
          class="flex shrink-0 items-start justify-between gap-4 px-5 py-4 border-b border-line"
        >
          <div>
            <h2 id={headingId} class="font-semibold text-fg">{title}</h2>
            {#if description}
              <p id={descriptionId} class="text-sm text-muted mt-0.5">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            onclick={close}
            class="shrink-0 rounded text-faint transition-colors duration-150 hover:text-fg
                   outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
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

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {@render children()}
      </div>

      {#if footer}
        <div
          class="flex shrink-0 items-center justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2/40"
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
