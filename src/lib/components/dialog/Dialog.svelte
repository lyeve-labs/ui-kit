<script lang="ts">
  /**
   * Dialog - modal frame component.
   *
   * Handles: focus trap, ESC to close, click-outside to close,
   * scale+fade animation, stacked z-indexing, portal to body.
   *
   * Rendered by DialogContainer for each entry in the dialog stack.
   * Not meant to be used directly - use openDialog() from dialog-manager.
   */
  import { X } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { DialogEntry } from './types.js';
  import { sizeClass } from './types.js';
  import { overlay } from '../../internal/overlay.js';
  import {
    closeDialog,
    dismissDialog,
  } from './dialog-manager.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let {
    entry,
    children,
  }: {
    entry: DialogEntry<any>;
    children?: Snippet;
  } = $props();

  // ──────────────────────────────────────────────────────
  // Animation state
  // ──────────────────────────────────────────────────────

  let visible = $state(false);
  let exiting = $state(false);

  // Stacked offset: each deeper dialog shrinks and shifts back
  let offset = $derived(entry.depth);
  let zIndex = $derived(50 + offset);

  // ──────────────────────────────────────────────────────
  // DOM refs
  // ──────────────────────────────────────────────────────

  let dialogEl = $state<HTMLDivElement>();

  // ──────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────

  // Focus entry, the Tab trap, the body scroll lock and focus restore all come
  // from `use:overlay` on the panel below, which is the same implementation
  // Modal and Drawer use. This is only the enter animation.
  onMount(() => {
    requestAnimationFrame(() => {
      visible = true;
    });
  });

  // ──────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────

  function handleBackdropClick(e: MouseEvent) {
    // Only close if clicking the backdrop itself (not the dialog panel)
    if (e.target === e.currentTarget && !entry.options.persistent) {
      handleDismiss();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!entry.options.persistent) {
        handleDismiss();
      }
    }
  }

  async function handleDismiss(): Promise<void> {
    exiting = true;
    // Wait for exit animation
    await new Promise((r) => setTimeout(r, 200));
    dismissDialog(entry.id);
  }

  async function handleClose(value?: unknown): Promise<void> {
    exiting = true;
    await new Promise((r) => setTimeout(r, 200));
    closeDialog(value, entry.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- z-index is an inline style, not a `z-[...]` class. Tailwind scans source text
     for complete class names, so a class built from a runtime value matches no
     candidate and no rule is ever generated: every stacked dialog rendered at
     `z-index: auto` and the stacking order came down to DOM order. -->
<div
  class="fixed inset-0 flex items-center justify-center"
  style="z-index: {zIndex}"
  role="presentation"
>
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
    class:opacity-0={!visible || exiting}
    class:opacity-100={visible && !exiting}
    onclick={handleBackdropClick}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Escape' && !entry.options.persistent) handleDismiss();
    }}
    role="presentation"
  ></div>

  <!-- Dialog panel -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    bind:this={dialogEl}
    use:overlay
    class="relative w-full {sizeClass(entry.options.size ?? 'md')} mx-4
			bg-surface border border-line rounded-xl shadow-2xl
			transition-all duration-200 ease-out
			focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    class:opacity-0={!visible || exiting}
    class:opacity-100={visible && !exiting}
    style="transform: scale({visible && !exiting ? 1 - offset * 0.03 : 0.95}) translateY({offset *
      16}px);
			transform-origin: center;"
    role="dialog"
    aria-modal="true"
    aria-label={typeof entry.options.title === 'string' ? entry.options.title : 'Dialog'}
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-6 pt-6 pb-2">
      <div class="flex-1 min-w-0">
        {#if entry.options.title && entry.meta?.confirmTitle === undefined}
          {#if typeof entry.options.title === 'string'}
            <h2 class="text-lg font-semibold text-fg truncate">
              {entry.options.title}
            </h2>
          {:else}
            {@render entry.options.title()}
          {/if}
        {/if}
      </div>

      {#if !entry.options.persistent}
        <button
          class="inline-flex items-center justify-center w-8 h-8 -mr-2 rounded-lg
						text-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150 shrink-0"
          onclick={() => handleClose()}
          aria-label="Close"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>

    <!-- Body -->
    <div class="px-6 py-2">
      {#if entry.options.body}
        {@render entry.options.body()}
      {:else if entry.meta?.confirmTitle !== undefined}
        <ConfirmDialog {entry} />
      {:else if children}
        {@render children()}
      {/if}
    </div>

    <!-- Footer -->
    {#if entry.options.footer}
      <div class="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
        {@render entry.options.footer()}
      </div>
    {/if}
  </div>
</div>
