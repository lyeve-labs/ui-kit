<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { activeTrail, flattenNav, type NavNode, type NavTree } from '../internal/nav-tree.js';
  import { safeHref } from '../internal/href.js';
  import { TOUCH_GROW } from '../internal/touch.js';
  import { NAV_ROW, NAV_ROW_REST } from '../internal/layout.js';
  import { createNavExpansion } from '../internal/nav-expansion.svelte.js';
  import { ROW_CHIP_TONE, type AccentTone } from '../internal/tone.js';

  interface Props {
    items: NavTree;
    /** Pathname only, no query, no hash. Passed in rather than read, because the kit cannot import an app router. */
    activePath: string;
    /** The nav landmark's accessible name. */
    label?: string;
    /** Icon-only rail. */
    collapsed?: boolean;
    /** Opens the groups the current page sits in. On by default. */
    expandActive?: boolean;
    /** Keeps one group open at a time: opening one closes the others. */
    exclusive?: boolean;
    /** The localStorage key the open groups are remembered under. Without it they reset on reload. */
    storageKey?: string;
    class?: string;
  }

  let {
    items,
    activePath,
    label = 'Primary',
    collapsed = false,
    expandActive = true,
    exclusive = false,
    storageKey = undefined,
    class: klass = '',
  }: Props = $props();

  // $props.id() and not a random string: a random id differs between the server
  // render and hydration, so every aria-controls built from it points at an
  // element that no longer carries that id once the client takes over.
  const uid = $props.id();

  const expansion = createNavExpansion({
    items: () => items,
    activePath: () => activePath,
    expandActive: () => expandActive,
    exclusive: () => exclusive,
    storageKey: () => storageKey,
  });

  const trail = $derived(activeTrail(items, activePath));
  const onTrail = $derived(new Set(trail));
  /** The tail of the trail is the page itself. Everything above it is an ancestor. */
  const currentId = $derived(trail.length > 0 ? trail[trail.length - 1] : undefined);
  const disabledIds = $derived(
    new Set(flattenNav(items).flatMap(({ node }) => (node.disabled ? [node.id] : []))),
  );
  /**
   * The one row that shows where you are. While every section above the page
   * is open it is the page's own row. Once a reader closes one, the page's row
   * is out of sight, so the outermost closed section carries the same mark.
   * aria-current stays on the page's link either way, because the section is
   * not the page.
   */
  const markId = $derived(
    trail.find((id) => id !== currentId && (!expansion.isExpanded(id) || disabledIds.has(id))) ??
      currentId,
  );

  function listId(id: string): string {
    return `${uid}-${id}-group`;
  }

  /**
   * The row, without the colors any one state paints. Every row at every depth
   * takes exactly these classes: a nested row is indented by its list, not by
   * its own padding, so its fill, radius and current bar start where its own
   * label does rather than in its parent's column.
   *
   * The start border is on every row and transparent in every state, so the
   * current page's mark cannot shift its row two pixels sideways. It shows only
   * in a forced colors scheme, on the current row.
   *
   * The focus ring is inset and stated once, outside every state branch. A
   * sidebar scrolls, and a scrolling box crops the 2px the global outline sits
   * outside its element, so an outer ring on a row near the edge shows as a
   * stray line or as nothing at all.
   */
  const ROW = `${TOUCH_GROW} ${NAV_ROW} border-s-2 ps-inline pe-2`;

  /**
   * Exactly one border color, one background and one text color per state.
   *
   * Every state answers the pointer, including the current one. It did not: the
   * current row was the only paint with no hover step, and the current row is
   * the tail of the active trail, so on any nav deep enough to have sections it
   * is a nested entry. Beside its own siblings, which all lit up, the row for
   * the page you were on read as the one dead entry in the list.
   *
   * The held step is separate from the hovered one because `hover:` compiles
   * inside `@media (hover: hover)` and never matches a finger. A sidebar is
   * mostly used on a phone as a drawer, where the tap that closed it was the
   * one gesture in the component with nothing on screen behind it.
   *
   * The current row's mark is a short cyan to violet bar laid over its start
   * border, inset from the rounded corners, rather than the border itself: a
   * gradient border cannot follow a radius. The border goes transparent under
   * it and returns as the system text color in a forced colors scheme, which
   * draws neither the bar nor the row's fill, so the row keeps a mark there.
   * The row's fill is the brand tint and the bar carries a few pixels of
   * glow, so the row reads as the place you are rather than one more entry.
   * The fill has no edge of its own, so the current row's box matches a
   * hovered row's.
   *
   * One row carries the mark at a time, the one markId names. An open section
   * that holds the current page shows it by being open, with its label in full
   * text color. A second mark of another shape on the section read as two
   * places you are.
   */
  function rowPaint(state: 'current' | 'ancestor' | 'rest'): string {
    if (state === 'current')
      return (
        'relative border-transparent forced-colors:border-[CanvasText] bg-tint ' +
        'font-medium text-brand hover:bg-line active:bg-line ' +
        'after:absolute after:inset-y-1.5 after:-start-0.5 after:w-0.5 after:rounded-full ' +
        'after:bg-brand after:bg-accent-y after:shadow-mark'
      );
    if (state === 'ancestor') return 'border-transparent text-fg hover:bg-surface-2 active:bg-line';
    return `border-transparent ${NAV_ROW_REST}`;
  }

  const ROW_DISABLED = 'cursor-not-allowed border-transparent text-muted opacity-50';

  /**
   * The disclosure beside a link, for a node that is both a destination and a
   * section. It is a separate control because one control cannot know whether
   * a click meant "go there" or "show me what is under it", and guessing gets
   * it wrong half the time.
   */
  const DISCLOSURE =
    `${TOUCH_GROW} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted ` +
    'transition-colors outline-none hover:bg-surface-2 hover:text-fg ' +
    'active:bg-line active:text-fg ' +
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';

  const BADGE_TONE: Record<AccentTone, string> = {
    neutral: 'bg-surface-2 text-faint',
    ...ROW_CHIP_TONE,
  };

  const BADGE = 'ms-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium';
</script>

<!--
  A nav and nothing else. The app shell already owns the aside around this, and
  a second landmark of any kind changes what a landmark query answers with, so
  a test looking for the one navigation region finds two and a screen reader
  user hears the sidebar announced twice.
-->
<nav
  aria-label={label}
  class="{collapsed
    ? 'w-nav-rail'
    : 'w-sidebar'} shrink-0 overflow-y-auto overscroll-contain py-2 {klass}"
>
  <ul class="flex flex-col gap-0.5">
    {#each items as node (node.id)}
      {@render row(node)}
    {/each}
  </ul>
</nav>

{#snippet row(node: NavNode)}
  {@const children = node.children ?? []}
  {@const branch = children.length > 0}
  {@const current = node.id === currentId}
  {@const ancestor = onTrail.has(node.id) && !current}
  {@const paint = rowPaint(node.id === markId ? 'current' : ancestor ? 'ancestor' : 'rest')}
  {@const open = expansion.isExpanded(node.id)}
  <li>
    {#if node.disabled}
      <!--
        Not a link. An anchor without an href is not focusable and an anchor
        with one still navigates, so a disabled entry that keeps its anchor is
        either invisible to the keyboard or not disabled at all.
      -->
      <span class="{ROW} {ROW_DISABLED}" aria-disabled="true">
        {@render body(node)}
      </span>
    {:else if node.href && branch}
      <!--
        The rail stacks the disclosure under the link, under a mouse and under
        a finger alike, so the link keeps the rail's width. Side by side the two
        did not fit. Under a finger the pair took 92px and scrolled the nav
        sideways. Under a mouse the link shrank to its own padding with its icon
        under the chevron, and a rail with a gutter scrolled as well.
      -->
      <div class={collapsed ? 'flex flex-col items-start gap-1' : 'flex items-center gap-1'}>
        <a
          href={safeHref(node.href)}
          aria-current={current ? 'page' : undefined}
          class="{ROW} {paint} min-w-0 flex-1"
        >
          {@render body(node)}
        </a>
        <button
          type="button"
          class={DISCLOSURE}
          aria-expanded={open}
          aria-controls={listId(node.id)}
          aria-current={ancestor ? 'true' : undefined}
          aria-label="{open ? 'Collapse' : 'Expand'} {node.label}"
          onclick={() => expansion.toggle(node.id)}
        >
          {@render chevron(open)}
        </button>
      </div>
    {:else if branch}
      <button
        type="button"
        class="{ROW} {paint}"
        aria-expanded={open}
        aria-controls={listId(node.id)}
        aria-current={ancestor ? 'true' : undefined}
        onclick={() => expansion.toggle(node.id)}
      >
        {@render body(node)}
        {@render chevron(open)}
      </button>
    {:else if node.href}
      <a
        href={safeHref(node.href)}
        aria-current={current ? 'page' : undefined}
        class="{ROW} {paint}"
      >
        {@render body(node)}
      </a>
    {:else}
      <span class="{ROW} {paint}">
        {@render body(node)}
      </span>
    {/if}

    {#if branch}
      <!--
        Rendered whether or not it is open, and shut by collapsing its grid row
        to nothing, the same move AccordionItem makes. aria-controls has to name
        an element that exists. Pointing it at markup that appears only once the
        group is open leaves the reference dangling in the one state where a
        reader needs it to tell them what the button will reveal. inert keeps a
        shut group out of the tab order and the accessibility tree, which is
        what the display utility used to do.

        It keeps the implicit list role. role="group" here overrode it, and a
        listitem whose parent is not a list is an ARIA context error, so every
        row of an open section came back as a serious axe violation. Grouping
        semantics belong to a tree, where the parent is a treeitem. This is a
        nav of plain links and the disclosure already says what it controls.

        Only a group the reader opened or shut slides. A group that follows the
        page opens or shuts in the frame the new page arrives in, because a
        slide there moved every row below it, the one under the pointer
        included, on each page change into or out of the group.
      -->
      {@const shown = open && !node.disabled}
      <div
        class="grid {expansion.isDecided(node.id)
          ? 'transition-[grid-template-rows] duration-base'
          : ''} {shown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}"
      >
        <div class="overflow-hidden">
          <!--
            Each level of nesting indents its list by one step, so a row never
            knows its depth and draws the same at every level. A collapsed rail
            has no room to indent, so its levels all start at the same inset.
          -->
          <ul
            id={listId(node.id)}
            inert={!shown}
            class="mt-0.5 flex flex-col gap-0.5 {collapsed ? '' : 'ms-nav-indent'}"
          >
            {#each children as child (child.id)}
              {@render row(child)}
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </li>
{/snippet}

{#snippet body(node: NavNode)}
  {#if node.icon}
    {@const Icon = node.icon}
    <Icon size={16} class="shrink-0" />
  {/if}
  <!--
    The label stays in the accessible name on a collapsed rail. Dropping it
    leaves a row whose only content is an icon, which a screen reader announces
    as an empty link.
  -->
  <span class={collapsed ? 'sr-only' : 'min-w-0 flex-1 truncate'}>{node.label}</span>
  {#if node.badge !== undefined && !collapsed}
    <span class="{BADGE} {BADGE_TONE[node.badgeTone ?? 'neutral']}">{node.badge}</span>
  {/if}
{/snippet}

{#snippet chevron(open: boolean)}
  <!-- Stroked SVG, not a Unicode arrow: a glyph lands at whatever weight the
       reader's font gives it, visibly apart from every other icon here. -->
  <ChevronRight
    size={14}
    class="shrink-0 transition-transform duration-base {open ? 'rotate-90' : 'rtl:rotate-180'}"
    aria-hidden="true"
  />
{/snippet}
