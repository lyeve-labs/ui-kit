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

  /*
   * Each fill names the text it carries. Initials in ink on a translucent hue
   * took the color of whatever the avatar sat on, and seven of the eight read
   * under 4.5:1 in one theme or the other, down to 1.87:1. A solid hue holds
   * ink in both themes, and a quarter tint holds fg, so the five strong hues
   * went solid and the three soft ones went to a tint.
   */
  const hues = [
    'bg-violet text-ink',
    'bg-brand text-ink',
    'bg-success text-ink',
    'bg-warn text-ink',
    'bg-danger text-ink',
    'bg-violet/25 text-fg',
    'bg-brand/25 text-fg',
    'bg-success/25 text-fg',
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
    {s.wrap} {hue} {cls}"
  title={name}
  use:brokenImage={() => (imgError = true)}
>
  {#if src && !imgError}
    <img {src} alt={name} class="w-full h-full rounded-full object-cover" />
  {:else}
    <span class={s.text}>{initials}</span>
  {/if}
</span>
