/**
 * The single source of truth for how a floating panel looks.
 *
 * field.ts states the resting control and nothing stated the surface that
 * opens above it, so each of the four popovers grew its own:
 *
 *     MultiSelect  absolute z-50 mt-1 w-full rounded-xl border border-line
 *                  bg-surface shadow-2xl overflow-hidden
 *                  and, on an inner region, max-h-60 overflow-y-auto py-1
 *     Autocomplete absolute z-50 mt-1 w-full max-h-60 overflow-y-auto
 *                  rounded-xl border border-line bg-surface shadow-2xl py-1
 *     DatePicker   absolute z-50 mt-1 w-[17rem] rounded-xl border border-line
 *                  bg-surface shadow-2xl p-3
 *     Dropdown     absolute z-50 mt-1 py-1 min-w-36 rounded-xl border
 *                  border-line bg-surface shadow-2xl
 *
 * Three of those set a width the consumer cannot influence, and DatePicker
 * sets it as w-[17rem], a length no token governs. The scroll lives on an
 * inner region in one, on the surface itself in another and nowhere in the
 * other two, so a Dropdown of eighty items runs past the bottom of the window
 * and the last item cannot be reached. Two panels cap their height at max-h-60
 * and two never cap it. All four drew the boundary with border-line under a
 * flat shadow-2xl, so on a dark page the 1.25:1 edge was all that set the
 * panel apart from whatever it floated over. The shadow was the one thing
 * they agreed on.
 *
 * Width stays at the call site: a menu sized to its trigger and a calendar
 * sized to seven columns are different requirements. Everything else is here.
 *
 * Two rules hold these together. No row carries two utilities for the same
 * property. Color and background sit on the surface, and a row states only
 * the override its state earns, because two utilities for one property resolve
 * in the order Tailwind emits them and not in the order they were written.
 * And a row is inset and rounded, never square and full width: the surface is
 * rounded-xl, so a ring or tint that reaches its edge is cut at the corners on
 * the first and last row. The list pads the rows in by px-1 and each row takes
 * rounded-lg, so what a row paints stays inside the frame with corners of its
 * own.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

import { TOUCH_GROW } from './touch.js';

/**
 * The floating surface every popover paints.
 *
 * border-line, the account menu's, the dialog's and the card's border. SC
 * 1.4.11 asks 3:1 of a boundary only where it is what identifies a control,
 * and nothing here is: each row is named by its text, the shadow lifts the
 * panel off the page and the top highlight lights its edge. line-strong drew a
 * gray frame round every menu and buried that highlight. It carries the
 * resting text color so a row can override it with a single utility.
 *
 * overflow-hidden is a backstop, not the shape: the rows sit inset with
 * corners of their own, so nothing they paint reaches the rounded frame. It
 * still clips a caller's stray full-width child, and it keeps the search
 * field's corners inside the surface's.
 *
 * No vertical offset and no side. Both belong to placePanel, which measures
 * the room and puts the panel above the anchor when there is none below.
 *
 * shadow-popover is the rung above a card, so a menu opened from a card reads
 * as lifted off it rather than as part of it.
 */
export const PANEL_SURFACE =
  'absolute z-dropdown overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-popover inset-shadow-highlight';

/**
 * The scrolling region inside it.
 *
 * The cap is a token, not max-h-60, so a fifth panel cannot pick a different
 * one. overscroll-contain stops a wheel that has reached the end of the list
 * from carrying on into the page behind the open panel. px-1 insets the rows
 * from the frame, so a row's ring and hover tint sit inside the surface's
 * rounded corners instead of being cut by them on the first and last row.
 * relative makes the list hold a row's visually hidden label, so the surface,
 * which clips, gets no scroll range a script could use.
 */
export const PANEL_LIST = 'relative max-h-panel-max overflow-y-auto overscroll-contain px-1 py-1';

/**
 * One row at rest.
 *
 * No background and no text color of its own: it inherits both from the
 * surface, which leaves each state below a single utility to override.
 * rounded-lg, one step inside the surface's rounded-xl, so the hover tint and
 * the active ring follow the row's own corners. Under a finger the 36px row
 * grows to the control height, as Dropdown's menu item, the same row, does.
 */
export const PANEL_OPTION =
  `${TOUCH_GROW} flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-sm ` +
  'transition-colors outline-none hover:bg-surface-2 ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus';

/**
 * The active descendant.
 *
 * A tint alone reads 1.09:1 against the panel, which is not a visible state,
 * so the active row also carries an inset ring in the focus color, the row
 * being where the keyboard is. Inset because the row fills the list's inner
 * width and an outset ring would run into the frame.
 */
export const PANEL_OPTION_ACTIVE = 'bg-surface-2 ring-1 ring-inset ring-focus';

/**
 * A row whose value is selected, which is orthogonal to being active.
 *
 * The keyboard sits on one row while any number of rows are chosen, so this
 * changes the text and never the background the active row is using.
 */
export const PANEL_OPTION_SELECTED = 'font-medium text-brand';

/**
 * A row that cannot be chosen.
 *
 * pointer-events-none rather than a hover override: :hover still matches a
 * disabled button, and a second hover background on the same row would resolve
 * by emitted order, so the row could take the tint and read as choosable.
 */
export const PANEL_OPTION_DISABLED = 'pointer-events-none opacity-40';

/**
 * The line shown when a filter matched nothing.
 *
 * px-2, the same as a row: the list's px-1 supplies the rest, so the text
 * stays flush with row text.
 */
export const PANEL_EMPTY = 'px-2 py-2 text-sm text-faint';

/** The search box at the top of a Select or MultiSelect panel. */
export const PANEL_SEARCH =
  'w-full rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-focus focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/50';

/**
 * A group heading inside the list. Not focusable, so it takes no row classes,
 * only the row's horizontal padding so it lines up with the labels below it.
 */
export const PANEL_GROUP_LABEL = 'px-2 pb-1 pt-3 text-xs font-medium uppercase text-faint';

/**
 * Composes the option classes for a row's state.
 *
 * Exists as a function because three booleans spelled inline at each call site
 * is how the four panels drifted. A disabled row takes the disabled treatment
 * and never the active one, even while the keyboard is resting on it: painting
 * it as the active descendant says Enter will choose it, and Enter will not.
 * Selection survives both, because a chosen row that has since been disabled
 * is still chosen.
 */
export function panelOption(state: {
  active: boolean;
  selected: boolean;
  disabled: boolean;
}): string {
  const parts = [PANEL_OPTION];
  if (state.selected) parts.push(PANEL_OPTION_SELECTED);
  if (state.disabled) {
    parts.push(PANEL_OPTION_DISABLED);
  } else if (state.active) {
    parts.push(PANEL_OPTION_ACTIVE);
  }
  return parts.join(' ');
}

/** Marks the scrolling region inside a surface, so placePanel can find it. */
export const PANEL_LIST_ATTR = 'data-panel-list';

/**
 * The attribute's value when the region is capped by the room alone.
 *
 * The token cap is sized for a list of rows, and a calendar is not one: six
 * weeks of days stand taller than the token, so under it every month would
 * scroll by a few rows. Such a region takes the room as its cap, and never
 * less than its whole height: a calendar that scrolls is one nobody can read.
 */
export const PANEL_LIST_UNCAPPED = 'uncapped';

/** The classes that put the surface under its anchor. */
export const PANEL_BELOW = 'top-full mt-1 origin-top';

/** The classes that put the surface over its anchor. */
export const PANEL_ABOVE = 'bottom-full mb-1 origin-bottom';

/**
 * Breathing room between the panel and the edge it is measured against, so a
 * panel that fits exactly does not sit on the edge of the window or the modal.
 */
const PANEL_EDGE_GAP = 8;

/** The gap PANEL_BELOW opens between the anchor and the surface, mt-1. */
const PANEL_OFFSET = 4;

/**
 * The fewest rows a list keeps in view, or all of them when it has fewer.
 * Below that a list is a slot that scrolls one row at a time.
 */
const PANEL_MIN_ROWS = 4;

/**
 * The least height a region is usable at: an uncapped region's whole height,
 * a list's first few rows and its padding, or a short list whole.
 */
function leastHeight(list: HTMLElement, capped: boolean): number {
  const rows = list.querySelectorAll<HTMLElement>('[role="option"], [role="menuitem"]');
  if (!capped || rows.length <= PANEL_MIN_ROWS) return list.scrollHeight;
  const style = getComputedStyle(list);
  let height = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  for (let i = 0; i < PANEL_MIN_ROWS; i++) height += rows[i].offsetHeight;
  return height;
}

/**
 * The nearest ancestor that clips or scrolls its content.
 *
 * A modal body, a drawer body and a scrolling card all crop what floats past
 * them, so the room a panel has is the room inside that ancestor and not the
 * room in the window. The walk stops short of body and html: an open overlay
 * sets overflow hidden on the body to lock the page, and the body's rect is
 * the document's, not the viewport's. A DOM that computes no style reports an
 * empty string, and an overflow nobody stated is visible.
 */
function clippingAncestor(node: HTMLElement): HTMLElement | null {
  let cursor = node.parentElement;
  while (cursor !== null && cursor !== document.body && cursor !== document.documentElement) {
    const overflow = getComputedStyle(cursor).overflowY;
    if (overflow !== '' && overflow !== 'visible') return cursor;
    cursor = cursor.parentElement;
  }
  return null;
}

/**
 * The part of an element's box its content shows in: inside the borders and
 * inside any scrollbar. A scrollbar sits within the border box, so a panel
 * slid to the border box's edge ended under the scrollbar, its last column cut
 * and the container given a sideways scroll.
 */
function innerBox(el: HTMLElement): { top: number; bottom: number; left: number; right: number } {
  const box = el.getBoundingClientRect();
  const top = box.top + el.clientTop;
  const left = box.left + el.clientLeft;
  return { top, bottom: top + el.clientHeight, left, right: left + el.clientWidth };
}

function swap(node: HTMLElement, remove: string, add: string): void {
  node.classList.remove(...remove.split(' '));
  node.classList.add(...add.split(' '));
}

/**
 * Svelte action for a panel surface. Puts it on the side of its anchor that
 * has room, and stops its list running past whatever clips it.
 *
 *     <div use:placePanel class="{PANEL_SURFACE} w-full">
 *       <div class={PANEL_LIST} data-panel-list>
 *
 * The anchor is the surface's offset parent, the relative wrapper every
 * control puts around its trigger. A DOM without layout has no offset parent,
 * so the parent element stands in. Below is the default, because a list under
 * its field is where a native select puts one. The panel goes above only when
 * its natural height does not fit below and there is more room above, so a
 * long list near the bottom of a modal opens upward instead of into the space
 * under the modal's scroll edge that nobody can reach without scrolling
 * first. Whichever side wins, the list's max-height is the smaller of the
 * token cap and the room on that side, written as a CSS min so the token stays
 * the cap without this code knowing its value. A region marked uncapped takes
 * the room alone.
 *
 * Neither side may hold even that: a one-field modal body is about 100px
 * tall, and capped to it a calendar showed its month row and a list no whole
 * row. When neither side has room for the region's least height, the panel
 * opens below at its own height and the anchor takes a bottom margin of that
 * height, so the container grows to hold it or scrolls to it, and the panel
 * is brought into view. The room is kept until the panel closes, because the
 * container it lengthened would otherwise read as room to spare.
 *
 * The room is what the reader can see: the clipping ancestor's box inside its
 * borders and scrollbars, within the viewport. A panel that would run past
 * the left or the right edge of it first aligns with its anchor's other edge,
 * so a calendar under a field at the end of a row ends where the field ends.
 * When that does not fit either, it slides back inside the room and keeps
 * PANEL_EDGE_GAP from the edge it meets, and one wider than the room shrinks
 * to it.
 *
 * Measured on mount, on resize and on scroll of the clipping ancestor, since
 * each moves the anchor relative to the edge. Scroll does not bubble, so the
 * list's own scrolling never re-measures. A server render has no window and
 * does nothing.
 */
export function placePanel(node: HTMLElement): { destroy(): void } {
  if (typeof window === 'undefined') return { destroy() {} };

  const anchor = node.offsetParent instanceof HTMLElement ? node.offsetParent : node.parentElement;
  const clip = anchor === null ? null : clippingAncestor(anchor);
  const list = node.querySelector<HTMLElement>(`[${PANEL_LIST_ATTR}]`);
  const capped = list?.getAttribute(PANEL_LIST_ATTR) !== PANEL_LIST_UNCAPPED;
  let reserved = false;

  function measure(): void {
    if (anchor === null) return;

    // The list is read at its class-capped height, not at whatever an earlier
    // measurement pinned it to, or a panel shrunk to fit a small room would
    // read as fitting anywhere.
    if (list !== null) list.style.maxHeight = '';

    const rect = anchor.getBoundingClientRect();
    const clipBox = clip === null ? null : innerBox(clip);
    const clipTop = clipBox?.top ?? 0;
    const clipBottom = clipBox?.bottom ?? window.innerHeight;
    const below = clipBottom - rect.bottom - PANEL_EDGE_GAP;
    const above = rect.top - clipTop - PANEL_EDGE_GAP;

    const natural = node.scrollHeight;
    // What the surface adds around the list, a search field for instance, is
    // taken out of the room so the whole panel fits and not only its list.
    const chrome = list === null ? 0 : Math.max(0, node.offsetHeight - list.offsetHeight);
    const reserve =
      reserved || (list !== null && chrome + leastHeight(list, capped) > Math.max(above, below));
    const flip = !reserve && natural > below && above > below;
    if (flip) swap(node, PANEL_BELOW, PANEL_ABOVE);
    else swap(node, PANEL_ABOVE, PANEL_BELOW);

    // A panel past the room beside its anchor comes back inside what the
    // reader can see, which is the clip and the viewport both: the calendar
    // under a finger is as wide as a 320px phone, and its field starts at the
    // page gutter or inside a modal body's padding. It first tries its
    // anchor's other edge, then slides, keeping the gap when the room holds
    // the panel and the gap on both sides. Only a panel past the room moves: a
    // panel inside it, flush with its edge, is still aligned with its field.
    // A panel wider than the room shrinks
    // to it, since a modal body on a 320px phone is narrower than the calendar
    // and scrolled sideways around it, and keeps its start edge in view. Read
    // from the layout box, which the entrance preset's scale does not shrink,
    // and from the width the class gives, not one an earlier measurement
    // capped.
    node.style.maxWidth = '';
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const lo = Math.max(0, clipBox?.left ?? 0);
    const hi = Math.min(viewport, clipBox?.right ?? viewport);
    const span = hi - lo;
    if (node.offsetWidth > span) node.style.maxWidth = `${span}px`;
    const width = node.offsetWidth;
    const rtl = getComputedStyle(node).direction === 'rtl';
    const left = rect.left + node.offsetLeft;
    const right = left + width;
    const gap = width + 2 * PANEL_EDGE_GAP <= span ? PANEL_EDGE_GAP : 0;
    let shift = 0;
    if (width >= span) {
      shift = rtl ? hi - right : lo - left;
    } else if (left < lo || right > hi) {
      const flipped = rtl ? rect.left - left : rect.right - right;
      if (left + flipped >= lo && right + flipped <= hi) shift = flipped;
      else if (right > hi) shift = hi - gap - right;
      else shift = lo + gap - left;
    }
    node.style.translate = shift === 0 ? '' : `${shift}px 0`;

    if (list === null || anchor === null) return;
    if (reserve) {
      anchor.style.marginBottom = `${node.offsetHeight + PANEL_OFFSET}px`;
      if (!reserved) reveal();
      reserved = true;
      return;
    }
    const room = Math.max(0, Math.round((flip ? above : below) - chrome));
    list.style.maxHeight = capped ? `min(var(--spacing-panel-max), ${room}px)` : `${room}px`;
  }

  /**
   * Scrolls the container down until the panel's bottom is in view, or its
   * top when it is taller than the container. Down only: scrollIntoView also
   * scrolls sideways, and a modal body on a 320px phone took a 20px sideways
   * scroll from the room the panel's slide back had already made up.
   */
  function reveal(): void {
    const target = clip ?? window;
    if (typeof target.scrollBy !== 'function') return;
    const top = node.getBoundingClientRect().top;
    const clipTop = clip === null ? 0 : clip.getBoundingClientRect().top;
    const clipBottom = clip === null ? window.innerHeight : clip.getBoundingClientRect().bottom;
    const by = Math.min(top + node.offsetHeight + PANEL_EDGE_GAP - clipBottom, top - clipTop);
    if (by > 0) target.scrollBy(0, by);
  }

  measure();

  const scroller: EventTarget = clip ?? window;
  window.addEventListener('resize', measure, { passive: true });
  scroller.addEventListener('scroll', measure, { passive: true });

  return {
    destroy() {
      window.removeEventListener('resize', measure);
      scroller.removeEventListener('scroll', measure);
      if (reserved && anchor !== null) anchor.style.marginBottom = '';
    },
  };
}

export interface DismissOptions {
  /** Listens only while this is true, so a closed menu costs the document nothing. */
  open: boolean;
  /** A press that starts outside the node. */
  onoutside: () => void;
  /** Escape, wherever focus is. */
  onescape: () => void;
}

/**
 * Closes a menu or a popover on a press outside it and on Escape.
 *
 * pointerdown rather than click, as the listboxes do: a press that starts
 * outside has already closed the panel by the time the click lands, so the
 * click reaches what the reader aimed at, and every kind of menu closes on the
 * same event.
 */
export function dismissOnOutside(
  node: HTMLElement,
  options: DismissOptions,
): { update(next: DismissOptions): void; destroy(): void } {
  let current = options;
  let listening = false;

  function press(event: PointerEvent): void {
    if (!node.contains(event.target as Node)) current.onoutside();
  }
  function key(event: KeyboardEvent): void {
    if (event.key === 'Escape') current.onescape();
  }
  function sync(): void {
    const want = current.open && typeof document !== 'undefined';
    if (want === listening) return;
    if (want) {
      document.addEventListener('pointerdown', press, true);
      document.addEventListener('keydown', key);
    } else {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('keydown', key);
    }
    listening = want;
  }

  sync();
  return {
    update(next) {
      current = next;
      sync();
    },
    destroy() {
      current = { ...current, open: false };
      sync();
    },
  };
}
