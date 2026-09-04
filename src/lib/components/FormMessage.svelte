<script lang="ts">
  import type { Snippet } from 'svelte';
  import { TONE_GLYPH } from '../internal/tone.js';

  /** The two outcomes a submit has. Anything else is a hint, not a result. */
  type Tone = 'danger' | 'success';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'danger', class: klass = '', children }: Props = $props();

  /**
   * The message colour, stated once.
   *
   * Eleven pages rendered a submit outcome into a bare paragraph and picked
   * their own size and colour for it, so the same failure read as three
   * different things depending on which settings page the user was on.
   */
  const tones: Record<Tone, string> = {
    danger: 'text-danger',
    success: 'text-success',
  };

  /**
   * A live region reports a CHANGE to what it holds. A region that arrives in
   * the document with its text already inside it is not a change, and nothing
   * is read out: that is why every toast was silent while each toast carried
   * its own role="status". Toaster fixed it by keeping one region mounted for
   * the life of the app and moving each toast into it.
   *
   * A submit outcome has no such permanent host, because the page mounts this
   * component at the moment the submit resolves. So the region goes in empty
   * and the message is placed inside it on the next frame, which is the same
   * shape of change a toast makes.
   *
   * The server runs no effect and has no frames, so it renders the message
   * straight away: a page delivered without its client bundle still carries
   * the outcome of the submit, which matters more than announcing it.
   */
  let filled = $state(typeof window === 'undefined');

  $effect(() => {
    const frame = requestAnimationFrame(() => (filled = true));
    return () => cancelAnimationFrame(frame);
  });
</script>

<!--
  The tones differ in more than colour. A failure takes role="alert", which
  interrupts whatever the reader is doing, because the submit did not go
  through and the user has to act on it. A confirmation takes aria-live
  "polite" and waits for a pause, because the work is done and nothing is being
  asked of anyone.
-->
<div
  class="flex items-start gap-2 text-sm {tones[tone]} {klass}"
  role={tone === 'danger' ? 'alert' : 'status'}
  aria-live={tone === 'danger' ? 'assertive' : 'polite'}
>
  {#if filled}
    <!-- Stroked SVG, not a literal cross or tick: a font glyph lands at
         whatever weight the reader's font gives it, which sat visibly lighter
         than every other icon in the library. Colour alone would also be the
         only thing telling a failure from a confirmation. -->
    <svg
      class="mt-0.5 shrink-0"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={TONE_GLYPH[tone]} />
    </svg>
    <p class="min-w-0 flex-1">{@render children()}</p>
  {/if}
</div>
