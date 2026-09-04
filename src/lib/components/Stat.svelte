<script lang="ts">
  /**
   * One measured number with its label.
   *
   * Two apps each declared a local Stat snippet for the same job and the two
   * were visually unrelated: one a bordered card with a mono value, the other a
   * bare div at body size. `size`, `tone` and `mono` are what let both of them
   * use this one instead.
   */
  import type { StatusTone } from '../internal/tone.js';

  type Trend = 'up' | 'down' | 'flat';
  type Accent = 'brand' | 'violet' | 'success' | 'neutral';
  type Size = 'sm' | 'md';

  interface Props {
    label: string;
    value: string | number;
    sub?: string;
    trend?: Trend;
    change?: string;
    accent?: Accent;
    /** `sm` for a dense row of figures, `md` for a card of its own. */
    size?: Size;
    /**
     * The status the figure reports, which colours the value.
     *
     * Wins over `accent` when it is set. `accent` is the decorative vocabulary
     * and has no warn or danger, so a number that is over its quota could only
     * be stated in prose beside it. Only the canonical spellings are accepted:
     * the tone vocabulary keeps `info` as an alias for the components that
     * already shipped it, and this prop never shipped anything to keep working.
     */
    tone?: StatusTone;
    /**
     * Tabular figures for a value that changes.
     *
     * A proportional 1 is narrower than a proportional 0, so a counter that
     * ticks changes width on nearly every update and shoves whatever sits
     * beside it sideways. The mono family and tabular figures together hold
     * every digit on the same advance.
     */
    mono?: boolean;
    class?: string;
  }

  let {
    label,
    value,
    sub = undefined,
    trend = undefined,
    change = undefined,
    accent = 'brand',
    size = 'md',
    tone = undefined,
    mono = false,
    class: klass = '',
  }: Props = $props();

  const accents = {
    brand: 'text-brand',
    violet: 'text-violet',
    success: 'text-success',
    neutral: 'text-fg',
  } as const;

  const tones: Record<StatusTone, string> = {
    neutral: 'text-fg',
    brand: 'text-brand',
    success: 'text-success',
    warn: 'text-warn',
    danger: 'text-danger',
  };

  const pads: Record<Size, string> = { sm: 'p-4', md: 'p-5' };
  const values: Record<Size, string> = {
    sm: 'mt-1 text-lg font-semibold',
    md: 'mt-2 text-2xl font-bold',
  };

  const valueColor = $derived(tone ? tones[tone] : accents[accent]);

  const trendColor = { up: 'text-success', down: 'text-danger', flat: 'text-muted' } as const;
  const trendMark = { up: '↑', down: '↓', flat: '→' } as const;
</script>

<div class="rounded-xl border border-line bg-surface {pads[size]} {klass}">
  <p class="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
  <p class="{values[size]} {valueColor} {mono ? 'font-mono tabular-nums' : ''}">{value}</p>
  <div class="mt-1 flex items-center gap-2">
    {#if trend && change}
      <span class="text-xs font-medium {trendColor[trend]}">{trendMark[trend]} {change}</span>
    {/if}
    {#if sub}<span class="text-xs text-muted">{sub}</span>{/if}
  </div>
</div>
