<script lang="ts" module>
  /** One row a person can move. */
  export interface SortableItem {
    /**
     * Stable, and unique in the list. The rows are keyed by it, so a repeated
     * id throws in development, and an id that changes between renders
     * remounts its row and loses the focus inside it.
     */
    id: string;
    /** What the row is called. Its handle reads "Move <label>", and each move is announced by it. */
    label: string;
  }

  /** A move that landed. */
  export interface SortableMove<T extends SortableItem> {
    item: T;
    from: number;
    to: number;
    /** The list in its new order, which `items` holds as well. */
    items: T[];
  }
</script>

<script lang="ts" generics="T extends SortableItem">
  /**
   * A list a person puts in order, by dragging a row's handle, from the
   * handle's menu, or by pressing Alt with an arrow key.
   *
   * A mouse lifts a row once it moves a few pixels with the button down. A
   * finger lifts it after resting a quarter of a second on the handle, so a
   * swipe that starts there still scrolls the page. A lifted row follows the
   * pointer, a line marks where it will land, the box that scrolls the list
   * scrolls when the pointer nears its edge, and Escape or a second finger
   * puts the row back. A click or tap on the handle opens a menu that moves
   * the row up or down, which is the way in for a pointer that cannot drag
   * and for a screen reader on a phone. Alt+ArrowUp and Alt+ArrowDown move the
   * row that holds the focus, unless the focus is in a text field, where
   * Option and an arrow already move the caret on macOS, or a control in the
   * row has already taken the key.
   *
   * Every move, and every move that cannot happen, is said in a polite live
   * region in the row's own words. `canMove` refuses a move by returning the
   * sentence to say instead, and the line turns to the danger tone while the
   * pointer is over a refused place. A gesture follows its row by id, so a
   * caller that changes `items` mid-drag still moves the row that was lifted,
   * and removing that row ends the drag.
   */
  import { GripVertical } from '@lucide/svelte';
  import { tick, type Snippet } from 'svelte';
  import * as motion from '../motion.js';
  import { cn } from '../utils/cn.js';
  import {
    DRAG_SLOP_PX,
    EDGE_SCROLL_PX,
    HOLD_SLOP_PX,
    TOUCH_HOLD_MS,
    attempt,
    landing,
    type MoveCheck,
  } from '../internal/reorder.js';
  import Button from './Button.svelte';
  import Dropdown from './Dropdown.svelte';

  interface Props {
    /** The rows, in order. Bind it and a move writes the new order back. */
    items: T[];
    /** Names the list for a screen reader. */
    label: string;
    /** Allows a move with true, or refuses it with the sentence to announce instead. */
    canMove?: (item: T, from: number, to: number) => MoveCheck;
    /** Called once a move has landed, when `items` already holds the new order. */
    onmove?: (move: SortableMove<T>) => void;
    /** Draws a row's content beside its handle. */
    row: Snippet<[T, number]>;
    class?: string;
  }

  let { items = $bindable(), label, canMove, onmove, row, class: klass = '' }: Props = $props();

  const uid = $props.id();

  /** A press on a handle that has not lifted its row yet. */
  interface Press {
    pointerId: number;
    /** The row's id. A gesture never holds an index, because `items` can change under it. */
    id: string;
    x: number;
    y: number;
    handle: HTMLElement;
    timer?: ReturnType<typeof setTimeout>;
  }

  /** A lifted row, following the pointer. */
  interface Drag {
    pointerId: number;
    id: string;
    /** Where the pointer holds the row, measured from the row's top. */
    grab: number;
    /** How far the row has traveled from its place. */
    dy: number;
    /** The pointer's latest height, which the edge scroll reads between moves. */
    y: number;
    /** Where the row would land, and whether the check refuses that place. */
    to: number;
    refused: boolean;
  }

  let press: Press | null = null;
  let drag = $state<Drag | null>(null);
  /**
   * Whether the handle's latest press lifted its row, so the click that ends
   * that press is a drop and opens no menu. The next press clears it, not a
   * timer, because a phone can send a tap's click well after the release. A
   * click from Enter or Space has no press behind it (detail 0) and always
   * opens the menu.
   */
  let dragged = false;
  /** The row easing back to its place after a drop that moved nothing. */
  let settling = $state<string | null>(null);
  let spoken = $state({ n: 0, text: '' });
  let list: HTMLUListElement | undefined = $state();
  let scroller: Element | null = null;
  let frame = 0;

  /**
   * Each announcement gets a node of its own, so a screen reader speaks a
   * sentence again when it repeats, such as a second press at the top.
   */
  function say(text: string) {
    if (text) spoken = { n: spoken.n + 1, text };
  }

  function rowsNow(): HTMLElement[] {
    return list ? (Array.from(list.children) as HTMLElement[]) : [];
  }

  /** Where the row with this id is now, or -1 once the caller has removed it. */
  function at(id: string): number {
    return items.findIndex((item) => item.id === id);
  }

  /** Lands a move, or says why it cannot. True when the order changed. */
  function land(from: number, to: number): boolean {
    const result = attempt(items, from, to, canMove);
    say(result.text);
    if (!result.moved) return false;
    const item = items[from];
    items = result.items;
    onmove?.({ item, from, to: result.to, items: result.items });
    return true;
  }

  /**
   * Lands a move and keeps the focus where it was. The keyed rows move as
   * nodes, and a browser drops the focus of a node it takes out of the
   * document, even to put it straight back.
   */
  async function move(from: number, to: number) {
    const focused = document.activeElement;
    if (!land(from, to)) return;
    await tick();
    if (focused instanceof HTMLElement && document.activeElement !== focused) focused.focus();
  }

  function typing(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'))
    );
  }

  /** Whether the key came from this row's own handle, and not from a list inside the row. */
  function fromHandle(e: KeyboardEvent): boolean {
    return (
      e.target instanceof HTMLElement &&
      e.target.hasAttribute('data-handle') &&
      e.target.closest('li') === e.currentTarget
    );
  }

  /**
   * Moves the row on Alt and an arrow, and says whether it took the key. The
   * caller reads the answer rather than defaultPrevented, which an event that
   * cannot be canceled never sets.
   */
  function keyMove(e: KeyboardEvent, index: number): boolean {
    if (e.defaultPrevented || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return false;
    if (typing(e.target)) return false;
    e.preventDefault();
    if (!drag) void move(index, index + (e.key === 'ArrowUp' ? -1 : 1));
    return true;
  }

  /**
   * The handle's menu, built once per row. It reads the row's place only when
   * it opens, so a move elsewhere in a long list rebuilds no menu.
   */
  function menu(id: string) {
    const step = (by: number) => {
      const from = at(id);
      if (from >= 0) void move(from, from + by);
    };
    return [
      {
        label: 'Move up',
        get disabled() {
          return at(id) === 0;
        },
        onclick: () => step(-1),
      },
      {
        label: 'Move down',
        get disabled() {
          return at(id) === items.length - 1;
        },
        onclick: () => step(1),
      },
    ];
  }

  function pressHandle(e: PointerEvent, id: string) {
    if (e.button !== 0 || press || drag) return;
    dragged = false;
    const handle = e.currentTarget as HTMLElement;
    const held: Press = { pointerId: e.pointerId, id, x: e.clientX, y: e.clientY, handle };
    press = held;
    if (e.pointerType === 'touch') held.timer = setTimeout(() => lift(held), TOUCH_HOLD_MS);
    else handle.setPointerCapture?.(e.pointerId);
  }

  function lift(p: Press) {
    quit();
    const from = at(p.id);
    const lifted = rowsNow()[from];
    if (!lifted || !list || !p.handle.isConnected) return;
    p.handle.setPointerCapture?.(p.pointerId);
    settling = null;
    dragged = true;
    drag = {
      pointerId: p.pointerId,
      id: p.id,
      grab: p.y - lifted.getBoundingClientRect().top,
      dy: 0,
      y: p.y,
      to: from,
      refused: false,
    };
    scroller = scrollParent(list);
    frame = requestAnimationFrame(edgeScroll);
  }

  function moveHandle(e: PointerEvent) {
    if (press?.pointerId === e.pointerId) {
      const wandered = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      // A finger that travels before the hold is up is a swipe, and the page
      // scrolls under it.
      if (e.pointerType === 'touch') {
        if (wandered > HOLD_SLOP_PX) quit();
      } else if (wandered > DRAG_SLOP_PX) {
        lift(press);
        follow(e.clientY);
      }
      return;
    }
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.y = e.clientY;
    follow(e.clientY);
  }

  /** Moves the lifted row to the pointer and works out where it would land. */
  function follow(y: number) {
    const d = drag;
    const from = d ? at(d.id) : -1;
    const rows = rowsNow();
    const lifted = rows[from];
    if (!d || !list || !lifted) return;
    // Where the row sits without its travel. Reading it on every move keeps
    // the row under the pointer while the list scrolls beneath it.
    const box = lifted.getBoundingClientRect();
    const top = box.top - d.dy;
    const bounds = list.getBoundingClientRect();
    d.dy = Math.min(bounds.bottom - top - box.height, Math.max(bounds.top - top, y - d.grab - top));
    let gap = rows.length;
    for (let i = 0; i < rows.length; i++) {
      if (i === from) continue;
      const r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        gap = i;
        break;
      }
    }
    const to = landing(from, gap);
    if (to === d.to) return;
    d.to = to;
    d.refused = to !== from && (canMove?.(items[from], from, to) ?? true) !== true;
  }

  function releaseHandle(e: PointerEvent) {
    if (press?.pointerId === e.pointerId) return quit();
    if (!drag || drag.pointerId !== e.pointerId) return;
    // The caller may have changed the rows since the pointer last moved.
    follow(e.clientY);
    const { id, to } = drag;
    const from = at(id);
    stop();
    if (from < 0) return;
    // A move that lands animates from where the row was let go, because the
    // rows are measured before its travel is cleared. A drop that moves
    // nothing eases the row back to its place instead.
    if (to === from || !land(from, to)) settling = id;
  }

  /** Puts a lifted row back where it was, and forgets a press. */
  function cancel() {
    quit();
    if (!drag) return;
    const { id } = drag;
    stop();
    if (at(id) >= 0) settling = id;
  }

  function cancelPointer(e: PointerEvent) {
    if (press?.pointerId === e.pointerId || drag?.pointerId === e.pointerId) cancel();
  }

  function quit() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  function stop() {
    drag = null;
    scroller = null;
    cancelAnimationFrame(frame);
  }

  /** The nearest box that scrolls the list, or the page. */
  function scrollParent(node: HTMLElement): Element {
    for (let el = node.parentElement; el; el = el.parentElement) {
      const { overflowY } = getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    return document.scrollingElement ?? document.documentElement;
  }

  /** Scrolls toward the edge the pointer is near, faster the nearer it is. */
  function edgeScroll() {
    const d = drag;
    if (!d || !scroller) return;
    const page = scroller === document.scrollingElement;
    const box = page ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
    const past =
      d.y < box.top + EDGE_SCROLL_PX
        ? d.y - box.top - EDGE_SCROLL_PX
        : d.y > box.bottom - EDGE_SCROLL_PX
          ? d.y - box.bottom + EDGE_SCROLL_PX
          : 0;
    if (past !== 0) {
      scroller.scrollTop += Math.round(
        Math.max(-EDGE_SCROLL_PX, Math.min(EDGE_SCROLL_PX, past)) / 3,
      );
      follow(d.y);
    }
    frame = requestAnimationFrame(edgeScroll);
  }

  $effect(() => {
    // The window hears how a gesture ends even once the handle that began it
    // has left the document, as when the caller removes the row mid-drag.
    window.addEventListener('pointerup', releaseHandle, true);
    window.addEventListener('pointercancel', cancelPointer, true);
    window.addEventListener('lostpointercapture', cancelPointer, true);
    return () => {
      window.removeEventListener('pointerup', releaseHandle, true);
      window.removeEventListener('pointercancel', cancelPointer, true);
      window.removeEventListener('lostpointercapture', cancelPointer, true);
    };
  });

  $effect(() => {
    if (!drag) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Stopped here so a dialog around the list stays open.
      e.preventDefault();
      e.stopPropagation();
      cancel();
    };
    const second = (e: PointerEvent) => {
      if (drag && e.pointerId !== drag.pointerId) cancel();
    };
    window.addEventListener('keydown', escape, true);
    window.addEventListener('pointerdown', second, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('pointerdown', second, true);
    };
  });

  $effect(() => {
    const node = list;
    if (!node) return;
    // Svelte listens to touchmove passively, and only a listener that is not
    // passive can keep a lifted row's finger from scrolling the page.
    const hold = (e: TouchEvent) => {
      if (drag) e.preventDefault();
    };
    node.addEventListener('touchmove', hold, { passive: false });
    return () => {
      node.removeEventListener('touchmove', hold);
      quit();
      cancelAnimationFrame(frame);
    };
  });

  /** The row that draws the landing line, and on which of its edges. */
  const line = $derived.by(() => {
    const from = drag ? at(drag.id) : -1;
    if (!drag || from < 0 || drag.to === from) return null;
    return { index: drag.to, edge: drag.to > from ? 'after' : 'before', refused: drag.refused };
  });

  // Tailwind reads class names from source, so each edge spells its line out.
  const LINE = {
    before: {
      shape: 'before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full',
      ok: 'before:bg-brand',
      refused: 'before:bg-danger',
    },
    after: {
      shape: 'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
      ok: 'after:bg-brand',
      refused: 'after:bg-danger',
    },
  } as const;

  function rowClass(index: number, id: string): string {
    const mark = line?.index === index ? LINE[line.edge as 'before' | 'after'] : null;
    return cn(
      'relative flex items-center gap-1 rounded-lg',
      drag?.id === id && 'z-dropdown bg-surface shadow-lg',
      settling === id && 'transition-[translate] duration-base ease-move',
      mark && `${mark.shape} ${line?.refused ? mark.refused : mark.ok}`,
    );
  }

  function gripClass(id: string): string {
    if (drag?.id !== id) return 'cursor-grab [-webkit-touch-callout:none]';
    return `[-webkit-touch-callout:none] ${drag.refused ? 'cursor-not-allowed' : 'cursor-grabbing'}`;
  }
</script>

<div class={cn('relative', klass)}>
  <ul bind:this={list} aria-label={label} class="isolate flex flex-col">
    {#each items as item, index (item.id)}
      <!-- The row hears Alt and an arrow from whatever holds the focus inside
           it, the handle or a control the row draws, so the keys work without
           a tab stop of their own. The handle's keys are taken on the way
           down, before its menu opens on an arrow, and the rest on the way
           up, after a control in the row has had its chance to take them. -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li
        animate:motion.reorder
        class={rowClass(index, item.id)}
        style:translate={drag?.id === item.id ? `0 ${drag.dy}px` : undefined}
        onkeydowncapture={(e) => {
          if (fromHandle(e) && keyMove(e, index)) e.stopPropagation();
        }}
        onkeydown={(e) => {
          if (!fromHandle(e)) keyMove(e, index);
        }}
      >
        <Dropdown items={menu(item.id)} class="shrink-0">
          {#snippet trigger({ open, toggle })}
            <Button
              variant="ghost"
              size="sm"
              data-handle
              aria-label="Move {item.label}"
              aria-describedby="{uid}-keys"
              aria-haspopup="menu"
              aria-expanded={open}
              hint={false}
              class={gripClass(item.id)}
              onclick={(e: MouseEvent) => {
                if (e.detail === 0 || !dragged) toggle();
              }}
              onpointerdown={(e: PointerEvent) => pressHandle(e, item.id)}
              onpointermove={moveHandle}
              oncontextmenu={(e: MouseEvent) => {
                if (press || drag) e.preventDefault();
              }}
            >
              <GripVertical size={16} />
            </Button>
          {/snippet}
        </Dropdown>
        <div class="min-w-0 flex-1">{@render row(item, index)}</div>
      </li>
    {/each}
  </ul>
  <p id="{uid}-keys" class="sr-only">
    Press Alt with the up or down arrow to move a row, or Enter for a menu.
  </p>
  <p role="status" class="sr-only">
    {#key spoken.n}<span>{spoken.text}</span>{/key}
  </p>
</div>
