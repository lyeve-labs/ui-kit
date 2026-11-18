<script lang="ts">
  import type { Snippet } from 'svelte';
  import { deferFill } from '../internal/notice.svelte.js';
  import ToneGlyph from '../internal/ToneGlyph.svelte';
  import * as motion from '../motion.js';

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
<!--
  The region is the row the page lays out, so it opens and closes on its
  height, its margins and the gap of the column around it, and the content
  below moves with it. The region stays the element the page mounts, and only
  its text waits the two frames, so the text arriving is what a screen reader
  hears. The message arrives and leaves as an Alert does. Color alone would be
  the only thing telling a failure from a confirmation, so the glyph says it in
  a shape too.
-->
<div
  class="grid text-sm {tones[tone]} {klass}"
  role={tone === 'danger' ? 'alert' : undefined}
  aria-live={tone === 'danger' ? 'assertive' : 'polite'}
  aria-atomic={tone === 'danger' ? undefined : 'true'}
  transition:motion.collapse|global
>
  <div class="min-h-0">
    <div transition:motion.toast|global class="flex items-start gap-2">
      <ToneGlyph {tone} framed={false} />
      <p class="min-w-0 flex-1">
        {#if fill.filled}{@render children()}{/if}
      </p>
    </div>
  </div>
</div>
