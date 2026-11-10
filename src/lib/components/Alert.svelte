<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { HIT_AREA } from '../internal/touch.js';
  import * as motion from '../motion.js';
  import { statusTone, type StatusTone, type StatusToneInput } from '../internal/tone.js';
  import { createNotice } from '../internal/notice.svelte.js';
  import ToneGlyph from '../internal/ToneGlyph.svelte';

  interface Props {
    /** The status the message reports, which picks its color and glyph. */
    tone?: StatusToneInput;
    /** A bold first line above the message. */
    title?: string;
    /** Draws a close button. `autoDismiss` draws one too. */
    dismissible?: boolean;
    /**
     * Milliseconds before the alert closes itself, or `true` for the default.
     *
     * A confirmation clears itself. A warning and a failure stay until
     * dismissed, so this is off by default and a danger alert never takes it.
     * Pass it wherever the alert reports the outcome of a submit. Leave it off
     * where a success tone states a standing condition, which does not stop
     * being true after five seconds.
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
    children?: Snippet;
  }

  let {
    tone = 'brand',
    title = undefined,
    dismissible = false,
    autoDismiss = false,
    announce = false,
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

  const notice = createNotice({
    tone: () => t,
    dismissible: () => dismissible,
    autoDismiss: () => autoDismiss,
    announce: () => announce,
    ondismiss: () => ondismiss,
  });
</script>

{#if !notice.closed}
  <div
    transition:motion.toast|global
    class="flex items-start gap-3 rounded-lg border px-4 py-3 {tones[t].wrap} {klass}"
    role={notice.live ? 'alert' : undefined}
    aria-live={notice.live ? 'assertive' : notice.outcome ? 'polite' : undefined}
    aria-atomic={notice.outcome ? 'true' : undefined}
    onmouseenter={notice.closable ? () => notice.hold(true) : undefined}
    onmouseleave={notice.closable ? () => notice.hold(false) : undefined}
    onfocusin={notice.closable ? () => notice.hold(true) : undefined}
    onfocusout={notice.closable ? () => notice.hold(false) : undefined}
  >
    <ToneGlyph tone={t} class={tones[t].icon} />
    {#if notice.filled}
      <div class="flex-1 min-w-0">
        {#if title}<p class="text-sm font-semibold text-fg">{title}</p>{/if}
        {#if children}<div class="text-sm text-muted {title ? 'mt-0.5' : ''}">
            {@render children()}
          </div>{/if}
      </div>
    {/if}
    {#if notice.closable}
      <button
        type="button"
        onclick={notice.close}
        class="{HIT_AREA} shrink-0 rounded text-faint transition-colors hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        aria-label="Close"
      >
        <X size={16} aria-hidden="true" />
      </button>
    {/if}
  </div>
{/if}
