<script lang="ts">
  import type { Snippet } from 'svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import * as motion from '../motion.js';
  import {
    TONE_GLYPH,
    statusTone,
    type StatusTone,
    type StatusToneInput,
  } from '../internal/tone.js';

  /**
   * How long a confirmation holds before it clears itself.
   *
   * A toast waits 4000ms. This waits longer because it carries more: a toast is
   * one line floating over the page, and an alert is a title and a sentence
   * sitting in the reading order, which takes a beat to find and a beat to
   * read.
   */
  const DISMISS_AFTER = 5000;

  interface Props {
    tone?: StatusToneInput;
    title?: string;
    dismissible?: boolean;
    /**
     * Milliseconds before the alert closes itself, or `true` for the default.
     *
     * A confirmation clears itself. A warning and a failure stay until
     * dismissed, so this is off by default and a danger alert never takes it.
     * Pass it wherever the alert reports the outcome of a submit; leave it off
     * where a success tone states a standing condition, which does not stop
     * being true after five seconds.
     */
    autoDismiss?: number | boolean;
    ondismiss?: () => void;
    class?: string;
    children?: Snippet;
  }

  let {
    tone = 'brand',
    title = undefined,
    dismissible = false,
    autoDismiss = false,
    ondismiss = undefined,
    class: klass = '',
    children,
  }: Props = $props();

  const tones: Record<StatusTone, { wrap: string; icon: string }> = {
    neutral: { wrap: 'bg-surface-2 border-line', icon: 'text-muted' },
    brand: { wrap: 'bg-brand/8 border-brand/25', icon: 'text-brand' },
    success: { wrap: 'bg-success/8 border-success/25', icon: 'text-success' },
    warn: { wrap: 'bg-warn/8 border-warn/25', icon: 'text-warn' },
    danger: { wrap: 'bg-danger/8 border-danger/25', icon: 'text-danger' },
  };

  const t = $derived(statusTone(tone));

  /**
   * A failure and a warning interrupt, because the reader has to act. Anything
   * else waits for a pause. FormMessage already splits them this way; Alert
   * announced every tone assertively, so a green confirmation cut across
   * whatever was being read. An alert that also clears itself must not be
   * assertive: it would interrupt to say something and then take it away.
   */
  const live = $derived(t === 'danger' || t === 'warn');

  const delay = $derived(autoDismiss === true ? DISMISS_AFTER : Number(autoDismiss) || 0);

  /** An alert that can close itself can also be closed by hand. */
  const closable = $derived(dismissible || delay > 0);

  let closed = $state(false);
  /** The pointer is over the alert, or focus is inside it. */
  let held = $state(false);

  function close(): void {
    closed = true;
    ondismiss?.();
  }

  /**
   * The alert owns whether it is on screen, rather than asking the page to
   * un-render it. An outcome alert lives inside `{#if form}` in the page that
   * submitted, and nothing clears a form result short of a navigation, so a
   * callback has nothing to act on.
   */
  $effect(() => {
    if (closed || held || delay <= 0) return;
    const timer = setTimeout(close, delay);
    return () => clearTimeout(timer);
  });
</script>

{#if !closed}
  <!-- The timer stops while the pointer is over the alert or focus is inside
       it, and starts again when they leave. Text is never pulled away from
       somebody reading it. -->
  <div
    transition:motion.toast|global
    class="flex items-start gap-3 rounded-lg border px-4 py-3 {tones[t].wrap} {klass}"
    role={live ? 'alert' : 'status'}
    aria-live={live ? 'assertive' : 'polite'}
    onmouseenter={closable ? () => (held = true) : undefined}
    onmouseleave={closable ? () => (held = false) : undefined}
    onfocusin={closable ? () => (held = true) : undefined}
    onfocusout={closable ? () => (held = false) : undefined}
  >
    <span
      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current {tones[
        t
      ].icon}"
      aria-hidden="true"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d={TONE_GLYPH[t]} />
      </svg>
    </span>
    <div class="flex-1 min-w-0">
      {#if title}<p class="text-sm font-semibold text-fg">{title}</p>{/if}
      {#if children}<div class="text-sm text-muted {title ? 'mt-0.5' : ''}">
          {@render children()}
        </div>{/if}
    </div>
    {#if closable}
      <button
        type="button"
        onclick={close}
        class="{HIT_AREA} shrink-0 rounded text-faint transition-colors hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        aria-label="Dismiss"
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
