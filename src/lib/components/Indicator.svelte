<script lang="ts">
  import type { AccentTone } from '../internal/tone.js';
  type Size = 'xs' | 'sm' | 'md' | 'lg';

  interface Props {
    tone?: AccentTone;
    pulse?: boolean;
    size?: Size;
    class?: string;
  }

  let { tone = 'success', pulse = false, size = 'sm', class: cls = '' }: Props = $props();

  const tones: Record<AccentTone, string> = {
    brand: 'bg-brand',
    success: 'bg-success',
    warn: 'bg-warn',
    danger: 'bg-danger',
    neutral: 'bg-muted',
    violet: 'bg-violet',
  };

  const sizes: Record<Size, string> = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };
</script>

<span class="relative inline-flex {cls}" aria-hidden="true">
  {#if pulse}
    <span
      class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 {tones[tone]}"
    ></span>
  {/if}
  <span class="relative inline-flex rounded-full {sizes[size]} {tones[tone]}"></span>
</span>
