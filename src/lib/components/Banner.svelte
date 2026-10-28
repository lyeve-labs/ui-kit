<script lang="ts">
  import { statusTone, type StatusTone, type StatusToneInput } from '../internal/tone.js';
  import { HIT_AREA } from '../internal/touch.js';
  import * as motion from '../motion.js';
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
     * reports the outcome of a submit. Leave it off where it states a standing
     * condition, which does not stop being true after five seconds.
     */
    autoDismiss?: number | boolean;
    /**
     * Announces the message when it appears, and every change to it after,
     * without clearing it. For a result that stays on screen, such as a
     * confirmation that replaces a form or a status that a poll updates.
     * A message without this or `autoDismiss` states a standing condition
     * and is read out by nobody, so a page load says nothing.
     */
    announce?: boolean;
    ondismiss?: () => void;
    class?: string;
    children: Snippet;
    action?: Snippet;
  }

  let {
    tone = 'brand',
    dismissible = false,
    autoDismiss = false,
    announce = false,
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

  /**
   * A failure and a warning interrupt, because the reader has to act, as
   * Alert does. Anything else waits for a pause. A banner that clears itself
   * waits too: interrupting to say something and then taking it away leaves
   * the reader with nothing to act on. The polite branch takes no role, as
   * Alert's does, because Orca speaks nothing inserted into a status role.
   */
  const live = $derived((t === 'danger' || t === 'warn') && delay <= 0);

  /**
   * A live region reports a change to what it holds, and an outcome banner
   * arrives inside `{#if form}` already holding its text, so nothing would be
   * read out. A banner that reports an outcome, one that clears itself or
   * takes `announce`, mounts without its text and takes it two frames later,
   * as FormMessage does. It is atomic, as role="status" made it, so a change
   * reads the whole message. One that states a standing condition is no live
   * region at all: it must not be read out because the page loaded, and
   * Chrome reads a polite region that a client-side navigation inserts. A
   * failure or a warning that stays is the alert branch and is never deferred.
   */
  const outcome = $derived(!live && (delay > 0 || announce));
  let filled = $state(typeof window === 'undefined');

  $effect(() => {
    if (!outcome) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => (filled = true));
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

{#if visible}
  <!-- The timer stops while the pointer is over the banner or focus is inside
       it, and starts again when they leave. Text is never pulled away from
       somebody reading it. It leaves on the toast preset, as Alert does,
       rather than vanishing in one frame. -->
  <div
    transition:motion.toast|global
    role={live ? 'alert' : undefined}
    aria-live={live ? 'assertive' : outcome ? 'polite' : undefined}
    aria-atomic={outcome ? 'true' : undefined}
    class="relative flex items-center gap-3 border-b px-4 py-3 text-sm {tones[t]} {cls}"
    onmouseenter={closable ? () => (held = true) : undefined}
    onmouseleave={closable ? () => (held = false) : undefined}
    onfocusin={closable ? () => (held = true) : undefined}
    onfocusout={closable ? () => (held = false) : undefined}
  >
    {#if filled || !outcome}
      <div class="flex flex-1 items-center justify-center gap-3 text-fg">
        {@render children()}
      </div>
    {/if}

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
