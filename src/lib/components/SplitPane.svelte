<script lang="ts">
  import {
    Lock,
    LockOpen,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
  } from '@lucide/svelte';
  import { untrack, type Snippet } from 'svelte';
  import Button from './Button.svelte';
  import SectionHeading from './SectionHeading.svelte';
  import { clampWidth, readAside, viewerStorage, writeAside } from '../internal/aside.js';

  /**
   * A column docked to one side of a page, with one width discipline for every
   * page that has one. Above the breakpoint its inner edge drags, a lock fixes
   * the width, the keyboard moves the edge, and the width and the lock are
   * remembered per viewer. A collapsible one folds to a strip carrying its
   * name. Below the breakpoint none of that applies: it stacks in the page's
   * own flow, hides, or becomes the overlay a toolbar opens, as the page
   * decides. The drag overlays the width while the pointer moves and writes
   * once on release.
   */
  type Breakpoint = 'md' | 'lg' | 'xl';

  interface Props {
    /** The localStorage key the width and lock are kept under. */
    storageKey: string;
    /** The word on the strip and the header. */
    label: string;
    /** Which edge of the page it docks to. The handle sits on the other edge. */
    side: 'start' | 'end';
    /** The width it opens at until somebody drags it. */
    width?: number;
    min?: number;
    max?: number;
    /** Where the desktop controls start. */
    breakpoint?: Breakpoint;
    /**
     * What it does under the breakpoint: stays in the page's flow across the
     * full width, disappears, or floats over the page while `overlay` is set.
     */
    below?: 'stack' | 'overlay' | 'hidden';
    /** Shown as an overlay below the breakpoint. Only read with `below="overlay"`. */
    overlay?: boolean;
    /** Offers a collapse to a strip. */
    collapsible?: boolean;
    /** Expanded above the breakpoint. Bindable so a page can open it from an offer. */
    open?: boolean;
    /** Keeps the header's count or status beside the label. */
    meta?: Snippet;
    /** Classes for the aside element itself, for the stacked layout's share of the height. */
    class?: string;
    testId?: string;
    children: Snippet;
  }

  let {
    storageKey,
    label,
    side,
    width: defaultWidth = 280,
    min = 200,
    max = 560,
    breakpoint = 'xl',
    below = 'stack',
    overlay = false,
    collapsible = false,
    open = $bindable(true),
    meta,
    class: klass = '',
    testId,
    children,
  }: Props = $props();

  // Tailwind reads class names from source, so each breakpoint spells its
  // variants out rather than building them from the prop. The dock entry hands
  // an overlay back to the page at the breakpoint, and nothing moves or
  // transitions there. It resets the offset with translate-none rather than a
  // zero offset, because any translate makes the aside the containing block
  // for a fixed popover inside it. The overlay's layer applies only under the
  // breakpoint: a docked pane is a flex item, and a stacking layer on it would
  // lift it, and every popover inside it, over the main column's popovers. The
  // room entry keeps the main column at least the pane's minimum wide, so a
  // width stored on a wider screen never pushes it off this one.
  type Variant =
    | 'dock'
    | 'w8'
    | 'flex'
    | 'block'
    | 'hidden'
    | 'width'
    | 'room'
    | 'noBorderB'
    | 'borderE'
    | 'borderS'
    | 'flexNone'
    | 'maxHNone';
  const AT: Record<Breakpoint, Record<Variant, string>> = {
    md: {
      dock: 'max-md:z-dropdown md:static md:visible md:translate-none md:opacity-100 md:transition-none',
      w8: 'md:w-8',
      flex: 'md:flex',
      block: 'md:block',
      hidden: 'md:hidden',
      width: 'md:w-(--panel-w)',
      room: 'md:max-w-[calc(100%_-_var(--panel-min))]',
      noBorderB: 'md:border-b-0',
      borderE: 'md:border-e',
      borderS: 'md:border-s',
      flexNone: 'md:flex-none',
      maxHNone: 'md:max-h-none',
    },
    lg: {
      dock: 'max-lg:z-dropdown lg:static lg:visible lg:translate-none lg:opacity-100 lg:transition-none',
      w8: 'lg:w-8',
      flex: 'lg:flex',
      block: 'lg:block',
      hidden: 'lg:hidden',
      width: 'lg:w-(--panel-w)',
      room: 'lg:max-w-[calc(100%_-_var(--panel-min))]',
      noBorderB: 'lg:border-b-0',
      borderE: 'lg:border-e',
      borderS: 'lg:border-s',
      flexNone: 'lg:flex-none',
      maxHNone: 'lg:max-h-none',
    },
    xl: {
      dock: 'max-xl:z-dropdown xl:static xl:visible xl:translate-none xl:opacity-100 xl:transition-none',
      w8: 'xl:w-8',
      flex: 'xl:flex',
      block: 'xl:block',
      hidden: 'xl:hidden',
      width: 'xl:w-(--panel-w)',
      room: 'xl:max-w-[calc(100%_-_var(--panel-min))]',
      noBorderB: 'xl:border-b-0',
      borderE: 'xl:border-e',
      borderS: 'xl:border-s',
      flexNone: 'xl:flex-none',
      maxHNone: 'xl:max-h-none',
    },
  };
  const at = $derived(AT[breakpoint]);
  const id = $derived(testId ?? `aside-${storageKey}`);

  // Each breakpoint as the stylesheet compiles it, in rem, so the script and
  // the variants above change over at the same width.
  const WIDE: Record<Breakpoint, string> = {
    md: '(min-width: 48rem)',
    lg: '(min-width: 64rem)',
    xl: '(min-width: 80rem)',
  };

  /**
   * Whether the page is under the breakpoint, once the browser has said. Only
   * an overlay asks, and only to set inert. Every other part of the overlay is
   * a class, and its breakpoint variant hands the docked column back. Inert is
   * an attribute, which no variant can scope, and the docked column has to take
   * focus and clicks whatever the overlay flag says. Until the browser answers,
   * invisible keeps a closed overlay out of focus and out of reach.
   */
  let narrow = $state(false);

  $effect(() => {
    if (below !== 'overlay' || typeof window.matchMedia !== 'function') return;
    const wide = window.matchMedia(WIDE[breakpoint]);
    const sync = () => {
      narrow = !wide.matches;
    };
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  });

  const bounds = $derived({ width: defaultWidth, min, max });

  // The key never changes for the life of the pane, so the read happens once,
  // at mount. The server has no storage, so it renders the default width.
  const initial = readAside(
    viewerStorage(),
    untrack(() => storageKey),
    untrack(() => bounds),
  );
  let width = $state(initial.width);
  let locked = $state(initial.locked);

  let aside: HTMLElement | undefined = $state();
  let drag = $state<{ startX: number; startWidth: number; grows: number } | null>(null);

  /**
   * Which way a pointer or an arrow moving right changes the width. The inner
   * edge is on the right of a start pane and on the left of an end pane, and a
   * right-to-left page swaps both, so the edge always follows the key the way
   * it looks.
   */
  function growsRight(): number {
    const rtl = aside ? getComputedStyle(aside).direction === 'rtl' : false;
    return (side === 'start' ? 1 : -1) * (rtl ? -1 : 1);
  }

  /**
   * The bounds as this screen allows them. The upper bound also leaves the
   * main column the pane's minimum, so the stylesheet's cap and the width the
   * handle reports agree. A parent with no measured width (before layout, or
   * in a test) leaves the bounds as given.
   */
  function room() {
    const total = aside?.parentElement?.clientWidth ?? 0;
    const upper = total > 0 ? Math.max(min, Math.min(max, total - min)) : max;
    return { min, max: upper };
  }

  /** The width on screen, which the room cap can hold below the stored one. */
  function shown(): number {
    const drawn = aside?.getBoundingClientRect().width ?? 0;
    return drawn > 0 ? Math.min(width, Math.round(drawn)) : width;
  }

  function remember() {
    writeAside(viewerStorage(), storageKey, bounds, { width, locked });
  }

  function startResize(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    drag = { startX: e.clientX, startWidth: shown(), grows: growsRight() };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function resizeMove(e: PointerEvent) {
    if (!drag) return;
    width = clampWidth(room(), drag.startWidth + (e.clientX - drag.startX) * drag.grows);
  }

  function endResize(e: PointerEvent) {
    if (!drag) return;
    drag = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    remember();
  }

  function resizeKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 80 : 24;
    const limits = room();
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = shown() + step * growsRight();
    else if (e.key === 'ArrowLeft') next = shown() - step * growsRight();
    else if (e.key === 'Home') next = limits.min;
    else if (e.key === 'End') next = limits.max;
    if (next === null) return;
    e.preventDefault();
    width = clampWidth(limits, next);
    remember();
  }

  function toggleLock() {
    locked = !locked;
    remember();
  }

  // The panel glyphs are drawn for a left-to-right page, so a right-to-left
  // one mirrors them with the rest of the layout.
  const Collapse = $derived(side === 'start' ? PanelLeftClose : PanelRightClose);
  const Expand = $derived(side === 'start' ? PanelLeftOpen : PanelRightOpen);

  /** The strip is the only thing a collapsed pane shows, and only above the breakpoint. */
  const folded = $derived(collapsible && !open);

  const edge = $derived(side === 'start' ? at.borderE : at.borderS);

  /**
   * The overlay's motion under the breakpoint. It is CSS because the overlay
   * stays mounted at every width, so what the reader typed in it survives a
   * close and a resize. Closed, it sits off its own edge, transparent and
   * invisible. It slides and fades in on the slow rung and out one rung
   * faster. Visibility is in the exit's list only. Leaving, the panel turns
   * invisible once the slide has finished. Arriving, it is visible at once, so
   * a field inside can take focus on the first frame.
   */
  const slide = $derived(
    overlay
      ? 'transition-[translate,opacity] duration-slow ease-enter'
      : `invisible opacity-0 ${side === 'start' ? '-translate-x-full rtl:translate-x-full' : 'translate-x-full rtl:-translate-x-full'} transition-[translate,opacity,visibility] duration-base ease-exit`,
  );

  const frame = $derived.by(() => {
    if (below === 'overlay') {
      // Floating under the breakpoint at the panel's own width. Only the
      // docked variant folds to the strip.
      return `absolute inset-y-0 w-(--panel-w) max-w-full shrink-0 border-line bg-surface ${slide} ${at.dock} ${folded ? at.w8 : at.room} ${side === 'start' ? 'start-0 border-e' : 'end-0 border-s'}`;
    }
    const shownBelow =
      below === 'hidden'
        ? `hidden ${at.flex}`
        : `flex border-b ${at.noBorderB} ${at.flexNone} ${at.maxHNone}`;
    return `${shownBelow} min-h-0 flex-col border-line bg-surface ${folded ? at.w8 : `${at.width} ${at.room}`} ${edge} ${klass}`;
  });
</script>

<aside
  bind:this={aside}
  class={frame}
  style="--panel-w:{width}px;--panel-min:{min}px"
  aria-label={label}
  data-testid={id}
  data-open={open}
  data-locked={locked}
  inert={below === 'overlay' && narrow && !overlay}
>
  {#if collapsible}
    <!-- The strip: the name read down the edge and the one control that brings the pane back. -->
    <div
      class="h-full flex-col items-center gap-2 py-1 {folded ? `hidden ${at.flex}` : 'hidden'}"
      data-testid="{id}-strip"
    >
      <Button
        variant="ghost"
        size="sm"
        aria-label="Expand {label}"
        aria-expanded={false}
        hint={false}
        onclick={() => (open = true)}
      >
        <Expand size={14} class="rtl:-scale-x-100" />
      </Button>
      <span
        class="text-xs font-medium tracking-wide text-faint uppercase [writing-mode:vertical-rl]"
        >{label}</span
      >
    </div>
  {/if}

  <div class="relative flex h-full min-h-0 flex-1 flex-col {folded ? at.hidden : ''}">
    <div
      class="flex h-control shrink-0 items-center justify-between border-b border-line ps-3 pe-1"
    >
      <SectionHeading level={2} variant="eyebrow" actions={meta}>{label}</SectionHeading>
      <div class="hidden items-center {at.flex}">
        <Button
          variant="ghost"
          size="sm"
          aria-label={locked ? `Unlock ${label} width` : `Lock ${label} width`}
          aria-pressed={locked}
          hint={false}
          onclick={toggleLock}
        >
          {#if locked}<Lock size={14} />{:else}<LockOpen size={14} />{/if}
        </Button>
        {#if collapsible}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Collapse {label}"
            aria-expanded={true}
            hint={false}
            onclick={() => (open = false)}
          >
            <Collapse size={14} class="rtl:-scale-x-100" />
          </Button>
        {/if}
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      {@render children()}
    </div>
    {#if !locked}
      <!-- A separator that takes focus is the pattern for a splitter, and the
           a11y rules read every separator as static. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="absolute inset-y-0 hidden w-2 cursor-col-resize hover:bg-brand/40 focus-visible:bg-brand/40 {at.block} {side ===
        'start'
          ? '-end-1'
          : '-start-1'} {drag ? 'bg-brand/40' : ''}"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize {label}"
        aria-valuenow={width}
        aria-valuemin={min}
        aria-valuemax={max}
        tabindex="0"
        data-testid="{id}-handle"
        onpointerdown={startResize}
        onpointermove={resizeMove}
        onpointerup={endResize}
        onpointercancel={endResize}
        onkeydown={resizeKey}
      ></div>
    {/if}
  </div>
</aside>
