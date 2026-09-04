/**
 * One owner for the open state, the active row, the keyboard model and the
 * dismissal that every list-bearing control needs.
 *
 * MultiSelect, Autocomplete, DatePicker and Dropdown each hand-rolled all four,
 * and every copy is wrong somewhere different. The dismiss effect is written
 * out four times: MultiSelect.svelte:84-93, DatePicker.svelte:151-160 and
 * Dropdown.svelte:45-54 are byte identical, and Autocomplete.svelte:117-120 is
 * the same minus the keydown, so Escape does nothing there at all.
 * Autocomplete.svelte:90-107 is the kit's only arrow-key implementation and it
 * is incomplete: ArrowUp on a closed list decrements the index without opening
 * anything, Home and End do nothing, there is no typeahead and there is no
 * wrap. Nothing in the kit sets aria-activedescendant, so a screen reader is
 * never told which row the keyboard is resting on, and Autocomplete marks that
 * row with a background tint alone, which reads 1.09:1. The rows are buttons
 * carrying role="option" and no tabindex, so Tab walks into the list instead of
 * leaving the field. Autocomplete.svelte:146 closes on a 150ms blur timer, so
 * clicking an option works only because mousedown-to-click beats the timer. And
 * no copy stops the Escape event, so a listbox inside a Modal closes both.
 *
 * One thing deliberately stays at the call site: what a selection means. This
 * fires onSelect and leaves the list open, because MultiSelect collects several
 * values in one pass and a factory that closed on every pick could not serve
 * it. A single-value control calls close('select') from its own onSelect, which
 * is why that reason exists.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

import { normalize } from './filter.js';

/** The least a row has to be for the keyboard model to work on it. */
export interface ListboxItem {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Why the list closed. A consumer that resets a search query on dismissal but
 * keeps it on a pick needs to tell the two apart, and the four controls each
 * guessed.
 */
export type ListboxCloseReason = 'escape' | 'select' | 'outside' | 'focusout' | 'tab';

export interface ListboxConfig<T extends ListboxItem> {
  items: () => readonly T[];
  /** Stable across the SSR boundary. Pass $props.id(). */
  baseId: () => string;
  onSelect: (item: T, index: number) => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: (reason: ListboxCloseReason) => void;
  /** Typeahead jumps to the next item whose label starts with the typed run. Off for a control with its own text input, where letters are query text. */
  typeahead?: () => boolean;
  /** The active row wraps past the ends. */
  loop?: () => boolean;
}

export interface Listbox {
  readonly open: boolean;
  readonly activeIndex: number;
  /** Attributes for the trigger or the combobox input. */
  readonly triggerAttrs: Record<string, string | undefined>;
  /** Attributes for the panel. */
  readonly listAttrs: Record<string, string | undefined>;
  /** Attributes for one row. tabindex is -1: focus stays on the trigger and position travels by aria-activedescendant. */
  optionAttrs(index: number): Record<string, string | number | undefined>;
  openList(active?: number): void;
  close(reason: ListboxCloseReason): void;
  toggle(): void;
  setActive(index: number): void;
  /** Returns true when it consumed the event. */
  onkeydown(event: KeyboardEvent): boolean;
  /** use:listbox.anchor on the wrapper. Registers outside-click and focusout dismissal. */
  anchor: (node: HTMLElement) => { destroy(): void };
  /** use:listbox.panel on the panel. Keeps the active row scrolled into view. */
  panel: (node: HTMLElement) => { destroy(): void };
}

/**
 * How long a typed run stays open for another character.
 *
 * A pause longer than this starts a new run, so "ne" pauses "n" reaches the
 * first N again rather than searching for a label starting "nn".
 */
const TYPEAHEAD_WINDOW_MS = 500;

/**
 * What counts as the trigger inside an anchor: the first element in the tab
 * sequence. Rows are excluded by construction, since optionAttrs gives every
 * one of them tabindex -1.
 */
const TRIGGER =
  'input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createListbox<T extends ListboxItem>(config: ListboxConfig<T>): Listbox {
  let open = $state(false);
  let activeIndex = $state(-1);

  let anchorNode: HTMLElement | null = null;
  let panelNode: HTMLElement | null = null;
  let listening = false;

  // The typed run and when it was last extended. Plain variables rather than
  // $state: nothing renders them, and a reactive keystroke buffer would
  // invalidate every reader of the list on every letter.
  let typed = '';
  let typedAt = 0;

  const items = (): readonly T[] => config.items();
  const loop = (): boolean => config.loop?.() ?? false;
  const typeahead = (): boolean => config.typeahead?.() ?? false;

  const listId = (): string => `${config.baseId()}-list`;
  const optionId = (index: number): string => `${config.baseId()}-option-${index}`;

  /**
   * The active row, clamped into the list as it stands now.
   *
   * A filter that narrows the list under an active index leaves the index
   * pointing past the end, and aria-activedescendant then names an element that
   * was never rendered, which a screen reader reports as nothing at all.
   * Clamping on read rather than on write means the answer is right even when
   * the list changed without anyone telling the listbox.
   */
  function activeRow(): number {
    const count = items().length;
    if (count === 0 || activeIndex < 0) return -1;
    return activeIndex < count ? activeIndex : count - 1;
  }

  function selectable(index: number): boolean {
    const item = items()[index];
    return item !== undefined && item.disabled !== true;
  }

  function firstSelectable(): number {
    const count = items().length;
    for (let i = 0; i < count; i++) {
      if (selectable(i)) return i;
    }
    return -1;
  }

  function lastSelectable(): number {
    for (let i = items().length - 1; i >= 0; i--) {
      if (selectable(i)) return i;
    }
    return -1;
  }

  /**
   * The next selectable row in one direction.
   *
   * Disabled rows are stepped over rather than landed on, because Enter refuses
   * them: resting the active ring on a row that cannot be chosen tells the user
   * the opposite of the truth. With loop off the move holds at the row it
   * started from, so arrowing into the end of the list does not silently do
   * nothing visible and then jump on the next press.
   */
  function step(from: number, direction: 1 | -1): number {
    const count = items().length;
    if (count === 0) return -1;
    if (from < 0) return direction === 1 ? firstSelectable() : lastSelectable();

    let cursor = from;
    for (let taken = 0; taken < count; taken++) {
      cursor += direction;
      if (cursor < 0 || cursor >= count) {
        if (!loop()) return from;
        cursor = cursor < 0 ? count - 1 : 0;
      }
      if (selectable(cursor)) return cursor;
    }
    return from;
  }

  function moveTo(index: number): void {
    if (index < 0) return;
    activeIndex = index;
    scrollActiveIntoView();
  }

  /**
   * Scrolls the active row far enough to be seen and no further.
   *
   * block: 'nearest' rather than 'center', so arrowing one row down moves the
   * list by one row instead of jumping the whole panel to put that row in the
   * middle of it.
   */
  function scrollActiveIntoView(): void {
    const node = panelNode;
    if (node === null || !open || typeof document === 'undefined') return;

    const index = activeRow();
    if (index < 0) return;

    const row = document.getElementById(optionId(index));
    if (row === null || !node.contains(row)) return;
    // A DOM without scrollIntoView must not take the keyboard down with it.
    if (typeof row.scrollIntoView !== 'function') return;
    row.scrollIntoView({ block: 'nearest' });
  }

  function openList(index?: number): void {
    const fallback = activeRow() >= 0 && selectable(activeRow()) ? activeRow() : firstSelectable();
    const wanted = index === undefined ? fallback : index;
    activeIndex = wanted >= 0 && wanted < items().length && selectable(wanted) ? wanted : fallback;

    if (!open) {
      open = true;
      listenForOutside();
      config.onOpenChange?.(true);
    }
    scrollActiveIntoView();
  }

  function closeList(reason: ListboxCloseReason): void {
    // Idempotent because two dismissals race on every outside click: the
    // pointer closes the list and the focus leaving the field closes it again.
    if (!open) return;
    open = false;
    stopListeningForOutside();
    config.onOpenChange?.(false);
    config.onClose?.(reason);
  }

  function toggleList(): void {
    // A trigger click that closes an open list is a dismissal with nothing
    // chosen, which is what every consumer of 'outside' already does.
    if (open) closeList('outside');
    else openList();
  }

  function setActive(index: number): void {
    if (index < 0) {
      activeIndex = -1;
      return;
    }
    // A pointer must not put the active ring somewhere the keyboard refuses to
    // go, or hovering a disabled row promises an Enter that will not fire.
    if (index >= items().length || !selectable(index)) return;
    moveTo(index);
  }

  function selectActive(): boolean {
    const index = activeRow();
    if (index < 0) return false;
    const item = items()[index];
    if (item === undefined || item.disabled === true) return false;
    config.onSelect(item, index);
    return true;
  }

  /**
   * Returns focus to the field itself.
   *
   * Rows are never in the tab sequence, so focus is usually still on the
   * trigger and this is a no-op. It matters after a pointer lands on a row,
   * which focuses it in every browser that supports tabindex -1.
   */
  function focusTrigger(): void {
    const node = anchorNode;
    if (node === null) return;
    const trigger = node.querySelector<HTMLElement>(TRIGGER);
    if (trigger !== null) trigger.focus();
  }

  /**
   * Matches the accumulated run against the labels.
   *
   * A one-character run searches from the row after the active one, so pressing
   * N repeatedly cycles the N entries. A longer run searches from the active
   * row itself, so typing "ne" lands on Netherlands rather than skipping past
   * the row "n" just reached. Comparison goes through the filter contract's
   * normalize, so an accent on either side folds away and typing "zu" reaches a
   * label spelled with an umlaut.
   */
  function matchRun(run: string): number {
    const needle = normalize(run);
    if (needle === '') return -1;

    const list = items();
    if (list.length === 0) return -1;

    const current = activeRow();
    const from = run.length === 1 ? Math.max(current, -1) + 1 : Math.max(current, 0);

    for (let offset = 0; offset < list.length; offset++) {
      const index = (from + offset) % list.length;
      if (!selectable(index)) continue;
      if (normalize(list[index].label).startsWith(needle)) return index;
    }
    return -1;
  }

  function handleTypeahead(event: KeyboardEvent): boolean {
    if (!typeahead()) return false;
    if (event.key.length !== 1) return false;
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    // Space opens or chooses on a trigger. It extends a run in progress and
    // never starts one, so that meaning survives.
    if (event.key === ' ' && typed === '') return false;

    // Date.now is a timestamp, not a timer: nothing is scheduled and nothing
    // has to be cancelled when the control unmounts mid-run.
    const now = Date.now();
    typed = now - typedAt > TYPEAHEAD_WINDOW_MS ? event.key : typed + event.key;
    typedAt = now;

    if (!open) openList();
    const index = matchRun(typed);
    if (index >= 0) moveTo(index);

    // Consumed either way. The run is open, so the next character extends it
    // rather than reaching the trigger as a fresh key.
    event.preventDefault();
    return true;
  }

  function handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (open) moveTo(step(activeRow(), 1));
        else openList(firstSelectable());
        return true;

      case 'ArrowUp':
        event.preventDefault();
        // Opening on ArrowUp lands on the last row. Autocomplete decremented a
        // hidden index instead, so the first ArrowUp opened nothing and the
        // list, once opened, was already scrolled somewhere unexplained.
        if (open) moveTo(step(activeRow(), -1));
        else openList(lastSelectable());
        return true;

      case 'Home':
        // Closed, Home and End belong to the caret in a combobox input.
        if (!open) return false;
        event.preventDefault();
        moveTo(firstSelectable());
        return true;

      case 'End':
        if (!open) return false;
        event.preventDefault();
        moveTo(lastSelectable());
        return true;

      case 'Enter':
        // A closed list consumes nothing, so Enter still submits the form.
        if (!open) return false;
        if (!selectActive()) return false;
        event.preventDefault();
        return true;

      case 'Escape':
        // Only an open list consumes Escape. Unstopped, one press closed both
        // a listbox and the Modal holding it; consumed while closed, Escape
        // never reached the Modal at all.
        if (!open) return false;
        event.preventDefault();
        event.stopPropagation();
        closeList('escape');
        focusTrigger();
        return true;

      case 'Tab':
        // Never preventDefault: Tab is how focus leaves the field, and the rows
        // are out of the tab sequence so there is nothing else for it to reach.
        closeList('tab');
        return false;

      default:
        return handleTypeahead(event);
    }
  }

  function handlePointerDown(event: Event): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (anchorNode !== null && anchorNode.contains(target)) return;
    if (panelNode !== null && panelNode.contains(target)) return;
    closeList('outside');
  }

  function handleFocusOut(event: FocusEvent): void {
    if (!open) return;
    // relatedTarget is where focus went. A row inside the panel counts as
    // staying, which is what the 150ms blur timer was standing in for.
    const next = event.relatedTarget;
    if (next instanceof Node) {
      if (anchorNode !== null && anchorNode.contains(next)) return;
      if (panelNode !== null && panelNode.contains(next)) return;
    }
    closeList('focusout');
  }

  function listenForOutside(): void {
    if (listening || typeof document === 'undefined') return;
    // pointerdown, not click: a press that starts outside has already dismissed
    // the list by the time the click lands, so the click reaches what the user
    // aimed at instead of being spent closing the panel.
    document.addEventListener('pointerdown', handlePointerDown, true);
    listening = true;
  }

  function stopListeningForOutside(): void {
    if (!listening || typeof document === 'undefined') return;
    document.removeEventListener('pointerdown', handlePointerDown, true);
    listening = false;
  }

  function anchor(node: HTMLElement): { destroy(): void } {
    anchorNode = node;
    node.addEventListener('focusout', handleFocusOut);
    if (open) listenForOutside();
    return {
      destroy() {
        node.removeEventListener('focusout', handleFocusOut);
        stopListeningForOutside();
        if (anchorNode === node) anchorNode = null;
      },
    };
  }

  function panel(node: HTMLElement): { destroy(): void } {
    panelNode = node;
    // The rows exist for the first time here, so this is where a list opened at
    // its last row gets scrolled to it.
    scrollActiveIntoView();
    return {
      destroy() {
        if (panelNode === node) panelNode = null;
      },
    };
  }

  return {
    get open() {
      return open;
    },
    get activeIndex() {
      return activeRow();
    },
    get triggerAttrs() {
      const index = activeRow();
      return {
        'aria-haspopup': 'listbox',
        'aria-expanded': open ? 'true' : 'false',
        // Both point at elements that exist only while the panel is mounted. A
        // dangling idref is announced as nothing, which reads to the user as a
        // control that has stopped responding.
        'aria-controls': open ? listId() : undefined,
        'aria-activedescendant': open && index >= 0 ? optionId(index) : undefined,
      };
    },
    get listAttrs() {
      // A menu spreads these and then states role="menu" and its own
      // aria-haspopup: the later attribute wins, and the id and the open state
      // are the parts worth sharing.
      return { id: listId(), role: 'listbox' };
    },
    optionAttrs(index: number) {
      const item = items()[index];
      return {
        id: optionId(index),
        role: 'option',
        // Out of the tab sequence on purpose: focus stays on the trigger and
        // the active row travels by aria-activedescendant. As plain buttons the
        // rows put every option between the field and the next control.
        tabindex: -1,
        'aria-disabled': item?.disabled === true ? 'true' : undefined,
      };
    },
    openList,
    close: closeList,
    toggle: toggleList,
    setActive,
    onkeydown: handleKeydown,
    anchor,
    panel,
  };
}
