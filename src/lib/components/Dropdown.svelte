<script lang="ts">
  /**
   * A menu behind a trigger of the caller's own.
   *
   * The roles were the whole implementation: `menu` and `menuitem` were stated
   * and nothing else was. A screen reader takes those roles at their word and
   * tells the user to arrow through the items, so it announced a keyboard
   * contract the component did not keep, and the rows were left in the tab
   * sequence instead. That is worse than a plain list of buttons, which at
   * least announces what it is. The contract is kept here: focus moves into the
   * menu when it opens, the arrows and Home and End move it between the items,
   * and Escape and Tab both close and hand focus back to the trigger.
   */
  import type { Component, Snippet } from 'svelte';

  interface DropdownItem {
    label: string;
    icon?: Component<{ size?: number; class?: string }>;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    onclick: () => void;
  }

  let {
    items,
    align = 'right',
    class: cls = '',
    trigger,
  }: {
    items: DropdownItem[];
    align?: 'left' | 'right';
    class?: string;
    trigger: Snippet<[{ open: boolean; toggle: () => void }]>;
  } = $props();

  let open = $state(false);
  let containerEl: HTMLDivElement | undefined = $state();
  let menuEl: HTMLDivElement | undefined = $state();
  /** The item focus is resting on. Indexes `items`, disabled rows included. */
  let active = $state(-1);

  /**
   * What counts as the trigger: the first thing in the tab sequence that is not
   * inside the menu. The trigger is a snippet the caller fills, so there is no
   * element here to bind to, and the rows are excluded by position rather than
   * by selector because a caller can put anything focusable in that snippet.
   */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function triggerNode(): HTMLElement | null {
    if (containerEl === undefined) return null;
    for (const node of containerEl.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (menuEl?.contains(node) === true) continue;
      return node;
    }
    return null;
  }

  function itemNodes(): HTMLButtonElement[] {
    if (menuEl === undefined) return [];
    return [...menuEl.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  }

  function enabled(index: number): boolean {
    return items[index] !== undefined && items[index].disabled !== true;
  }

  function first(): number {
    for (let i = 0; i < items.length; i++) if (enabled(i)) return i;
    return -1;
  }

  function last(): number {
    for (let i = items.length - 1; i >= 0; i--) if (enabled(i)) return i;
    return -1;
  }

  /**
   * The next item in one direction, wrapping past the ends.
   *
   * A menu wraps where a listbox does not: arrowing down from the last item
   * reaches the first, which is what the pattern says and what a reader that
   * has just been told this is a menu will expect. Disabled rows are stepped
   * over, because a disabled button refuses focus and Enter refuses to run it.
   */
  function step(from: number, direction: 1 | -1): number {
    const count = items.length;
    if (count === 0) return -1;
    let cursor = from < 0 ? (direction === 1 ? -1 : 0) : from;
    for (let taken = 0; taken < count; taken++) {
      cursor = (cursor + direction + count) % count;
      if (enabled(cursor)) return cursor;
    }
    return -1;
  }

  function openMenu(index: number): void {
    active = index;
    open = true;
  }

  function closeMenu(): void {
    open = false;
    active = -1;
  }

  /**
   * Closes and puts focus back where the user left it.
   *
   * Focus is on a row that is about to be unmounted, so without this it falls
   * to the body and the next Tab starts again from the top of the page.
   */
  function closeAndReturn(): void {
    const back = triggerNode();
    closeMenu();
    back?.focus();
  }

  function toggle() {
    if (open) closeMenu();
    else openMenu(first());
  }

  function handleItemClick(item: DropdownItem) {
    if (item.disabled) return;
    const back = triggerNode();
    closeMenu();
    back?.focus();
    // Focus is settled before the action runs: the callback may open a dialog
    // that moves focus itself, and it must not be moved again afterwards.
    item.onclick();
  }

  function handleOutsideClick(e: MouseEvent) {
    // No focus is returned here. The pointer has already chosen where to go.
    if (containerEl && !containerEl.contains(e.target as Node)) closeMenu();
  }

  /**
   * The last resort for Escape, for the case where focus has left the menu
   * without closing it. The handler below consumes the key whenever focus is
   * still inside, so the two never both fire.
   */
  function handleDocumentKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeAndReturn();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!open) {
      // The menu-button pattern: either arrow opens the menu, one at the top of
      // the list and the other at the bottom.
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      openMenu(event.key === 'ArrowDown' ? first() : last());
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        active = step(active, 1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        active = step(active, -1);
        break;

      case 'Home':
        event.preventDefault();
        active = first();
        break;

      case 'End':
        event.preventDefault();
        active = last();
        break;

      case 'Escape':
        event.preventDefault();
        // Stopped, or one press closes both this menu and the modal holding it.
        event.stopPropagation();
        closeAndReturn();
        break;

      case 'Tab':
        // Never preventDefault: Tab is how focus leaves the menu. Focus is
        // moved to the trigger first and synchronously, so the browser walks on
        // from there rather than from a row it is about to lose.
        closeAndReturn();
        break;

      default:
        break;
    }
  }

  /**
   * The wrapper's keydown, registered as an action rather than written on the
   * element.
   *
   * The keys have to be taken above the trigger, because the trigger is a
   * snippet the caller fills and a closed menu is opened from it. Written on
   * the element, that reads to the compiler as a plain div being made
   * interactive without a role, which is a defect everywhere except here: the
   * role that describes this subtree, `menu`, is on the panel inside it, and
   * the wrapper is not the thing being operated.
   */
  function keys(node: HTMLElement): { destroy(): void } {
    node.addEventListener('keydown', onKeydown);
    return {
      destroy() {
        node.removeEventListener('keydown', onKeydown);
      },
    };
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleOutsideClick, { capture: true });
      document.addEventListener('keydown', handleDocumentKeydown);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick, { capture: true });
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  });

  /*
   * Roving focus, as real focus rather than as aria-activedescendant: the rows
   * are buttons the user activates with Enter and Space, and a button that is
   * described as focused without being focused does not take either key.
   */
  $effect(() => {
    if (!open) return;
    itemNodes()[active]?.focus();
  });
</script>

<div bind:this={containerEl} use:keys class="relative inline-block {cls}">
  {@render trigger({ open, toggle })}

  {#if open}
    <div
      bind:this={menuEl}
      role="menu"
      class="absolute z-dropdown mt-1 py-1 min-w-36 rounded-xl border border-line
        bg-surface shadow-2xl
        {align === 'right' ? 'right-0' : 'left-0'}"
    >
      {#each items as item, index}
        <button
          type="button"
          role="menuitem"
          disabled={item.disabled}
          tabindex={index === active ? 0 : -1}
          onclick={() => handleItemClick(item)}
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            {item.variant === 'danger'
            ? 'text-danger hover:bg-danger/10'
            : 'text-fg hover:bg-surface-2'}"
        >
          {#if item.icon}
            {@const Icon = item.icon}
            <Icon size={14} class="shrink-0" />
          {/if}
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
