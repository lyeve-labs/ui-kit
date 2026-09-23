<script lang="ts">
  import { statusTone, type StatusTone, type StatusToneInput } from '../internal/tone.js';
  import { HIT_AREA } from '../internal/touch.js';
  import type { Snippet } from 'svelte';

  /**
   * How long a confirmation holds before it clears itself. The same five
   * seconds Alert waits, because a reader crossing between the two surfaces
   * should not have to learn two timings.
   */
  const DISMISS_AFTER = 5000;

  interface Props {
    tone?: StatusToneInput;
    dismissible?: boolean;
    /**
     * Milliseconds before the banner closes itself, or `true` for the default.
     *
     * A confirmation clears itself. A warning and a failure stay until
     * dismissed, so this is off by default. Pass it wherever the banner
     * reports the outcome of a submit; leave it off where it states a standing
     * condition, which does not stop being true after five seconds.
     */
    autoDismiss?: number | boolean;
    ondismiss?: () => void;
    class?: string;
    children: Snippet;
    action?: Snippet;
  }

  let {
    tone = 'brand',
    dismissible = false,
    autoDismiss = false,
    ondismiss = undefined,
    class: cls = '',
    children,
    action,
  }: Props = $props();

  let visible = $state(true);
  /** The pointer is over the banner, or focus is inside it. */
  let held = $state(false);

  function dismiss() {
    visible = false;
    ondismiss?.();
  }

  const delay = $derived(autoDismiss === true ? DISMISS_AFTER : Number(autoDismiss) || 0);

  /** A banner that can close itself can also be closed by hand. */
  const closable = $derived(dismissible || delay > 0);

  $effect(() => {
    if (!visible || held || delay <= 0) return;
    const timer = setTimeout(dismiss, delay);
    return () => clearTimeout(timer);
  });

  const tones: Record<StatusTone, string> = {
    neutral: 'bg-surface-2 border-line',
    brand: 'bg-brand/10 border-brand/20',
    success: 'bg-success/10 border-success/20',
    warn: 'bg-warn/10 border-warn/20',
    danger: 'bg-danger/10 border-danger/20',
  };

  const t = $derived(statusTone(tone));
</script>

{#if visible}
  <!-- The timer stops while the pointer is over the banner or focus is inside
       it, and starts again when they leave. Text is never pulled away from
       somebody reading it. -->
  <div
    role="status"
    class="relative flex items-center gap-3 border-b px-4 py-3 text-sm {tones[t]} {cls}"
    onmouseenter={closable ? () => (held = true) : undefined}
    onmouseleave={closable ? () => (held = false) : undefined}
    onfocusin={closable ? () => (held = true) : undefined}
    onfocusout={closable ? () => (held = false) : undefined}
  >
    <div class="flex flex-1 items-center justify-center gap-3 text-fg">
      {@render children()}
    </div>

    {#if action}
      <div class="shrink-0">{@render action()}</div>
    {/if}

    {#if closable}
      <button
        type="button"
        onclick={dismiss}
        aria-label="Dismiss"
        class="{HIT_AREA} shrink-0 text-faint transition-colors hover:text-fg"
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
    {/if}
  </div>
{/if}
