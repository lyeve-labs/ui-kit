<script lang="ts">
  import {
    SCROLL_EDGE,
    SCROLL_EDGE_END,
    SCROLL_EDGE_START,
    scrollEdges,
  } from '../internal/scroll-edges.js';
  import { TOUCH_GROW } from '../internal/touch.js';

  let {
    items,
    active,
    class: cls = '',
    onchange,
  }: {
    items: { id: string; label: string; count?: number }[];
    active: string;
    class?: string;
    onchange: (id: string) => void;
  } = $props();

  /*
   * The strip scrolls sideways when the tabs do not fit, and says so.
   *
   * It neither wrapped nor scrolled: five tabs are 480px, and at 400px the
   * fifth was past the edge with nothing on screen to say a fifth existed.
   * Wrapping was the workaround, and a wrapped strip breaks the one line the
   * underline runs along. A tab never breaks inside its own label.
   *
   * The scrollbar is not drawn. A strip of tabs with a bar under it reads as
   * a second rule under the real one; the fades carry the same message, the
   * tabs are buttons so the keyboard reaches every one, and the active tab
   * is scrolled into view when it changes.
   */
  let scroller: HTMLElement | undefined = $state();
  let moreBefore = $state(false);
  let moreAfter = $state(false);

  function measure() {
    const el = scroller;
    if (!el) return;
    const edges = scrollEdges(el);
    moreBefore = edges.before;
    moreAfter = edges.after;
  }

  $effect(() => {
    const el = scroller;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  });

  /*
   * The tab for the active id is brought into view when the id changes, so a
   * page that opens on its fifth tab does not open on a strip that hides it.
   * `nearest` on both axes moves the strip and nothing else; a test DOM has
   * no layout and no scrollIntoView, and neither is an error here.
   */
  $effect(() => {
    const el = scroller;
    const id = active;
    if (!el) return;
    const tab = [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find(
      (t) => t.dataset.tab === id,
    );
    if (tab && typeof tab.scrollIntoView === 'function') {
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });

  /*
   * The focus ring is inset: the tabs sit in a box that clips to scroll, and
   * the global outline sits 2px outside its element, so on the strip's top
   * edge it was cut off. min-h-control under a finger is the same height the
   * buttons and fields beside the strip take there.
   */
  const TAB =
    `${TOUCH_GROW} relative shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap ` +
    'transition-colors outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';
</script>

<div class="relative {cls}">
  <div
    bind:this={scroller}
    onscroll={measure}
    role="tablist"
    data-testid="tabs-scroll"
    class="flex gap-0.5 overflow-x-auto border-b border-line [scrollbar-width:none]"
  >
    {#each items as tab (tab.id)}
      <button
        type="button"
        role="tab"
        data-tab={tab.id}
        aria-selected={active === tab.id}
        onclick={() => onchange(tab.id)}
        class="{TAB}
          {active === tab.id
          ? 'text-fg after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t'
          : 'text-faint hover:text-fg'}"
      >
        {tab.label}
        {#if tab.count !== undefined}
          <!-- text-xs, not 10px: the count was the one text on a measured
               page under the 12px floor, and it is the one figure a tab
               carries. -->
          <span
            class="ms-1.5 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1
              rounded-full text-xs font-semibold
              {active === tab.id ? 'bg-brand/40 text-brand' : 'bg-surface-2 text-faint'}"
          >
            {tab.count}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Outside the scroll box and out of the accessibility tree: a picture of
       the scrollbar the phone will not draw, saying nothing the tablist has
       not already said. -->
  {#if moreBefore}
    <div
      aria-hidden="true"
      data-print="hide"
      data-testid="tabs-more-before"
      class="{SCROLL_EDGE} {SCROLL_EDGE_START}"
    ></div>
  {/if}
  {#if moreAfter}
    <div
      aria-hidden="true"
      data-print="hide"
      data-testid="tabs-more-after"
      class="{SCROLL_EDGE} {SCROLL_EDGE_END}"
    ></div>
  {/if}
</div>
