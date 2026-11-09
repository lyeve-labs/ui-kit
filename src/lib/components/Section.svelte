<script lang="ts">
  /**
   * A band of a page: an optional introduction, the content and an optional
   * footer, padded on the site spacing scale.
   *
   * A background image fills the band behind the content. An overlay between
   * the two keeps the words readable whatever the image shows: the band names
   * the overlay's scheme in `data-scheme`, so everything inside draws in that
   * palette, and the overlay is that palette's page color at 85%. Over a white
   * image under the dark overlay, or a black one under the light, body text,
   * muted text and links clear 4.5:1. Faint and status colors are not held to
   * that floor here.
   *
   * The layers stack by source order rather than by z-index: the image, the
   * overlay, then the content, each positioned.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    /** The band's name for a screen reader, which makes it a region. */
    label?: string;
    /** Drawn behind the content and cropped to the band. */
    image?: { src: string; alt?: string };
    overlay?: 'none' | 'light' | 'dark';
    /** `tall` is 60% of the window and `screen` all of it, content centered. */
    height?: 'auto' | 'tall' | 'screen';
    intro?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    label = undefined,
    image = undefined,
    overlay = 'none',
    height = 'auto',
    intro,
    footer,
    children,
    class: klass = '',
  }: Props = $props();

  const HEIGHT = {
    auto: '',
    tall: 'min-h-band-tall justify-center',
    screen: 'min-h-svh justify-center',
  } as const;

  const layered = $derived(image !== undefined || overlay !== 'none');
</script>

<section
  aria-label={label}
  data-scheme={overlay === 'none' ? undefined : overlay}
  class="relative isolate flex flex-col gap-site-md px-site-lg py-site-xl {HEIGHT[height]} {layered
    ? 'overflow-hidden rounded-md'
    : ''} {klass}"
>
  {#if image}
    <img
      class="absolute inset-0 size-full object-cover"
      src={image.src}
      alt={image.alt ?? ''}
      decoding="async"
    />
  {/if}
  {#if overlay !== 'none'}
    <div class="absolute inset-0 bg-ink/85" aria-hidden="true"></div>
  {/if}
  {#if intro}
    <header class="relative">{@render intro()}</header>
  {/if}
  {#if children}
    <div class="relative">{@render children()}</div>
  {/if}
  {#if footer}
    <footer class="relative">{@render footer()}</footer>
  {/if}
</section>
