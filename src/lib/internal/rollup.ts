/**
 * The tri-state contract behind a permissions matrix and a checkable tree.
 *
 * A parent control does two jobs at once: it summarises the rows beneath it,
 * and a click on it writes every one of them. Both surfaces folded that summary
 * with `rows.every(has)`, which is true over an empty array, so a group whose
 * rows were all filtered away or all disabled drew as fully granted and the
 * click that followed meant clear rather than fill. Summarising by count rather
 * than by fold, and separating what may be written from what is counted, is the
 * whole reason this module exists.
 *
 * Not exported from the package entry point - this is an implementation detail.
 */

/** What a parent control shows: nothing granted, part granted, all granted. */
export type TriState = 'none' | 'some' | 'all';

/**
 * Rolls a set of rows up to one state.
 *
 * The empty set rolls up to 'none'. Array.prototype.every returns true on an
 * empty array, so the obvious implementation reports a fully granted column
 * over zero rows, and the next click on that column is a bulk write the
 * operator never asked for.
 */
export function rollUp<T>(items: readonly T[], has: (item: T) => boolean): TriState {
  let granted = 0;
  for (const item of items) {
    if (has(item)) granted++;
  }
  if (granted === 0) return 'none';
  return granted === items.length ? 'all' : 'some';
}

/**
 * What a click on a rolled-up control means: 'all' clears, anything else fills.
 *
 * A 'some' state must fill rather than clear, because the partial state most
 * often means the operator is part way through granting.
 */
export function nextState(current: TriState): boolean {
  return current !== 'all';
}

/**
 * Applies a value across a subtree, skipping items that cannot take it.
 *
 * The exclusion is the case that is always got wrong: a disabled row must
 * neither be written nor counted in the roll-up that follows. Returning the
 * writes rather than performing them is what lets the caller feed the same list
 * to both, so the summary can never describe a row the write skipped.
 */
export function setSubtree<T>(
  items: readonly T[],
  value: boolean,
  canSet: (item: T) => boolean,
): { item: T; value: boolean }[] {
  const writes: { item: T; value: boolean }[] = [];
  for (const item of items) {
    if (canSet(item)) writes.push({ item, value });
  }
  return writes;
}

/**
 * Rolls up while treating a floor as already granted.
 *
 * A grant that is inherited rather than stored cannot be revoked by clearing
 * the stored row, so a control that offers to clear it is lying. A row that is
 * floored counts as granted here, which puts the parent at 'all' and makes the
 * next click fill rather than clear.
 */
export function rollUpWithFloor<T>(
  items: readonly T[],
  has: (item: T) => boolean,
  floor: (item: T) => boolean,
): TriState {
  return rollUp(items, (item) => floor(item) || has(item));
}
