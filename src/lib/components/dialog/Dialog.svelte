<script lang="ts">
  /**
   * Dialog - modal frame component.
   *
   * Handles: focus trap, ESC to close, click-outside to close, the entrance
   * and exit through the kit's motion presets, stacked z-indexing, portal to
   * body.
   *
   * Rendered by DialogContainer for each entry in the dialog stack.
   * Not meant to be used directly - use openDialog() from dialog-manager.
   */
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { DialogEntry } from './types.js';
  import { sizeClass } from './types.js';
  import { overlay } from '../../internal/overlay.js';
  import * as motion from '../../motion.js';
  import { closeDialog, dismissDialog } from './dialog-manager.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let {
    entry,
    children,
  }: {
    entry: DialogEntry<any>;
    children?: Snippet;
  } = $props();

  // Stacked offset: each deeper dialog shrinks, shifts back and rises
  let offset = $derived(entry.depth);

  // ──────────────────────────────────────────────────────
  // DOM refs
  // ──────────────────────────────────────────────────────

  let dialogEl = $state<HTMLDivElement>();

  // ──────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────

  // Focus entry, the Tab trap, the body scroll lock and focus restore all come
  // from `use:overlay` on the panel below, which is the same implementation
  // Modal and Drawer use. The entrance and the exit are the same presets too:
  // removing the entry from the stack plays the exit before the element goes,
  // so nothing here waits on a timer to match a duration written elsewhere.

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

  function handleDismiss(): void {
    dismissDialog(entry.id);
  }

  function handleClose(value?: unknown): void {
    closeDialog(value, entry.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- z-index is an inline style, not a `z-[...]` class. Tailwind scans source text
     for complete class names, so a class built from a runtime value matches no
     candidate and no rule is ever generated: every stacked dialog rendered at
     `z-index: auto` and the stacking order came down to DOM order.

     The base is the modal layer rather than the literal 50 it used to be. 50
     was the number every floating surface in the kit happened to hold, so a
     dialog neither sat above a drawer nor below a tooltip on purpose; it sat
     wherever the document put it. The offset climbs from there, and the layer
     above is 100 clear of this one. -->
<div
  class="fixed inset-0 flex items-center justify-center"
  style="z-index: calc(var(--z-index-modal) + {offset})"
  role="presentation"
>
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    transition:motion.scrim|global
    class="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
    transition:motion.dialog|global
    class="relative w-full {sizeClass(entry.options.size ?? 'md')} mx-4
			bg-surface border border-line rounded-xl shadow-2xl
			transition-transform duration-slow
			focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    style="transform: scale({1 - offset * 0.03}) translateY({offset * 16}px);
			transform-origin: center;"
    role="dialog"
    aria-modal="true"
    aria-label={typeof entry.options.title === 'string' ? entry.options.title : 'Dialog'}
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <!-- Header. A confirm dialog has none: it renders its own title beside
         the warning icon and offers Cancel, so a header here was an empty row
         with a close control in it, and that control was the first thing
         focused. Escape still dismisses. -->
    {#if entry.meta?.confirmTitle === undefined}
      <div class="flex items-center justify-between px-6 pt-6 pb-2">
        <div class="flex-1 min-w-0">
          {#if entry.options.title}
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
            class="inline-flex items-center justify-center w-8 h-8 -me-2 rounded-lg
						text-muted hover:text-fg hover:bg-surface-2 transition-colors shrink-0"
            onclick={() => handleClose()}
            aria-label="Close"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    {/if}

    <!-- Body -->
    <div class={entry.meta?.confirmTitle === undefined ? 'px-6 py-2' : 'px-6 pt-6 pb-2'}>
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
