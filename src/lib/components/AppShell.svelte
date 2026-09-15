<script lang="ts" module>
  /**
   * What the sidebar snippets are told about their column. `rail` is true
   * while the sidebar is the 56px icon rail, so a SidebarNav takes it as
   * `collapsed`, a brand row renders its mark without the wordmark, and a
   * footer band renders what fits. A snippet that ignores the argument still
   * renders; it is simply drawn at 56px and clipped.
   */
  export interface SidebarState {
    rail: boolean;
  }
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
   * one `h1`. The section name here is a span for that reason - a second `h1`
   * in the header makes a heading query answer with two elements and a screen
   * reader announce the page name twice.
   */
  import type { Snippet } from 'svelte';
  import { Menu, PanelLeft, PanelLeftClose } from '@lucide/svelte';
  import { overlay } from '../internal/overlay.js';
  import {
    APP_BRAND,
    APP_HEADER,
    APP_SIDEBAR,
    APP_SIDEBAR_BAND,
    APP_SIDEBAR_RAIL,
    APP_SIDEBAR_WIDE,
  } from '../internal/layout.js';

  interface Props {
    /** The current section, shown in the header. Not a heading: the page owns its h1. */
    section?: string;
    /** Bindable so the app router can close the drawer after a navigation. */
    navOpen?: boolean;
    /**
     * Offers a control that puts the sidebar away above md:.
     *
     * Opt-in rather than on by default: three products render this shell, and
     * a new button in every header of all three is a decision each of them
     * makes for itself. A page that owns the viewport - a canvas, a split pane
     * - is the case it exists for.
     */
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
     * Narrows the sidebar to the icon rail at every width above md:.
     *
     * The rail is automatic between md: and lg:, where the 224px column left a
     * 768px window 496px for the page. A page that owns the viewport - a
     * canvas, a split pane - asks for it at every width with this; the labels
     * still come back under a pointer or the keyboard. Below md: the sidebar
     * is the drawer whatever this says.
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
  const drawerOpen = $derived(isMobile && navOpen);
  /**
   * Collapsing is a desktop gesture. Below md: the same aside is the drawer,
   * so honouring `collapsed` there would leave the hamburger opening nothing.
   */
  const railHidden = $derived(collapsible && collapsed && !isMobile);
  /** Same rule for the header: a desktop gesture, and the drawer's button stays. */
  const barHidden = $derived(headerHidden && !isMobile);

  /**
   * The rail: the icon column, and the labels on demand.
   *
   * While the sidebar is the rail it is 56px wide and the nav is told so. A
   * pointer over it, or focus inside it, opens it to the full column over the
   * page rather than beside it, so the page keeps its width and the reader
   * still gets every label; it closes when the pointer or the focus leaves.
   * State rather than a hover rule, because the nav snippet has to be told
   * the labels are wanted, and a stylesheet cannot tell it.
   */
  const railMode = $derived(!isMobile && !railHidden && (rail || isNarrow));
  let railOpen = $state(false);
  const railIcons = $derived(railMode && !railOpen);

  $effect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const narrow = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const sync = () => {
      isMobile = mobile.matches;
      isNarrow = narrow.matches && !mobile.matches;
      if (!mobile.matches) navOpen = false;
      railOpen = false;
    };
    sync();
    mobile.addEventListener('change', sync);
    narrow.addEventListener('change', sync);
    return () => {
      mobile.removeEventListener('change', sync);
      narrow.removeEventListener('change', sync);
    };
  });

  /** Focus moving from one rail link to the next stays inside; only leaving the rail closes it. */
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
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div data-print="unclip" class="flex h-screen {klass}">
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
      class="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
      role="presentation"
      onclick={() => (navOpen = false)}
    ></div>
  {/if}

  <!--
    One aside at every width. Below md: it sits inside a positioned dialog; above
    it, that wrapper is the column it has always been. Rendering a second copy
    for the drawer would put every nav link in the page twice, which is what a
    strict-mode locator trips on and what a screen reader reads out.

    The dialog role is on the wrapper and not on the aside: an aside is a
    complementary landmark, and the a11y gate rejects a non-interactive element
    taking an interactive role. use:overlay is what makes aria-modal true rather
    than merely claimed - it moves focus in, keeps Tab inside, and hands focus
    back to the hamburger on close.
  -->
  {#if drawerOpen}
    <div
      data-print="hide"
      class="fixed inset-y-0 start-0 z-drawer flex shadow-2xl"
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
      onpointerenter={() => (railOpen = true)}
      onpointerleave={() => (railOpen = false)}
      onfocusin={() => (railOpen = true)}
      onfocusout={onRailFocusOut}
    >
      <div class="absolute inset-y-0 start-0 z-dropdown flex {railOpen ? 'shadow-2xl' : ''}">
        {@render sidebar(isMobile, railIcons)}
      </div>
    </div>
  {:else if !railHidden}
    <div class="hidden md:flex">
      {@render sidebar(isMobile, false)}
    </div>
  {/if}

  <div class="flex min-w-0 flex-1 flex-col">
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
              data-testid="app-sidebar-toggle"
              class="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg active:bg-line active:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!collapsed}
              onclick={() => (collapsed = !collapsed)}
            >
              {#if collapsed}<PanelLeft size={18} />{:else}<PanelLeftClose size={18} />{/if}
            </button>
          {/if}
          {#if section}
            <span data-testid="app-section" class="truncate text-sm font-semibold text-fg">
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
         body the moment the link was used. -->
    <main
      id="content"
      tabindex="-1"
      data-print="unclip"
      class="min-w-0 flex-1 overflow-auto bg-ink outline-none"
    >
      {@render children()}
    </main>
  </div>
</div>

{#snippet sidebar(hidden: boolean, rail: boolean)}
  <!-- The bands clip on the rail: a brand row that ignores the argument still
       holds its wordmark, and 56px of it is better than the wordmark running
       out over the page. -->
  <aside
    aria-label={sidebarLabel}
    data-print="hide"
    data-testid="app-sidebar"
    class="{APP_SIDEBAR} {rail ? APP_SIDEBAR_RAIL : APP_SIDEBAR_WIDE} flex"
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
