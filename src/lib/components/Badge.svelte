<script lang="ts">
  import type { Snippet } from 'svelte';

  type Tone = 'neutral' | 'brand' | 'violet' | 'success' | 'warn' | 'danger';
  type Size = 'sm' | 'md';

  interface Props {
    tone?: Tone;
    size?: Size;
    dot?: boolean;
    class?: string;
    children: Snippet;
  }

  let { tone = 'neutral', size = 'sm', dot = false, class: klass = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    neutral: 'bg-surface-2 text-muted border-line',
    brand: 'bg-brand/10 text-brand border-brand/20',
    violet: 'bg-violet/10 text-violet border-violet/20',
    success: 'bg-success/10 text-success border-success/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };

  const dotColor: Record<Tone, string> = {
    neutral: 'bg-muted',
    brand: 'bg-brand',
    violet: 'bg-violet',
    success: 'bg-success',
    warn: 'bg-warn',
    danger: 'bg-danger',
  };

  const sizes: Record<Size, string> = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };
</script>

<span
  class="inline-flex items-center font-medium rounded-full border {tones[tone]} {sizes[
    size
  ]} {klass}"
>
  {#if dot}<span class="w-1.5 h-1.5 rounded-full {dotColor[tone]}"></span>{/if}
  {@render children()}
</span>
