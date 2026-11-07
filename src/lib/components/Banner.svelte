<script lang="ts">
  import { statusTone, type StatusTone, type StatusToneInput } from '../internal/tone.js';
  import { createNotice } from '../internal/notice.svelte.js';
  import { HIT_AREA } from '../internal/touch.js';
  import * as motion from '../motion.js';
  import type { Snippet } from 'svelte';

  interface Props {
    /** The status the message reports, which picks its color. */
    tone?: StatusToneInput;
    /** Draws a close button. `autoDismiss` draws one too. */
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
    /** A control at the end of the banner, such as a button that fixes the condition. */
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

  const tones: Record<StatusTone, string> = {
    neutral: 'bg-surface-2 border-line',
    brand: 'bg-brand/10 border-brand/20',
    success: 'bg-success/10 border-success/20',
    warn: 'bg-warn/10 border-warn/20',
    danger: 'bg-danger/10 border-danger/20',
  };

  const t = $derived(statusTone(tone));

  const notice = createNotice({
    tone: () => t,
    dismissible: () => dismissible,
    autoDismiss: () => autoDismiss,
    announce: () => announce,
    ondismiss: () => ondismiss,
  });
</script>

{#if !notice.closed}
  <!-- It leaves on the toast preset, as Alert does, rather than vanishing in
       one frame. -->
  <div
    transition:motion.toast|global
    role={notice.live ? 'alert' : undefined}
    aria-live={notice.live ? 'assertive' : notice.outcome ? 'polite' : undefined}
    aria-atomic={notice.outcome ? 'true' : undefined}
    class="relative flex items-center gap-3 border-b px-4 py-3 text-sm {tones[t]} {cls}"
    onmouseenter={notice.closable ? () => notice.hold(true) : undefined}
    onmouseleave={notice.closable ? () => notice.hold(false) : undefined}
    onfocusin={notice.closable ? () => notice.hold(true) : undefined}
    onfocusout={notice.closable ? () => notice.hold(false) : undefined}
  >
    {#if notice.filled}
      <div class="flex flex-1 items-center justify-center gap-3 text-fg">
        {@render children()}
      </div>
    {/if}

    {#if action}
      <div class="shrink-0">{@render action()}</div>
    {/if}

    {#if notice.closable}
      <button
        type="button"
        onclick={notice.close}
        aria-label="Close"
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
