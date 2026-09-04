<script lang="ts">
  /**
   * The page frame: the gutter, the content cap, the centring and the section
   * rhythm, all owned by the shell so a page cannot pick its own.
   *
   * Nothing in the library owned the frame, so every page built one. Across one
   * app 31 of 35 pages restate the gutter in four spellings, five content caps
   * are in use with no rule for choosing between them, and one page renders
   * against the left edge of the window because it set a cap and forgot
   * `mx-auto`. Centring and `w-full` come with the gutter here, in PAGE_PAD, so
   * there is no order of props that leaves them out.
   *
   * The shell renders no landmark of its own. An app shell already owns `main`,
   * `nav` and the rest, and a second `main` changes what a landmark query
   * matches for every assistive technology reading the page.
   */
  import type { Snippet } from 'svelte';
  import { PAGE_PAD, PAGE_STACK, PAGE_WIDTH, type PageWidth } from '../internal/layout.js';
  import PageHeader from './PageHeader.svelte';

  interface Props {
    /** The page's only h1, rendered through PageHeader. */
    title: string;
    description?: string;
    /** Content cap. narrow, default, wide, full. */
    width?: PageWidth;
    /**
     * A full-height page that manages its own scrolling, for instance a split
     * pane or a canvas. No gutter, no cap, and the title renders compact.
     */
    fill?: boolean;
    /** Rendered above the title at one fixed distance. */
    breadcrumb?: Snippet;
    /** Right-aligned controls in the title row. */
    actions?: Snippet;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    description = undefined,
    width = 'default',
    fill = false,
    breadcrumb,
    actions,
    class: klass = '',
    children,
  }: Props = $props();

  /**
   * A fill page owns the viewport instead of sitting in it: no gutter, no cap,
   * and the height the title row leaves goes to the content, so a split pane
   * scrolls inside the page rather than scrolling the page. Two pages carry a
   * documented waiver against their app's own layout lint for exactly this
   * shape, which is the argument for the shell supporting it.
   *
   * `min-h-0` is load bearing on the column: a flex item refuses to shrink
   * below its content by default, so without it the pane runs past the bottom
   * of the window and takes its own scrollbar out of reach.
   */
  const frame = $derived(
    fill
      ? 'flex h-full min-h-0 w-full flex-col gap-4'
      : `${PAGE_PAD} ${PAGE_WIDTH[width]} ${PAGE_STACK}`,
  );

  /** The content stack. On a fill page it also takes the leftover height. */
  const content = $derived(fill ? `${PAGE_STACK} min-h-0 flex-1` : PAGE_STACK);
</script>

<div class="{frame} {klass}">
  <!-- The breadcrumb and the title are one group, so the distance between them
       is fixed here and does not change with whether a description is set. -->
  <div class="flex flex-col gap-2">
    {#if breadcrumb}{@render breadcrumb()}{/if}
    <!-- flush: the shell's own section stack supplies the gap below the title,
         so the header must not add a second one. -->
    <PageHeader {title} {description} {actions} compact={fill} flush />
  </div>

  <div class={content}>
    {@render children()}
  </div>
</div>
