<script lang="ts">
  /**
   * The page frame: the gutter, the content cap, the centering and the section
   * rhythm, all owned by the shell so a page cannot pick its own.
   *
   * Nothing in the library owned the frame, so every page built one. Across one
   * app 31 of 35 pages restate the gutter in four spellings, five content caps
   * are in use with no rule for choosing between them, and one page renders
   * against the left edge of the window because it set a cap and forgot
   * `mx-auto`. Centering and `w-full` come with the gutter here, in PAGE_PAD, so
   * there is no order of props that leaves them out.
   *
   * The shell renders no landmark of its own. An app shell already owns `main`,
   * `nav` and the rest, and a second `main` changes what a landmark query
   * matches for every assistive technology reading the page.
   *
   * The browser tab follows the page title once the app states a format with
   * setDocumentTitleFormat. Until it does, the shell renders no title element,
   * so a page that renders its own keeps it.
   */
  import type { Snippet } from 'svelte';
  import { ArrowLeft } from '@lucide/svelte';
  import { getDocumentTitleFormat } from '../internal/document-title.js';
  import { safeHref } from '../internal/href.js';
  import { PAGE_PAD, PAGE_STACK, PAGE_WIDTH, type PageWidth } from '../internal/layout.js';
  import { HIT_AREA } from '../internal/touch.js';
  import PageHeader from './PageHeader.svelte';

  interface Props {
    /**
     * The page's only h1, rendered through PageHeader. Also the browser tab's
     * title, once the app states a format.
     */
    title: string;
    /**
     * What the browser tab shows when it should read differently from
     * `title`, such as a record's name on a page whose heading says what is
     * done to it. Read only once the app states a format with
     * setDocumentTitleFormat.
     */
    documentTitle?: string;
    description?: string;
    /** The content cap: `narrow`, `default`, `wide` or `full`, resolved to 896, 1152, 1536 or no cap. */
    width?: PageWidth;
    /**
     * A full-height page that manages its own scrolling, for instance a split
     * pane or a canvas. The content loses the gutter and the cap so the pane
     * can reach the edges. The title row keeps both.
     */
    fill?: boolean;
    /**
     * Drop the title to body size and hide the description, for a page with
     * genuinely no room for a heading. `fill` does not imply it.
     */
    compact?: boolean;
    /**
     * A link back to the page this one sits under, rendered above the title
     * with an arrow and the parent's label ("Flows", "Settings"). It is a plain
     * anchor, so the keyboard needs nothing extra.
     */
    back?: { href: string; label: string };
    /**
     * Keep the h1 for assistive technology and render no title row at all: no
     * back link, no breadcrumb, no description, no actions.
     *
     * For a page whose toolbar is its header. The h1 is `sr-only`, not absent,
     * so a heading query and a screen reader still find it. A page that hides
     * the row takes on the way back: `back` renders nothing here.
     */
    titleHidden?: boolean;
    /** Rendered above the title at one fixed distance, after `back` when both are set. */
    breadcrumb?: Snippet;
    /** Right-aligned controls in the title row. */
    actions?: Snippet;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    documentTitle = undefined,
    description = undefined,
    width = 'default',
    fill = false,
    compact = false,
    back = undefined,
    titleHidden = false,
    breadcrumb,
    actions,
    class: klass = '',
    children,
  }: Props = $props();

  const format = getDocumentTitleFormat();

  /** The tab's words, or nothing at all while the app has stated no format. */
  const tabTitle = $derived(format === undefined ? undefined : format(documentTitle ?? title));

  /**
   * A fill page owns the viewport instead of sitting in it: the content takes
   * no cap and reaches the edges, and the height the title row leaves goes to
   * it, so a split pane scrolls inside the page rather than scrolling the page.
   * Two pages carry a documented waiver against their app's own layout lint for
   * exactly this shape, which is the argument for the shell supporting it.
   *
   * `min-h-0` is load bearing on the column: a flex item refuses to shrink
   * below its content by default, so without it the pane runs past the bottom
   * of the window and takes its own scrollbar out of reach.
   *
   * `relative overflow-clip` keeps the shell's region from scrolling at all.
   * A visually hidden label in a pane that scrolls but is not positioned
   * takes the nearest positioned ancestor as its containing block, so the
   * pane neither clips nor scrolls it, and its box lengthened the region:
   * a schema editor's field labels gave the region 83px to scroll, and a
   * wheel at the end of the editor slid the toolbar under the header. The
   * frame now holds such a box and clips it, and clip, unlike hidden, leaves
   * nothing a script can scroll.
   */
  const frame = $derived(
    fill
      ? 'relative flex h-full min-h-0 w-full flex-col gap-4 overflow-clip'
      : `${PAGE_PAD} ${PAGE_WIDTH[width]} ${PAGE_STACK}`,
  );

  /**
   * The gutter the title row keeps when the content gives it up.
   *
   * The frame supplies it on an ordinary page, so only a fill page states it
   * here, and it composes from the same tokens rather than a second spelling:
   * a fill page's title lines up with every other page's to the pixel. Only
   * the top edge is padded, because the frame's own gap owns the distance down
   * to the content.
   */
  const headerPad = $derived(fill ? 'px-page-x pt-page-y' : '');

  /** The content stack. On a fill page it also takes the leftover height. */
  const content = $derived(fill ? `${PAGE_STACK} min-h-0 flex-1` : PAGE_STACK);

  /**
   * The same rest, hover and focus treatment as a Breadcrumb link, so the two
   * read as one row. The ring replaces the global outline rather than adding
   * to it, and the padding gives the ring a shape to sit on: on bare text the
   * ring hugs the glyphs and clips the descenders.
   */
  const BACK =
    `${HIT_AREA} -ms-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-muted ` +
    'outline-none transition-colors hover:text-fg ' +
    'focus-visible:ring-2 focus-visible:ring-brand';
</script>

<svelte:head>
  {#if tabTitle !== undefined}
    <title>{tabTitle}</title>
  {/if}
</svelte:head>

<div class="{frame} {klass}">
  {#if titleHidden}
    <h1 data-testid="page-title" class="sr-only">{title}</h1>
  {:else}
    <!-- The breadcrumb and the title are one group, so the distance between them
       is fixed here and does not change with whether a description is set. -->
    <div class="flex flex-col gap-2 {headerPad}">
      <!-- The back link leads and the breadcrumb follows on one row, so a page
         that has both does not stack two lines of navigation over its title. -->
      {#if back || breadcrumb}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          {#if back}
            <a href={safeHref(back.href)} data-testid="page-back" class={BACK}>
              <ArrowLeft size={14} aria-hidden="true" class="shrink-0 rtl:rotate-180" />
              {back.label}
            </a>
          {/if}
          {#if breadcrumb}{@render breadcrumb()}{/if}
        </div>
      {/if}
      <!-- flush: the shell's own section stack supplies the gap below the title,
         so the header must not add a second one. -->
      <PageHeader {title} {description} {actions} {compact} flush />
    </div>
  {/if}

  <div class={content}>
    {@render children()}
  </div>
</div>
