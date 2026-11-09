<script lang="ts" module>
  /** The shapes an image without a known size reserves its box at. */
  export type ImageRatio = '1/1' | '4/3' | '3/2' | '16/9';
</script>

<script lang="ts">
  /**
   * An image whose box is reserved before its bytes arrive, so the text under
   * it never moves. With its own width and height the browser works the box
   * out from them, and without them the image is cropped to `ratio`.
   *
   * Every attribute on the `img` is written out by name. A spread or an event
   * handler on it makes the server render add `onload` and `onerror`
   * attributes, which a page's content security policy refuses.
   */
  interface Props {
    src: string;
    /** What the image shows. An empty string marks it decorative. */
    alt: string;
    /** The image's own size in pixels. Both, or the ratio reserves the box. */
    width?: number;
    height?: number;
    /** The box an image of unknown size is cropped to. */
    ratio?: ImageRatio;
    /** Drawn under the image, which then sits in a figure. */
    caption?: string;
    /** `eager` for an image a reader sees before scrolling. */
    loading?: 'lazy' | 'eager';
    class?: string;
  }

  let {
    src,
    alt,
    width = undefined,
    height = undefined,
    ratio = '16/9',
    caption = undefined,
    loading = 'lazy',
    class: klass = '',
  }: Props = $props();

  const RATIO: Record<ImageRatio, string> = {
    '1/1': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    '16/9': 'aspect-video',
  };

  const sized = $derived(width !== undefined && height !== undefined);
  const imgClass = $derived(
    sized
      ? 'block h-auto max-w-full rounded-md'
      : `block w-full rounded-md object-cover ${RATIO[ratio]}`,
  );
</script>

{#if caption}
  <figure class="m-0 {klass}">
    <img class={imgClass} {src} {alt} {width} {height} {loading} decoding="async" />
    <figcaption class="mt-site-xs text-sm text-muted">{caption}</figcaption>
  </figure>
{:else}
  <img class="{imgClass} {klass}" {src} {alt} {width} {height} {loading} decoding="async" />
{/if}
