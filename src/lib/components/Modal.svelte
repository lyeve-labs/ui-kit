<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fitOverlay, OVERLAY_WIDTH, type OverlaySize } from '../internal/layout.js';
  import { measureFields, overlay, OVERLAY_FOOTER } from '../internal/overlay.js';
  import OverlayHeader from '../internal/OverlayHeader.svelte';
  import * as motion from '../motion.js';

  /** The shared overlay ladder, minus the rung the dialog stack keeps for a table. */
  type Size = Exclude<OverlaySize, 'full'>;

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    /**
     * A rung of the shared overlay ladder, or `auto` to take the one the body
     * needs: `md` up to four fields, `lg` past four, `xl` past eight.
     *
     * The same rule a Drawer follows, so an edit form reads the same size
     * whichever of the two a page opens it in.
     */
    size?: Size | 'auto';
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title = undefined,
    description = undefined,
    size = 'auto',
    onclose = undefined,
    children,
    footer,
  }: Props = $props();

  let fields = $state(0);

  const rung = $derived(size === 'auto' ? fitOverlay(fields) : size);

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
  <div class="fixed inset-0 z-modal flex items-center justify-center p-4">
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      onclick={close}
      transition:motion.scrim|global
    ></button>

    <div
      use:overlay
      transition:motion.dialog|global
      class="relative flex max-h-[calc(100dvh-2rem)] w-full {OVERLAY_WIDTH[rung]} flex-col
             overflow-hidden rounded-card border border-line bg-surface bg-card shadow-overlay inset-shadow-highlight"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? headingId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={title ? undefined : 'Dialog'}
    >
      {#if title}
        <OverlayHeader {title} {description} {headingId} {descriptionId} onclose={close} />
      {/if}

      <div use:measureFields={(n) => (fields = n)} class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {@render children()}
      </div>

      {#if footer}
        <div class={OVERLAY_FOOTER}>
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
