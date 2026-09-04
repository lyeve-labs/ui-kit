<script lang="ts">
  import { activeTrail, type NavNode, type NavTree } from '../internal/nav-tree.js';
  import { createNavExpansion } from '../internal/nav-expansion.svelte.js';
  import type { AccentTone } from '../internal/tone.js';

  interface Props {
    items: NavTree;
    /** Pathname only, no query, no hash. Passed in rather than read, because the kit cannot import an app router. */
    activePath: string;
    /** The nav landmark's accessible name. */
    label?: string;
    /** Icon-only rail. */
    collapsed?: boolean;
    expandActive?: boolean;
    exclusive?: boolean;
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

  function listId(id: string): string {
    return `${uid}-${id}-group`;
  }

  /**
   * The row, without the colours any one state paints.
   *
   * The rail is a start border on every row, not one added when the branch is
   * active, so marking a branch cannot shift its rows two pixels sideways. Its
   * colour is a ternary rather than a second border utility: two colour
   * utilities on one element resolve in the order Tailwind emits them, not the
   * order they are written.
   *
   * The focus ring is inset and stated once, outside every state branch. A
   * sidebar scrolls, and a scrolling box crops the 2px the global outline sits
   * outside its element, so an outer ring on a row near the edge shows as a
   * stray line or as nothing at all.
   */
  const ROW =
    'flex w-full items-center gap-2.5 rounded-lg border-s-2 py-2 pe-2 text-sm text-start ' +
    'transition-colors duration-150 outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';

  /** Exactly one border colour, one background and one text colour per state. */
  function rowPaint(state: 'current' | 'ancestor' | 'rest'): string {
    if (state === 'current') return 'border-brand bg-surface-2 font-medium text-brand';
    if (state === 'ancestor') return 'border-brand text-fg hover:bg-surface-2';
    return 'border-transparent text-muted hover:bg-surface-2 hover:text-fg';
  }

  const ROW_DISABLED = 'cursor-not-allowed border-transparent text-muted opacity-50';

  /**
   * The disclosure beside a link, for a node that is both a destination and a
   * section. It is a separate control because one control cannot know whether
   * a click meant "go there" or "show me what is under it", and guessing gets
   * it wrong half the time.
   */
  const DISCLOSURE =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted ' +
    'transition-colors duration-150 outline-none hover:bg-surface-2 hover:text-fg ' +
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';

  const BADGE_TONE: Record<AccentTone, string> = {
    neutral: 'bg-surface-2 text-faint',
    brand: 'bg-brand/15 text-brand',
    success: 'bg-success/15 text-success',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
    violet: 'bg-violet/15 text-violet',
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
      {@render row(node, 0)}
    {/each}
  </ul>
</nav>

{#snippet row(node: NavNode, depth: number)}
  {@const children = node.children ?? []}
  {@const branch = children.length > 0}
  {@const current = node.id === currentId}
  {@const ancestor = onTrail.has(node.id) && !current}
  {@const paint = rowPaint(current ? 'current' : ancestor ? 'ancestor' : 'rest')}
  {@const open = expansion.isExpanded(node.id)}
  <!--
    Indentation reads a token through a style attribute. A class built from the
    depth, pl-{depth * 4}, matches no candidate in Tailwind's scan of the
    source, so no rule is generated and every level renders flush against the
    edge. A collapsed rail has no room to indent, so its levels all start at
    the same inset.
  -->
  {@const level = collapsed ? 0 : depth}
  <li>
    {#if node.disabled}
      <!--
        Not a link. An anchor without an href is not focusable and an anchor
        with one still navigates, so a disabled entry that keeps its anchor is
        either invisible to the keyboard or not disabled at all.
      -->
      <span
        class="{ROW} {ROW_DISABLED}"
        style="padding-inline-start: calc(var(--spacing-nav-indent) * {level} + var(--spacing-inline))"
        aria-disabled="true"
      >
        {@render body(node)}
      </span>
    {:else if node.href && branch}
      <div class="flex items-center gap-1">
        <a
          href={node.href}
          aria-current={current ? 'page' : undefined}
          class="{ROW} {paint} min-w-0 flex-1"
          style="padding-inline-start: calc(var(--spacing-nav-indent) * {level} + var(--spacing-inline))"
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
        style="padding-inline-start: calc(var(--spacing-nav-indent) * {level} + var(--spacing-inline))"
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
        href={node.href}
        aria-current={current ? 'page' : undefined}
        class="{ROW} {paint}"
        style="padding-inline-start: calc(var(--spacing-nav-indent) * {level} + var(--spacing-inline))"
      >
        {@render body(node)}
      </a>
    {:else}
      <span
        class="{ROW} {paint}"
        style="padding-inline-start: calc(var(--spacing-nav-indent) * {level} + var(--spacing-inline))"
      >
        {@render body(node)}
      </span>
    {/if}

    {#if branch}
      <!--
        Rendered whether or not it is open, and hidden with a display utility.
        aria-controls has to name an element that exists; pointing it at markup
        that appears only once the group is open leaves the reference dangling
        in the one state where a reader needs it to tell them what the button
        will reveal.
      -->
      <ul
        id={listId(node.id)}
        role="group"
        class="{open && !node.disabled ? 'flex' : 'hidden'} mt-0.5 flex-col gap-0.5"
      >
        {#each children as child (child.id)}
          {@render row(child, depth + 1)}
        {/each}
      </ul>
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
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0 transition-transform duration-150 {open ? 'rotate-90' : ''}"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
{/snippet}
