<script lang="ts">
  import { brokenImage } from '../utils/broken-image.js';

  let {
    name,
    src,
    size = 'md',
    class: cls = '',
  }: {
    name: string;
    src?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  } = $props();

  const sizes: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { wrap: string; text: string }> = {
    xs: { wrap: 'w-6 h-6', text: 'text-[9px]' },
    sm: { wrap: 'w-7 h-7', text: 'text-[10px]' },
    md: { wrap: 'w-8 h-8', text: 'text-xs' },
    lg: { wrap: 'w-10 h-10', text: 'text-sm' },
    xl: { wrap: 'w-14 h-14', text: 'text-base' },
  };

  const hues = [
    'bg-violet/80',
    'bg-brand/60',
    'bg-success/70',
    'bg-warn/60',
    'bg-danger/60',
    'bg-violet/50',
    'bg-brand/40',
    'bg-success/50',
  ];

  let imgError = $state(false);

  let initials = $derived(
    (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join(''),
  );

  let hue = $derived(hues[(name.charCodeAt(0) || 0) % hues.length]);
  let s = $derived(sizes[size]);
</script>

<span
  class="inline-flex items-center justify-center rounded-full font-semibold shrink-0
    {s.wrap} {hue} text-ink {cls}"
  title={name}
  use:brokenImage={() => (imgError = true)}
>
  {#if src && !imgError}
    <img {src} alt={name} class="w-full h-full rounded-full object-cover" />
  {:else}
    <span class={s.text}>{initials}</span>
  {/if}
</span>
