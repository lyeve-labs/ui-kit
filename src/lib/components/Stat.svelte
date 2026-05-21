<script lang="ts">
  type Trend = 'up' | 'down' | 'flat';
  type Accent = 'brand' | 'violet' | 'success' | 'neutral';

  interface Props {
    label: string;
    value: string | number;
    sub?: string;
    trend?: Trend;
    change?: string;
    accent?: Accent;
    class?: string;
  }

  let {
    label,
    value,
    sub = undefined,
    trend = undefined,
    change = undefined,
    accent = 'brand',
    class: klass = '',
  }: Props = $props();

  const accents = {
    brand: 'text-brand',
    violet: 'text-violet',
    success: 'text-success',
    neutral: 'text-fg',
  } as const;

  const trendColor = { up: 'text-success', down: 'text-danger', flat: 'text-muted' } as const;
  const trendMark = { up: '↑', down: '↓', flat: '→' } as const;
</script>

<div class="rounded-xl border border-line bg-surface p-5 {klass}">
  <p class="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
  <p class="mt-2 text-2xl font-bold {accents[accent]}">{value}</p>
  <div class="mt-1 flex items-center gap-2">
    {#if trend && change}
      <span class="text-xs font-medium {trendColor[trend]}">{trendMark[trend]} {change}</span>
    {/if}
    {#if sub}<span class="text-xs text-muted">{sub}</span>{/if}
  </div>
</div>
