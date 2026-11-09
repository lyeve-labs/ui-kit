<script lang="ts" module>
  /**
   * What the sidebar snippets are told about their column. `rail` is true
   * while the sidebar is the 56px icon rail, so a SidebarNav takes it as
   * `collapsed`, a brand row renders its mark without the wordmark, and a
   * footer band renders what fits. A snippet that ignores the argument still
   * renders. It is simply drawn at 56px and clipped.
   */
  export interface SidebarState {
    rail: boolean;
  }

  /**
   * How long a pointer has to rest over the rail before it opens. This waits
   * for the reader, not for an animation. A pointer crossing the 56px rail on
   * its way to the page is still moving and never rests there, so the column
   * does not open over the control it is heading for. One that stops on the
   * rail means to read it.
   */
  export const RAIL_REST_MS = 100;
</script>

<script lang="ts">
  /**
   * The authed application frame: the sidebar, the header bar and the content
   * column, owned once so three apps cannot each invent their own.
   *
   * They did. The admin, the customer portal and the third console each hand
   * rolled this shell, and no two agreed: the sidebar was 224px in one and
   * 240px in the other two, opaque in two and 30% translucent in the third,
   * built from the kit's SidebarNav in one and from inline anchors in the
   * others. Two of the three had no header at all above md:, so the current
   * page had no name on screen and the account block sat in the bottom left
   * corner of the sidebar in one shape and in a header dropdown in another.
   * Every one of those was a defensible local choice and together they read as
   * three products.
   *
   * The frame renders `main` and the drawer's dialog role. It renders no `nav`
   * and no heading: the nav comes from the caller's SidebarNav, which is the
   * only navigation landmark in the page, and the page's own PageShell owns the
   * one `h1`. The section name here is a span for that reason: a second `h1`
   * in the header makes a heading query answer with two elements and a screen
   * reader announce the page name twice.
   */
  import { untrack, type Snippet } from 'svelte';
  import { Menu, PanelLeft, PanelLeftClose } from '@lucide/svelte';
  import OverlayHeader from '../internal/OverlayHeader.svelte';
  import {
    clampWidth,
    growsRight,
    keyedWidth,
    readAside,
    viewerStorage,
    writeAside,
  } from '../internal/aside.js';
  import { overlay } from '../internal/overlay.js';
  import * as motion from '../motion.js';
  import {
    APP_BRAND,
    APP_HEADER,
    APP_SIDEBAR,
    APP_SIDEBAR_BAND,
    APP_SIDEBAR_EDGE,
    APP_SIDEBAR_RAIL,
    APP_SIDEBAR_WIDE,
  } from '../internal/layout.js';

  interface Props {
    /** The current section, shown in the header. Not a heading: the page owns its h1. */
    section?: string;
    /** Bindable so the app router can close the drawer after a navigation. */
    navOpen?: boolean;
    /** Offers a control that puts the sidebar away above md:. */
    collapsible?: boolean;
    /**
     * Whether the sidebar is put away. Desktop only: below md: the sidebar is
     * already a drawer and `navOpen` is the state that governs it.
     *
     * Bindable and not held here, because where it is remembered is the app's
     * decision. Nothing persists it for you.
     */
    collapsed?: boolean;
    /**
     * Whether the header bar is put away, above md: only. Below md: the header
     * carries the hamburger, which is the only way into the drawer, so the bar
     * stays whatever this says.
     *
     * For a page that owns the viewport and wants all of it: a canvas in a
     * focus mode. The page asking for it must keep a way back on screen, since
     * the shell's own controls go with the bar. Bindable for the same reason
     * `collapsed` is: where it is remembered is the app's decision.
     */
    headerHidden?: boolean;
    /**
     * Narrows the sidebar to the icon rail at every width above md:. The rail
     * is automatic between md: and lg: either way. The labels still come back
     * under a pointer or the keyboard, and below md: the sidebar is the drawer
     * whatever this says.
     */
    rail?: boolean;
    /** The sidebar landmark's accessible name. */
    sidebarLabel?: string;
    /** The drawer's accessible name, below md: where the sidebar is a dialog. */
    drawerLabel?: string;
    /** The product mark, in the sidebar's brand row. Told whether the column is the rail. */
    brand?: Snippet<[SidebarState]>;
    /**
     * The navigation itself. A SidebarNav, given `class="min-h-0 flex-1"` and
     * `collapsed={rail}` from the argument, so the rail shows icons and the
     * labels return when the rail opens.
     */
    nav?: Snippet<[SidebarState]>;
    /** A status band at the foot of the sidebar. Not the account: that is header work. */
    sidebarFooter?: Snippet<[SidebarState]>;
    /** The right end of the header bar. The theme toggle and the account menu live here. */
    headerActions?: Snippet;
    /**
     * A panel on the right of the main area, such as an assistant. From lg: up
     * it docks as a column and the main area narrows beside it. Below lg: it
     * opens as a modal drawer. It is one element at every width, so whatever
     * it holds stays mounted when the window crosses lg:. It renders nothing
     * until it first opens. The shell adds no button for it: put one in
     * `headerActions` and bind `panelOpen`.
     */
    panel?: Snippet;
    /** Bindable. Whether the panel is open. */
    panelOpen?: boolean;
    /** The panel's accessible name, as a complementary region and as the drawer's title. */
    panelLabel?: string;
    /**
     * The localStorage key the panel's width is kept under, per viewer. Without
     * one the width lasts the page.
     */
    panelStorageKey?: string;
    class?: string;
    children: Snippet;
  }

  let {
    section = undefined,
    navOpen = $bindable(false),
    collapsible = false,
    collapsed = $bindable(false),
    headerHidden = $bindable(false),
    rail = false,
    sidebarLabel = 'Sidebar',
    drawerLabel = 'Navigation',
    brand,
    nav,
    sidebarFooter,
    headerActions,
    panel,
    panelOpen = $bindable(false),
    panelLabel = 'Panel',
    panelStorageKey = undefined,
    class: klass = '',
    children,
  }: Props = $props();

  /**
   * Desktop until the browser says otherwise. The server cannot know the
   * viewport, and a sidebar rendered inert on the server is unreachable to
   * anyone whose JavaScript never arrives.
   */
  let isMobile = $state(false);
  /** md: to lg:, where the expanded column costs the page more than it gives. */
  let isNarrow = $state(false);
  /** lg: and up, where the panel docks beside the main area instead of opening as a drawer. */
  let isWide = $state(true);
  const drawerOpen = $derived(isMobile && navOpen);

  /** The panel's width: 400 until somebody drags it, and never under 320 or over 560. */
  const PANEL = { width: 400, min: 320, max: 560 };
  /** What the docked panel always leaves the main area, so the page stays readable beside it. */
  const MAIN_MIN = 480;
  // The key never changes for the life of the shell, so the read happens once.
  // The server has no storage, so it renders the default width.
  let panelWidth = $state(
    untrack(() =>
      panelStorageKey ? readAside(viewerStorage(), panelStorageKey, PANEL).width : PANEL.width,
    ),
  );
  let panelEl = $state<HTMLElement | undefined>();
  let panelRow = $state<HTMLDivElement | undefined>();
  let panelDrag = $state<{ startX: number; startWidth: number; grows: number } | null>(null);
  const shellUid = $props.id();
  const panelHeadingId = `${shellUid}-panel`;

  // Mounted from its first opening on, and never on a server render of a
  // closed panel: a phone would otherwise build the docked form and then
  // move it into the drawer.
  let panelMounted = $state(untrack(() => panelOpen));
  $effect(() => {
    if (panelOpen) panelMounted = true;
  });
  const panelModal = $derived(panelOpen && !isWide);

  /** The widest the panel may be in the row it shares with main, as SplitPane's room does. */
  function panelRoom() {
    const total = panelRow?.clientWidth ?? 0;
    const upper =
      total > 0 ? Math.max(PANEL.min, Math.min(PANEL.max, total - MAIN_MIN)) : PANEL.max;
    return { min: PANEL.min, max: upper };
  }

  // Kept current as the window resizes, so the separator announces the width
  // drawn and a maximum the keys can reach. The server has no layout.
  let panelMax = $state(PANEL.max);
  $effect(() => {
    const row = panelRow;
    const sync = () => {
      panelMax = panelRoom().max;
    };
    sync();
    if (!row || typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(sync);
    watch.observe(row);
    return () => watch.disconnect();
  });
  /** The width drawn, which the room can hold below the remembered one. */
  const panelShown = $derived(Math.min(panelWidth, panelMax));

  /** The overlay behavior below lg: only: focus moves in, Tab stays inside, the page is locked. */
  function modalWhen(node: HTMLElement, active: boolean) {
    let handle = active ? overlay(node) : undefined;
    return {
      update(next: boolean) {
        if (next && !handle) handle = overlay(node);
        else if (!next && handle) {
          handle.destroy();
          handle = undefined;
        }
      },
      destroy() {
        handle?.destroy();
      },
    };
  }

  function rememberPanel() {
    if (panelStorageKey)
      writeAside(viewerStorage(), panelStorageKey, PANEL, { width: panelWidth, locked: false });
  }

  function startPanelResize(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    panelDrag = { startX: e.clientX, startWidth: panelShown, grows: growsRight(panelEl, 'end') };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function panelResizeMove(e: PointerEvent) {
    if (!panelDrag) return;
    panelWidth = clampWidth(
      panelRoom(),
      panelDrag.startWidth + (e.clientX - panelDrag.startX) * panelDrag.grows,
    );
  }

  function endPanelResize(e: PointerEvent) {
    if (!panelDrag) return;
    panelDrag = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    rememberPanel();
  }

  function panelResizeKey(e: KeyboardEvent) {
    const next = keyedWidth(e, panelShown, growsRight(panelEl, 'end'), panelRoom());
    if (next === null) return;
    e.preventDefault();
    panelWidth = next;
    rememberPanel();
  }

  let shellEl = $state<HTMLDivElement | undefined>();

  /**
   * The edge the phone drawer slides from. It is docked at the start edge,
   * which a right-to-left page puts on the right, and a slide from the left
   * would cross the whole screen to get there. Read when the drawer moves,
   * so a page that changes direction is followed.
   */
  function startSide(): 'left' | 'right' {
    return shellEl !== undefined && getComputedStyle(shellEl).direction === 'rtl'
      ? 'right'
      : 'left';
  }
  /**
   * Collapsing is a desktop gesture. Below md: the same aside is the drawer,
   * so honoring `collapsed` there would leave the hamburger opening nothing.
   */
  const railHidden = $derived(collapsible && collapsed && !isMobile);
  /** Same rule for the header: a desktop gesture, and the drawer's button stays. */
  const barHidden = $derived(headerHidden && !isMobile);

  /**
   * The rail: the icon column, and the labels on demand.
   *
   * While the sidebar is the rail it is 56px wide and the nav is told so. A
   * pointer at rest over it, or focus inside it, opens it to the full column
   * over the page rather than beside it, so the page keeps its width and the
   * reader still gets every label. It closes when the pointer or the focus
   * leaves. A pointer that only passes over it leaves it the rail: the open
   * column covers the start of the page, and opening under a pointer bound
   * for a control there held the column open over that control.
   * State rather than a hover rule, because the nav snippet has to be told
   * the labels are wanted, and a stylesheet cannot tell it.
   */
  const railMode = $derived(!isMobile && !railHidden && (rail || isNarrow));
  let railOpen = $state(false);
  const railIcons = $derived(railMode && !railOpen);
  let railRest: ReturnType<typeof setTimeout> | undefined;

  /** Every move starts the rest again, so only a pointer that stops opens the column. */
  function onRailPointerMove() {
    if (railOpen) return;
    clearTimeout(railRest);
    railRest = setTimeout(() => (railOpen = true), RAIL_REST_MS);
  }

  function onRailPointerLeave() {
    clearTimeout(railRest);
    railOpen = false;
  }

  $effect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const narrow = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const wide = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      isMobile = mobile.matches;
      isWide = wide.matches;
      isNarrow = narrow.matches && !mobile.matches;
      if (!mobile.matches) navOpen = false;
      clearTimeout(railRest);
      railOpen = false;
    };
    sync();
    mobile.addEventListener('change', sync);
    narrow.addEventListener('change', sync);
    wide.addEventListener('change', sync);
    return () => {
      clearTimeout(railRest);
      mobile.removeEventListener('change', sync);
      narrow.removeEventListener('change', sync);
      wide.removeEventListener('change', sync);
    };
  });

  /** Focus moving from one rail link to the next stays inside. Only leaving the rail closes it. */
  function onRailFocusOut(event: FocusEvent) {
    const next = event.relatedTarget;
    if (
      next instanceof Node &&
      event.currentTarget instanceof Node &&
      event.currentTarget.contains(next)
    )
      return;
    railOpen = false;
  }

  /** The backdrop is the pointer's way out of the drawer. A keyboard has none. */
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && navOpen) navOpen = false;
    if (event.key === 'Escape' && panelModal) panelOpen = false;
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div bind:this={shellEl} data-print="unclip" class="flex h-screen {klass}">
  <!-- First focusable thing in the document. Without it a keyboard reader tabs
       the whole sidebar again on every page. -->
  <a
    href="#content"
    data-print="hide"
    class="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-skip-link focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-fg focus:outline-none focus:ring-2 focus:ring-brand"
  >
    Skip to content
  </a>

  {#if drawerOpen}
    <!-- Follows Drawer and Modal: no palette token reads as a dimmer in both
         themes. Closing on it is the gesture people expect, and it stops a tap
         reaching the page under the open drawer. -->
    <div
      data-print="hide"
      transition:motion.scrim|global
      class="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
      role="presentation"
      onclick={() => (navOpen = false)}
    ></div>
  {/if}

  <!--
    One aside at every width. Below md: it sits inside a positioned dialog. Above
    it, that wrapper is the column it has always been. Rendering a second copy
    for the drawer would put every nav link in the page twice, which is what a
    strict-mode locator trips on and what a screen reader reads out.

    The dialog role is on the wrapper and not on the aside: an aside is a
    complementary landmark, and the a11y gate rejects a non-interactive element
    taking an interactive role. use:overlay is what makes aria-modal true rather
    than merely claimed. It moves focus in, keeps Tab inside, and hands focus
    back to the hamburger on close. It slides from the start edge and back
    on the drawer preset, as every other drawer does, rather than snapping.
  -->
  {#if drawerOpen}
    <div
      data-print="hide"
      transition:motion.drawer|global={{ side: startSide() }}
      class="fixed inset-y-0 start-0 z-drawer flex shadow-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={drawerLabel}
      use:overlay
    >
      {@render sidebar(false, false)}
    </div>
  {:else if railMode}
    <!--
      The column keeps the rail's width whatever the aside inside it does. The
      aside is taken out of the column's flow so that, opened, it lies over
      the page at the dropdown layer instead of pushing it 168px sideways and
      back on every pass of the pointer.
    -->
    <div
      data-testid="app-rail"
      role="presentation"
      class="relative hidden {APP_SIDEBAR_RAIL} shrink-0 md:block"
      onpointerenter={onRailPointerMove}
      onpointermove={onRailPointerMove}
      onpointerleave={onRailPointerLeave}
      onfocusin={() => (railOpen = true)}
      onfocusout={onRailFocusOut}
    >
      <div
        class="absolute inset-y-0 start-0 z-dropdown flex transition-shadow {railOpen
          ? 'shadow-popover'
          : ''}"
      >
        {@render sidebar(isMobile, railIcons)}
      </div>
    </div>
  {:else if !railHidden}
    <div class="hidden md:flex">
      {@render sidebar(isMobile, false)}
    </div>
  {/if}

  <!-- The column carries the ink and the light pooled at its top, so the
       translucent header and the page under it share one canvas. The main
       region paints nothing of its own for that reason. -->
  <div class="flex min-w-0 flex-1 flex-col bg-ink bg-canvas">
    {#if !barHidden}
      <header data-print="hide" class={APP_HEADER}>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          {#if isMobile}
            <!-- 44px square, the smallest tap target SC 2.5.5 accepts. The -ms-2
               pulls it back to the header's own gutter so the row it starts
               still lines up with the page content below. -->
            <button
              type="button"
              class="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg active:bg-line active:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navOpen}
              onclick={() => (navOpen = !navOpen)}
            >
              <Menu size={20} />
            </button>
          {:else if collapsible}
            <!-- Same square and the same gutter as the hamburger it replaces, so
               the header's first control sits in one place at every width. -->
            <button
              type="button"
              class="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg active:bg-line active:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!collapsed}
              onclick={() => (collapsed = !collapsed)}
            >
              {#if collapsed}<PanelLeft size={20} />{:else}<PanelLeftClose size={20} />{/if}
            </button>
          {/if}
          {#if section}
            <span class="truncate text-sm font-semibold text-fg">
              {section}
            </span>
          {/if}
        </div>

        {#if headerActions}
          <div class="flex shrink-0 items-center gap-1">{@render headerActions()}</div>
        {/if}
      </header>
    {/if}

    <!-- tabindex -1 is what makes the skip link work. A fragment link scrolls
         to its target and moves focus to it only if the target can hold focus,
         so without this the link moved the page and left focus on the body, and
         the next Tab started again at the top of the document: the sidebar the
         reader had just skipped. No outline on it: the region is a landing, not
         a control, and the browser's default drew a box around the whole page
         body the moment the link was used.
         relative because the region scrolls and overflow clips only what it
         contains. An absolute descendant with no positioned ancestor (every
         sr-only label) otherwise took the viewport as its containing block, and
         one low on a long page stretched the document past the h-screen shell,
         so the window scrolled the whole frame up and off. -->
    {#if panel}
      <div bind:this={panelRow} data-testid="app-panel-row" class="flex min-h-0 flex-1">
        {@render content()}
        {#if panelMounted}
          {@render dock(panel)}
        {/if}
      </div>
    {:else}
      {@render content()}
    {/if}
  </div>
</div>

{#snippet content()}
  <main
    id="content"
    tabindex="-1"
    data-print="unclip"
    class="relative min-w-0 flex-1 overflow-auto outline-none"
  >
    {@render children()}
  </main>
{/snippet}

{#snippet dock(body: Snippet)}
  {#if panelModal}
    <div
      data-print="hide"
      transition:motion.scrim|global
      class="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
      role="presentation"
      onclick={() => (panelOpen = false)}
    ></div>
  {/if}
  <!--
    One panel at every width, as the sidebar is one aside. From lg: the frame
    is a column beside main, never over it. Below lg: the column would leave
    the page too narrow to read, so the same frame becomes a modal drawer from
    the end edge, full width on a phone. It stays mounted while it slides, so
    it travels in CSS on the drawer's rungs: slow in, base out.

    Closed, the panel keeps its content mounted at no width, so whatever the
    reader typed in it survives, and inert keeps it out of reach. Docked, the
    content holds the panel's own width while the column travels, so it
    slides rather than reflowing.
  -->
  <div
    data-print="hide"
    class={isWide
      ? 'relative hidden shrink-0 lg:flex'
      : `fixed inset-y-0 end-0 z-drawer flex w-full shadow-overlay transition-[translate,visibility] sm:w-auto ${
          panelOpen
            ? 'visible translate-x-0 duration-slow ease-enter'
            : 'invisible translate-x-full duration-base ease-exit rtl:-translate-x-full'
        }`}
    role={panelModal ? 'dialog' : undefined}
    aria-modal={panelModal ? 'true' : undefined}
    aria-labelledby={panelModal ? panelHeadingId : undefined}
    use:modalWhen={panelModal}
  >
    <aside
      bind:this={panelEl}
      aria-label={panelLabel}
      data-testid="app-panel"
      inert={!panelOpen}
      style="--panel-w:{panelShown}px"
      class="relative flex shrink-0 flex-col overflow-hidden bg-surface {isWide
        ? `${panelOpen ? 'w-(--panel-w) border-s border-line' : 'w-0'} ${panelDrag ? '' : 'transition-[width] duration-base ease-move'}`
        : 'w-full border-s border-line sm:w-(--panel-w)'}"
    >
      {#if panelModal}
        <OverlayHeader
          title={panelLabel}
          headingId={panelHeadingId}
          descriptionId="{panelHeadingId}-description"
          onclose={() => (panelOpen = false)}
        />
      {/if}
      <div class="flex min-h-0 flex-1 flex-col {isWide ? 'w-(--panel-w) shrink-0' : 'w-full'}">
        {@render body()}
      </div>
      {#if panelOpen && isWide}
        <!-- A separator that takes focus is the pattern for a splitter, and the
             a11y rules read every separator as static. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="absolute inset-y-0 start-0 w-2 cursor-col-resize outline-none hover:bg-brand/40 focus-visible:bg-brand/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand {panelDrag
            ? 'bg-brand/40'
            : ''}"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize {panelLabel}"
          aria-valuenow={panelShown}
          aria-valuemin={PANEL.min}
          aria-valuemax={panelMax}
          tabindex="0"
          data-testid="app-panel-handle"
          onpointerdown={startPanelResize}
          onpointermove={panelResizeMove}
          onpointerup={endPanelResize}
          onpointercancel={endPanelResize}
          onkeydown={panelResizeKey}
        ></div>
      {/if}
    </aside>
  </div>
{/snippet}

{#snippet sidebar(hidden: boolean, rail: boolean)}
  <!-- The bands clip on the rail: a brand row that ignores the argument still
       holds its wordmark, and 56px of it is better than the wordmark running
       out over the page. -->
  <aside
    aria-label={sidebarLabel}
    data-print="hide"
    data-testid="app-sidebar"
    class="{APP_SIDEBAR} {APP_SIDEBAR_EDGE} {rail ? APP_SIDEBAR_RAIL : APP_SIDEBAR_WIDE} flex"
    inert={hidden}
    aria-hidden={hidden ? 'true' : undefined}
  >
    {#if brand}
      <div class="{APP_BRAND} {rail ? 'overflow-hidden' : ''}">{@render brand({ rail })}</div>
    {/if}
    {#if nav}
      {@render nav({ rail })}
    {/if}
    {#if sidebarFooter}
      <div class="{APP_SIDEBAR_BAND} {rail ? 'overflow-hidden' : ''}">
        {@render sidebarFooter({ rail })}
      </div>
    {/if}
  </aside>
{/snippet}
