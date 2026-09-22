<script lang="ts">
  import type { Snippet } from 'svelte';
  import { countFields } from '../internal/field.js';
  import { fitOverlay, OVERLAY_WIDTH, type OverlaySize } from '../internal/layout.js';
  import { HIT_AREA } from '../internal/touch.js';
  import { overlay } from '../internal/overlay.js';
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
     *
     * `auto` is the default because the caller was the wrong one to ask. Every
     * drawer in three consoles asked for the widest rung the kit had, which is
     * what a ladder that stops too early looks like from the outside, and the
     * body is the only thing that knows whether it is two fields or twelve.
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

  let body: HTMLElement | undefined = $state();
  let fields = $state(0);

  /*
   * The count is measured rather than declared, so it cannot go stale. A form
   * that reveals two more fields when a period is set to custom, or drops a
   * whole section behind a toggle, changes what it needs while it is open,
   * which is why the observer stays for as long as the panel does.
   *
   * It runs before the browser paints the panel, so a drawer opens at the
   * width it will keep: the effect is flushed in the same task as the mount,
   * and the entrance animates transform alone.
   */
  $effect(() => {
    const el = body;
    if (!open || !el) return;
    const measure = () => (fields = countFields(el));
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  const rung = $derived(size === 'auto' ? fitOverlay(fields) : size);

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
      transition:motion.drawer|global={{ side }}
      class="relative flex h-full w-full flex-col {OVERLAY_WIDTH[rung]} bg-surface shadow-2xl
        {side === 'right' ? 'border-s' : 'border-e'} border-line"
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
            class="{HIT_AREA} -mt-0.5 text-xl leading-none text-faint transition-colors hover:text-fg"
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

      <div bind:this={body} class="flex-1 overflow-y-auto px-5 py-4">
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
