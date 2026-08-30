<script lang="ts">
  import type { AccentTone } from '../internal/tone.js';
  type Size = 'xs' | 'sm' | 'md';

  interface Props {
    value: number;
    max?: number;
    tone?: AccentTone;
    size?: Size;
    label?: string;
    showValue?: boolean;
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

  const tones: Record<AccentTone, string> = {
    neutral: 'bg-muted',
    brand: 'bg-brand',
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
    class="w-full overflow-hidden rounded-full bg-surface-2 {sizes[size]}"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-label={label}
  >
    <div
      class="h-full rounded-full transition-[width] duration-500
        {tones[tone]}
        {animated ? 'animate-pulse' : ''}"
      style="width: {pct}%"
    ></div>
  </div>
</div>
