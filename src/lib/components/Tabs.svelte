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
   * a second rule under the real one. The fades carry the same message, the
   * arrow keys reach every tab, and the active tab is scrolled into view when
   * it changes.
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
   * Only the strip's own offset moves. scrollIntoView moves every scroll box
   * above the tab, the page among them, so a strip below the fold pulled the
   * page down to it as soon as it mounted. A test DOM lays nothing out, so
   * every box is empty and nothing moves.
   */
  function reveal(tab: HTMLElement) {
    const el = scroller;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const at = tab.getBoundingClientRect();
    if (at.left < box.left) el.scrollLeft -= box.left - at.left;
    else if (at.right > box.right) el.scrollLeft += at.right - box.right;
  }

  function tabAt(index: number): HTMLElement | undefined {
    return scroller?.querySelectorAll<HTMLElement>('[role="tab"]')[index];
  }

  const activeIndex = $derived(items.findIndex((t) => t.id === active));

  $effect(() => {
    const tab = activeIndex === -1 ? undefined : tabAt(activeIndex);
    if (tab) reveal(tab);
  });

  /*
   * The strip is one stop in the tab order. A strip of five tabs cost five
   * presses of Tab to step over, and the arrows did nothing.
   *
   * Activation is manual: Left, Right, Home and End move focus and the stop
   * with it, and Enter, Space or a click chooses. A caller may navigate to
   * another page when a tab is chosen, and a strip that chose on every arrow
   * would then load a page per key press and take the reader off the strip.
   *
   * While focus is inside the strip the stop follows it, by key or by
   * pointer. When focus leaves, the stop goes back to the selected tab. A
   * selection matching no item would leave every tab at -1 and drop the
   * strip out of the tab order, so the first tab holds it then.
   */
  let roving: number | null = $state(null);
  const tabStop = $derived(roving ?? (activeIndex === -1 ? 0 : activeIndex));

  function moveTo(index: number) {
    const tab = tabAt(index);
    if (!tab) return;
    // The strip is in view when a key reaches it, and focus() would scroll
    // every box above the tab, the page among them.
    tab.focus({ preventScroll: true });
    reveal(tab);
  }

  function onTabKeydown(e: KeyboardEvent, index: number) {
    const last = items.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    // The arrows scroll the strip and the page, and Home and End jump the page.
    e.preventDefault();
    moveTo(next);
  }

  function onStripFocusOut(e: FocusEvent) {
    if (scroller && e.relatedTarget instanceof Node && scroller.contains(e.relatedTarget)) return;
    roving = null;
  }

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
    onfocusout={onStripFocusOut}
    role="tablist"
    data-testid="tabs-scroll"
    class="flex gap-0.5 overflow-x-auto border-b border-line [scrollbar-width:none]"
  >
    {#each items as tab, i (tab.id)}
      <button
        type="button"
        role="tab"
        data-tab={tab.id}
        aria-selected={active === tab.id}
        tabindex={i === tabStop ? 0 : -1}
        onclick={() => onchange(tab.id)}
        onfocus={() => (roving = i)}
        onkeydown={(e) => onTabKeydown(e, i)}
        class="{TAB}
          {active === tab.id
          ? 'text-fg after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t'
          : 'text-faint hover:text-fg'}"
      >
        {tab.label}
        {#if tab.count !== undefined}
          <!-- text-xs, not 10px: the count was the one text on a measured
               page under the 12px floor, and it is the one figure a tab
               carries. The active tint is the 10 percent every brand chip
               uses: at 40 percent it dragged the ground toward the text and
               the count read 3.28:1. -->
          <span
            class="ms-1.5 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1
              rounded-full text-xs font-semibold
              {active === tab.id ? 'bg-brand/10 text-brand' : 'bg-surface-2 text-faint'}"
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
