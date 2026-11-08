<script lang="ts">
  /**
   * The glyph that says a message's tone in a shape as well as a color: a tick,
   * a cross, an exclamation or an i. Stroked SVG rather than a font glyph,
   * which lands at whatever weight the reader's font gives it.
   */
  import { TONE_GLYPH, type StatusTone } from './tone.js';

  interface Props {
    tone: StatusTone;
    /** Draws the glyph inside a ring, as Alert and Toaster do. FormMessage draws it bare. */
    framed?: boolean;
    class?: string;
  }

  let { tone, framed = true, class: klass = '' }: Props = $props();
</script>

{#snippet glyph(size: number, cls: string)}
  <svg
    class={cls || undefined}
    width={size}
    height={size}
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
{/snippet}

{#if framed}
  <span
    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current {klass}"
    aria-hidden="true"
  >
    {@render glyph(11, '')}
  </span>
{:else}
  {@render glyph(15, `mt-0.5 shrink-0 ${klass}`.trim())}
{/if}
