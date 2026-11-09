<script lang="ts" module>
  /** An image in a gallery, cropped to 4:3 so the tiles line up. */
  export interface GalleryImage {
    src: string;
    /** What the image shows. An empty string marks it decorative. */
    alt: string;
    caption?: string;
  }
</script>

<script lang="ts">
  /**
   * Images in a grid, or in a row that scrolls sideways and stops on each
   * one, with no script. The grid fits as many tiles as the site's minimum
   * column width allows. The row is a scrolling region, so it takes keyboard
   * focus and a name, and a reader moves it with the arrow keys.
   */
  import Image from './Image.svelte';

  interface Props {
    images: GalleryImage[];
    layout?: 'grid' | 'row';
    /** The row's name for a screen reader. */
    label?: string;
    class?: string;
  }

  let { images, layout = 'grid', label = 'Gallery', class: klass = '' }: Props = $props();

  const LAYOUT = {
    grid: 'grid gap-gutter grid-cols-[repeat(auto-fill,minmax(min(100%,var(--spacing-column-min)),1fr))]',
    row: 'relative flex snap-x snap-mandatory gap-gutter overflow-x-auto overscroll-x-contain pb-site-sm',
  } as const;
</script>

<!-- A list without its markers loses the list role in WebKit, and with it
     the row's name, so the role is stated. -->
{#if images.length > 0}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_redundant_roles -->
  <ul
    role="list"
    class="m-0 list-none p-0 {LAYOUT[layout]} {klass}"
    tabindex={layout === 'row' ? 0 : undefined}
    aria-label={layout === 'row' ? label : undefined}
  >
    {#each images as image, i (i)}
      <li class={layout === 'row' ? 'shrink-0 basis-[min(80%,22rem)] snap-start' : 'min-w-0'}>
        <Image src={image.src} alt={image.alt} caption={image.caption} ratio="4/3" />
      </li>
    {/each}
  </ul>
{/if}
