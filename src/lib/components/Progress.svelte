<script lang="ts">
  import type { AccentTone } from '../internal/tone.js';
  type Size = 'xs' | 'sm' | 'md';

  interface Props {
    /** How far along, out of `max`. Clamped to the bar. */
    value: number;
    /** The value that fills the bar. */
    max?: number;
    tone?: AccentTone;
    size?: Size;
    label?: string;
    /** Shows the percentage beside the label. */
    showValue?: boolean;
    /** Pulses the fill, for a value that is still moving. */
    animated?: boolean;
    class?: string;
  }

  let {
    value,
    max = 100,
    tone = 'brand',
    size = 'sm',
    label = undefined,
    showValue = false,
    animated = false,
    class: cls = '',
  }: Props = $props();

  let pct = $derived(
    isFinite(value) && isFinite(max) && max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : 0,
  );

  /**
   * The brand fill runs cyan into violet, the accent the kit keeps for a mark
   * a few pixels wide, and both ends clear 3:1 against the track in both
   * palettes. bg-brand stays under it for paper, which draws no gradient. It
   * runs from the start edge, so under right-to-left the fill is mirrored and
   * its cyan end still sits where the bar starts.
   *
   * A forced colors scheme replaces every background color with the canvas,
   * which erased the track and the fill alike. There the track draws a border
   * and the fill opts out of the forced palette to paint in the system text
   * color, so the value is still there to read.
   */
  const tones: Record<AccentTone, string> = {
    neutral: 'bg-muted',
    brand: 'bg-brand bg-accent',
    violet: 'bg-violet',
    success: 'bg-success',
    warn: 'bg-warn',
    danger: 'bg-danger',
  };

  const sizes: Record<Size, string> = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
  };
</script>

<div class={cls}>
  {#if label || showValue}
    <div class="flex items-center justify-between mb-1.5">
      {#if label}<span class="text-xs font-medium text-muted">{label}</span>{/if}
      {#if showValue}<span class="text-xs tabular-nums text-faint">{Math.round(pct)}%</span>{/if}
    </div>
  {/if}
  <div
    class="w-full overflow-hidden rounded-full bg-surface-2 inset-shadow-well {sizes[size]}
      forced-colors:border forced-colors:border-[color:CanvasText]"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-label={label}
  >
    <div
      class="h-full rounded-full transition-[width] duration-progress rtl:-scale-x-100
        forced-colors:forced-color-adjust-none forced-colors:bg-[color:CanvasText]
        {tones[tone]}
        {animated ? 'animate-pulse' : ''}"
      style="width: {pct}%"
    ></div>
  </div>
</div>
