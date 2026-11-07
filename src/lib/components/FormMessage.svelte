<script lang="ts">
  import type { Snippet } from 'svelte';
  import { deferFill } from '../internal/notice.svelte.js';
  import ToneGlyph from '../internal/ToneGlyph.svelte';

  /** The two outcomes a submit has. Anything else is a hint, not a result. */
  type Tone = 'danger' | 'success';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'danger', class: klass = '', children }: Props = $props();

  /**
   * The message color, stated once.
   *
   * Eleven pages rendered a submit outcome into a bare paragraph and picked
   * their own size and color for it, so the same failure read as three
   * different things depending on which settings page the user was on.
   */
  const tones: Record<Tone, string> = {
    danger: 'text-danger',
    success: 'text-success',
  };

  /**
   * The page mounts this component at the moment the submit resolves, so the
   * region has no permanent host the way Toaster's does. Its text is deferred
   * so the region is read as a change.
   */
  const fill = deferFill(() => true);
</script>

<!--
  The tones differ in more than color. A failure takes role="alert", which
  interrupts whatever the reader is doing, because the submit did not go
  through and the user has to act on it. A confirmation takes aria-live
  "polite" and waits for a pause, because the work is done and nothing is being
  asked of anyone. It takes no role: browsers expose role="status" as a status
  bar, and Orca speaks nothing inserted into one.
-->
<div
  class="flex items-start gap-2 text-sm {tones[tone]} {klass}"
  role={tone === 'danger' ? 'alert' : undefined}
  aria-live={tone === 'danger' ? 'assertive' : 'polite'}
  aria-atomic={tone === 'danger' ? undefined : 'true'}
>
  {#if fill.filled}
    <!-- Color alone would be the only thing telling a failure from a
         confirmation, so the glyph says it in a shape too. -->
    <ToneGlyph {tone} framed={false} />
    <p class="min-w-0 flex-1">{@render children()}</p>
  {/if}
</div>
