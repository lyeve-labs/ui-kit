/**
 * The order arithmetic and the sentences of a list a person reorders.
 *
 * SortableList moves a row by pointer and by key, and both paths land here,
 * so a drop and an Alt+Arrow press agree on where a row ends up and on what
 * the live region says about it. Each sentence is the one a screen reader
 * hears, so a table-driven test pins the words.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

/**
 * How long a finger rests on a handle before its row lifts. A shorter press
 * is a swipe, and the page scrolls under it as it always did.
 */
export const TOUCH_HOLD_MS = 250;

/** How far a mouse moves with the button down before a press becomes a drag. */
export const DRAG_SLOP_PX = 4;

/** How far a resting finger may wander before the press counts as a swipe. */
export const HOLD_SLOP_PX = 10;

/**
 * How close a lifted row's pointer comes to the edge of the box that scrolls
 * the list before that box scrolls toward it.
 */
export const EDGE_SCROLL_PX = 40;

/** A consumer's answer to a move: true allows it, and a sentence refuses it and says why. */
export type MoveCheck = true | string;

/** What one attempt at a move comes to, with the sentence to announce. */
export type MoveResult<T> =
  | { moved: true; items: T[]; to: number; text: string }
  | { moved: false; text: string };

/**
 * Where a row taken from `from` lands when it is dropped in `gap`, the space
 * before row `gap`. The space after the last row is the gap numbered by the
 * list's length. The two gaps beside the row leave it where it was.
 */
export function landing(from: number, gap: number): number {
  return gap > from ? gap - 1 : gap;
}

/**
 * Moves the row at `from` to `to` in a copy of the list, once the consumer's
 * check allows it. A move off either end changes nothing and says so, and a
 * move to where the row already is changes nothing and says nothing.
 */
export function attempt<T extends { label: string }>(
  items: readonly T[],
  from: number,
  to: number,
  canMove?: (item: T, from: number, to: number) => MoveCheck,
): MoveResult<T> {
  const item = items[from];
  if (to < 0) return { moved: false, text: `${item.label} is already first.` };
  if (to >= items.length) return { moved: false, text: `${item.label} is already last.` };
  if (to === from) return { moved: false, text: '' };
  const check = canMove?.(item, from, to) ?? true;
  if (check !== true) return { moved: false, text: check };
  const next = items.slice();
  next.splice(from, 1);
  next.splice(to, 0, item);
  return {
    moved: true,
    items: next,
    to,
    text: `${item.label} moved to position ${to + 1} of ${items.length}.`,
  };
}
