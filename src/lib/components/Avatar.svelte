<script lang="ts">
  import { brokenImage } from '../utils/broken-image.js';
  import { AVATAR_SIZE } from '../internal/avatar.js';

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
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join(''),
  );

  let hue = $derived(hues[(name.charCodeAt(0) || 0) % hues.length]);
  let s = $derived(AVATAR_SIZE[size]);
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
