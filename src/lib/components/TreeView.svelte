<script lang="ts" generics="T = unknown">
  import { ChevronRight } from '@lucide/svelte';
  import { CHOICE_MARK, choiceBox } from '../internal/choice.js';
  import {
    branchState,
    flattenTree,
    isBranch,
    toggleSubtree,
    type TreeNode,
    type TriState,
  } from '../internal/tree.js';

  interface Props {
    nodes: TreeNode<T>[];
    /** Required. An unnamed tree announces as just "tree". */
    label: string;
    expanded?: string[];
    selected?: string;
    /** Checked LEAF ids only. A branch's state is always derived, never stored, so the two cannot disagree. */
    checked?: string[];
    checkable?: boolean;
    class?: string;
    onactivate?: (node: TreeNode<T>) => void;
    oncheck?: (checked: string[]) => void;
  }

  let {
    nodes,
    label,
    expanded = $bindable([]),
    selected = $bindable(undefined),
    checked = $bindable([]),
    checkable = false,
    class: klass = '',
    onactivate,
    oncheck,
  }: Props = $props();

  let rootEl: HTMLUListElement | undefined = $state();

  /** The row the roving tabindex sits on. Undefined until the user lands somewhere. */
  let activeId: string | undefined = $state(undefined);

  const expandedSet = $derived(new Set(expanded));
  const checkedSet = $derived(new Set(checked));

  /**
   * The visible rows, which is both the paint order and the arrow-key order.
   * A collapsed branch contributes no children here, so ArrowDown cannot land
   * on a row the user cannot see.
   */
  const rows = $derived(flattenTree(nodes, expandedSet));

  /**
   * Exactly one row is in the tab sequence, and the arrows move it.
   *
   * A tree is one stop, not one stop per row: a hundred-node tree with a
   * tabbable row each is a hundred presses to get past. The fallback chain
   * matters as much as the rule. The active row can be gone after a collapse
   * or a data change, so the tabbable row falls back to the selected row and
   * then to the first, and a tree with no row the keyboard can reach is a tree
   * nobody can enter.
   */
  const tabbableId = $derived(
    rows.find((r) => r.node.id === activeId)?.node.id ??
      rows.find((r) => r.node.id === selected)?.node.id ??
      rows[0]?.node.id,
  );

  /** Typeahead buffer. Not state: nothing renders it, and it clears on a timer. */
  let typed = '';
  let typedTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => () => clearTimeout(typedTimer));

  function ariaChecked(state: TriState): 'true' | 'false' | 'mixed' {
    if (state === 'all') return 'true';
    return state === 'some' ? 'mixed' : 'false';
  }

  function rowPaint(isSelected: boolean, disabled: boolean): string {
    // One utility per property in each branch. A resting `hover:bg-surface-2`
    // that a selected row overrides with `bg-surface-2` resolves by the order
    // Tailwind emits the two, not by the order they are written here.
    if (disabled) return 'cursor-not-allowed opacity-50';
    return isSelected
      ? 'cursor-pointer bg-surface-2 font-medium text-brand'
      : 'cursor-pointer hover:bg-surface-2';
  }

  function rowElement(id: string): HTMLElement | undefined {
    if (!rootEl) return undefined;
    return [...rootEl.querySelectorAll<HTMLElement>('[role="treeitem"]')].find(
      (el) => el.dataset.treeId === id,
    );
  }

  function focusRow(id: string | undefined): void {
    if (id === undefined) return;
    activeId = id;
    rowElement(id)?.focus();
  }

  function setOpen(node: TreeNode<T>, open: boolean): void {
    if (!isBranch(node)) return;
    const next = new Set(expanded);
    if (open) next.add(node.id);
    else next.delete(node.id);
    expanded = [...next];
  }

  function toggleOpen(node: TreeNode<T>): void {
    setOpen(node, !expandedSet.has(node.id));
  }

  function activate(node: TreeNode<T>): void {
    if (node.disabled) return;
    selected = node.id;
    onactivate?.(node);
  }

  function toggleCheck(node: TreeNode<T>): void {
    if (!checkable || node.disabled) return;
    const next = new Set(checked);
    const { add, remove } = toggleSubtree(node, next);
    // A branch with no enabled leaf has nothing to write, and reporting a
    // change that did not happen is how a consumer ends up saving a list it was
    // never given.
    if (add.length === 0 && remove.length === 0) return;
    for (const id of add) next.add(id);
    for (const id of remove) next.delete(id);
    checked = [...next];
    oncheck?.(checked);
  }

  function typeahead(key: string, fromId: string): void {
    clearTimeout(typedTimer);
    typedTimer = setTimeout(() => {
      typed = '';
    }, 500);
    typed += key.toLowerCase();

    const start = rows.findIndex((r) => r.node.id === fromId);
    // A single character looks past the current row, so pressing it again walks
    // the matches. A longer buffer includes the current row, or refining a
    // search on the row it already found would jump off it.
    const from = typed.length === 1 ? start + 1 : start;
    for (let step = 0; step < rows.length; step++) {
      const candidate = rows[(from + step + rows.length) % rows.length];
      if (candidate.node.label.toLowerCase().startsWith(typed)) {
        focusRow(candidate.node.id);
        return;
      }
    }
  }

  function onRowClick(e: MouseEvent, node: TreeNode<T>): void {
    const target = e.target as Element | null;
    // Every row is nested inside its ancestors, so a click on a child bubbles
    // through all of them. A row answers only for a target that is its own.
    if (!target || target.closest('[role="treeitem"]') !== e.currentTarget) return;

    activeId = node.id;
    if (target.closest('[data-tree-toggle]')) {
      toggleOpen(node);
      return;
    }
    if (checkable && target.closest('[data-tree-check]')) {
      toggleCheck(node);
      return;
    }
    // A branch that does not open when its row is clicked reads as broken, so
    // the row body opens it as well as activating it.
    if (isBranch(node)) toggleOpen(node);
    activate(node);
  }

  function onRowKeydown(e: KeyboardEvent, node: TreeNode<T>, parentId: string | undefined): void {
    // Keydown bubbles the same way a click does, and only the focused row is
    // the target.
    if (e.target !== e.currentTarget) return;

    const index = rows.findIndex((r) => r.node.id === node.id);
    const open = expandedSet.has(node.id);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusRow(rows[index + 1]?.node.id);
        return;
      case 'ArrowUp':
        e.preventDefault();
        focusRow(rows[index - 1]?.node.id);
        return;
      case 'Home':
        e.preventDefault();
        focusRow(rows[0]?.node.id);
        return;
      case 'End':
        e.preventDefault();
        focusRow(rows[rows.length - 1]?.node.id);
        return;
      case 'ArrowRight':
        e.preventDefault();
        // Opening and descending are two presses. The first press has to leave
        // focus where it is, or a screen reader announces the child before its
        // parent has said it is now open.
        if (!isBranch(node)) return;
        if (!open) setOpen(node, true);
        else focusRow(node.children?.[0]?.id);
        return;
      case 'ArrowLeft':
        e.preventDefault();
        if (isBranch(node) && open) setOpen(node, false);
        else focusRow(parentId);
        return;
      case 'Enter':
        e.preventDefault();
        activate(node);
        return;
      case ' ':
        // Space never reaches the typeahead below. One key that both toggles a
        // check and activates a row leaves the user unable to do either on
        // purpose, so a checkable tree gives Space to the check and keeps
        // Enter for activation.
        e.preventDefault();
        if (checkable) toggleCheck(node);
        else activate(node);
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          typeahead(e.key, node.id);
        }
    }
  }
</script>

{#snippet branch(list: TreeNode<T>[], depth: number, parentId: string | undefined)}
  {#each list as node, i (node.id)}
    {@const open = expandedSet.has(node.id)}
    {@const state = branchState(node, checkedSet)}
    <!--
      The focus ring is stated once, on the element that holds the role and the
      focus, and outside every selected and checked branch. A ring inside the
      selected ternary disappears in the state it was meant to mark, and a
      selected row already carries a brand text colour that a border-only focus
      state would have nothing to add to. Inset, because a tree of any size
      lives in a scrolling container that would crop an outset ring.
    -->
    <li
      role="treeitem"
      data-tree-id={node.id}
      tabindex={node.id === tabbableId ? 0 : -1}
      aria-level={depth + 1}
      aria-setsize={list.length}
      aria-posinset={i + 1}
      aria-expanded={isBranch(node) ? open : undefined}
      aria-selected={selected === node.id}
      aria-checked={checkable ? ariaChecked(state) : undefined}
      aria-disabled={node.disabled ? 'true' : undefined}
      class="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      onclick={(e) => onRowClick(e, node)}
      onkeydown={(e) => onRowKeydown(e, node, parentId)}
      onfocus={() => (activeId = node.id)}
    >
      <!--
        Indentation is a style attribute reading the spacing tokens. A class
        built by interpolating the depth matches no candidate in Tailwind's
        scan, so no rule is generated and every row draws flush left.
      -->
      <div
        class="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors duration-150 {rowPaint(
          selected === node.id,
          !!node.disabled,
        )}"
        style="padding-left: calc(var(--spacing-inline) + {depth} * var(--spacing-stack))"
      >
        {#if isBranch(node)}
          <span
            data-tree-toggle
            class="flex h-4 w-4 shrink-0 items-center justify-center text-faint"
          >
            <ChevronRight
              size={14}
              class="transition-transform duration-150 {open ? 'rotate-90' : ''}"
            />
          </span>
        {:else}
          <span class="h-4 w-4 shrink-0"></span>
        {/if}

        {#if checkable}
          <!--
            A painted box rather than an input: the treeitem itself carries
            aria-checked, and a focusable control inside the row would put a
            second tab stop in a widget whose whole point is that it has one.
          -->
          <span data-tree-check class="flex shrink-0 items-center">
            <span class={choiceBox('checkbox', 'sm', state === 'all', state === 'some')}>
              {#if state !== 'none'}
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                  <path
                    d={state === 'all' ? CHOICE_MARK.check : CHOICE_MARK.mixed}
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              {/if}
            </span>
          </span>
        {/if}

        {#if node.icon}
          {@const Icon = node.icon}
          <Icon size={14} class="shrink-0 text-faint" />
        {/if}

        <span class="truncate">{node.label}</span>

        {#if node.badge !== undefined}
          <span class="ml-auto shrink-0 pl-2 text-xs text-faint">{node.badge}</span>
        {/if}
      </div>

      {#if isBranch(node) && open}
        <ul role="group">
          {@render branch(node.children ?? [], depth + 1, node.id)}
        </ul>
      {/if}
    </li>
  {/each}
{/snippet}

<ul bind:this={rootEl} role="tree" aria-label={label} class="text-fg select-none {klass}">
  {@render branch(nodes, 0, undefined)}
</ul>
