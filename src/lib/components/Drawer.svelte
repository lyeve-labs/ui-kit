<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fitOverlay, OVERLAY_WIDTH, type OverlaySize } from '../internal/layout.js';
  import { measureFields, overlay, OVERLAY_FOOTER } from '../internal/overlay.js';
  import OverlayHeader from '../internal/OverlayHeader.svelte';
  import * as motion from '../motion.js';

  type Side = 'left' | 'right';
  /** The overlay ladder, minus the rung a docked panel has no business taking. */
  type Size = Exclude<OverlaySize, 'full'>;

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    side?: Side;
    /**
     * A rung of the shared overlay ladder, or `auto` to take the one the body
     * needs: `md` up to four fields, `lg` past four, `xl` past eight.
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
    side = 'right',
    size = 'auto',
    onclose = undefined,
    children,
    footer,
  }: Props = $props();

  let fields = $state(0);

  const rung = $derived(size === 'auto' ? fitOverlay(fields) : size);

  let frameEl = $state<HTMLDivElement | undefined>();

  /**
   * The edge the panel slides from. It docks by the start and end of the
   * line, so `right` sits at the left edge of a right-to-left page, and a
   * slide from the right would cross the whole screen to get there. Read when
   * the panel moves, as AppShell reads its own drawer's.
   */
  function edge(): Side {
    const rtl = frameEl !== undefined && getComputedStyle(frameEl).direction === 'rtl';
    return (side === 'right') !== rtl ? 'right' : 'left';
  }

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
  <div
    bind:this={frameEl}
    data-print="hide"
    class="fixed inset-0 z-drawer flex {side === 'right' ? 'justify-end' : 'justify-start'}"
  >
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
      transition:motion.drawer|global={{ side: edge() }}
      class="relative flex h-full w-full flex-col {OVERLAY_WIDTH[rung]} bg-surface shadow-overlay
        {side === 'right' ? 'border-s' : 'border-e'} border-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? headingId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={title ? undefined : 'Panel'}
    >
      {#if title}
        <OverlayHeader {title} {description} {headingId} {descriptionId} onclose={close} />
      {/if}

      <div
        use:measureFields={(n) => (fields = n)}
        class="relative flex-1 overflow-y-auto px-5 py-4"
      >
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
