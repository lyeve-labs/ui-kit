<script lang="ts">
  /**
   * The authed application frame: the sidebar, the header bar and the content
   * column, owned once so three apps cannot each invent their own.
   *
   * They did. The admin, the customer portal and the ops console each hand
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
  import { APP_BRAND, APP_HEADER, APP_SIDEBAR, APP_SIDEBAR_BAND } from '../internal/layout.js';

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
    /** The sidebar landmark's accessible name. */
    sidebarLabel?: string;
    /** The drawer's accessible name, below md: where the sidebar is a dialog. */
    drawerLabel?: string;
    /** The product mark, in the sidebar's brand row. */
    brand?: Snippet;
    /** The navigation itself. A SidebarNav, given `class="min-h-0 flex-1"`. */
    nav?: Snippet;
    /** A status band at the foot of the sidebar. Not the account: that is header work. */
    sidebarFooter?: Snippet;
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
  const drawerOpen = $derived(isMobile && navOpen);
  /**
   * Collapsing is a desktop gesture. Below md: the same aside is the drawer,
   * so honouring `collapsed` there would leave the hamburger opening nothing.
   */
  const railHidden = $derived(collapsible && collapsed && !isMobile);

  $effect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      isMobile = mq.matches;
      if (!mq.matches) navOpen = false;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  /** The backdrop is the pointer's way out of the drawer. A keyboard has none. */
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && navOpen) navOpen = false;
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="flex h-screen {klass}">
  <!-- First focusable thing in the document. Without it a keyboard reader tabs
       the whole sidebar again on every page. -->
  <a
    href="#content"
    class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-fg focus:outline-none focus:ring-2 focus:ring-brand"
  >
    Skip to content
  </a>

  {#if drawerOpen}
    <!-- Follows Drawer and Modal: no palette token reads as a dimmer in both
         themes. Closing on it is the gesture people expect, and it stops a tap
         reaching the page under the open drawer. -->
    <div
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
      class="fixed inset-y-0 start-0 z-50 flex shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={drawerLabel}
      use:overlay
    >
      {@render sidebar(false)}
    </div>
  {:else if !railHidden}
    <div class="hidden md:flex">
      {@render sidebar(isMobile)}
    </div>
  {/if}

  <div class="flex min-w-0 flex-1 flex-col">
    <header class={APP_HEADER}>
      <div class="flex min-w-0 flex-1 items-center gap-2">
        {#if isMobile}
          <!-- 44px square, the smallest tap target SC 2.5.5 accepts. The -ms-2
               pulls it back to the header's own gutter so the row it starts
               still lines up with the page content below. -->
          <button
            type="button"
            class="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors duration-150 hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
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
            class="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors duration-150 hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
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

    <!-- tabindex -1 is what makes the skip link work. A fragment link scrolls
         to its target and moves focus to it only if the target can hold focus,
         so without this the link moved the page and left focus on the body, and
         the next Tab started again at the top of the document: the sidebar the
         reader had just skipped. -->
    <main id="content" tabindex="-1" class="min-w-0 flex-1 overflow-auto bg-ink">
      {@render children()}
    </main>
  </div>
</div>

{#snippet sidebar(hidden: boolean)}
  <aside
    aria-label={sidebarLabel}
    class="{APP_SIDEBAR} flex"
    inert={hidden}
    aria-hidden={hidden ? 'true' : undefined}
  >
    {#if brand}
      <div class={APP_BRAND}>{@render brand()}</div>
    {/if}
    {#if nav}
      {@render nav()}
    {/if}
    {#if sidebarFooter}
      <div class={APP_SIDEBAR_BAND}>{@render sidebarFooter()}</div>
    {/if}
  </aside>
{/snippet}
