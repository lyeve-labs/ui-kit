/**
 * What a split pane remembers per viewer: its width and whether the width is
 * locked. Browser storage can be absent or throw (a private window, cleared or
 * blocked site data, a thumbnail capture), so every read and write is guarded
 * and the pane falls back to its default. A convenience, not state a server
 * holds.
 *
 * The stored value is `{"width": <px>, "locked": <bool>}` under the key the
 * consumer names, so a reader keeps the width an earlier copy of this pane
 * wrote under the same key.
 *
 * Not exported from the package entry point: this is an implementation detail.
 */

export interface AsideBounds {
  /** The width the pane opens at until somebody drags it. */
  width: number;
  min: number;
  max: number;
}

export interface AsidePrefs {
  width: number;
  locked: boolean;
}

type Reader = Pick<Storage, 'getItem'> | null | undefined;
type Writer = Pick<Storage, 'setItem'> | null | undefined;

/**
 * The page's local storage, or nothing. Reading the global can itself throw
 * when site data is blocked. Outside a browser it is never read: a server
 * runtime may define a localStorage of its own, warning on first access or
 * holding one store that every request would share.
 */
export function viewerStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function clampWidth(bounds: Pick<AsideBounds, 'min' | 'max'>, width: number): number {
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
}

export function readAside(storage: Reader, key: string, bounds: AsideBounds): AsidePrefs {
  const fallback = { width: bounds.width, locked: false };
  try {
    const raw = storage?.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const { width, locked } = parsed as Partial<AsidePrefs>;
    return {
      width:
        typeof width === 'number' && Number.isFinite(width)
          ? clampWidth(bounds, width)
          : fallback.width,
      locked: locked === true,
    };
  } catch {
    return fallback;
  }
}

export function writeAside(
  storage: Writer,
  key: string,
  bounds: AsideBounds,
  prefs: AsidePrefs,
): void {
  try {
    storage?.setItem(
      key,
      JSON.stringify({ width: clampWidth(bounds, prefs.width), locked: prefs.locked }),
    );
  } catch {
    // Storage refused: the width lasts the page and nothing else.
  }
}

/**
 * Which way a pointer or an arrow moving right changes a docked column's
 * width. The inner edge is on the right of a start column and on the left of
 * an end column, and a right-to-left page swaps both, so the edge always
 * follows the key the way it looks.
 */
export function growsRight(el: Element | undefined, side: 'start' | 'end'): number {
  const rtl = el ? getComputedStyle(el).direction === 'rtl' : false;
  return (side === 'start' ? 1 : -1) * (rtl ? -1 : 1);
}

/**
 * The width a key press on a resize grip asks for, or null for a key the grip
 * does not take. An arrow moves 24px and 80px with Shift, Home and End go to
 * the bounds.
 */
export function keyedWidth(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  current: number,
  grows: number,
  limits: Pick<AsideBounds, 'min' | 'max'>,
): number | null {
  const step = event.shiftKey ? 80 : 24;
  let next: number;
  if (event.key === 'ArrowRight') next = current + step * grows;
  else if (event.key === 'ArrowLeft') next = current - step * grows;
  else if (event.key === 'Home') next = limits.min;
  else if (event.key === 'End') next = limits.max;
  else return null;
  return clampWidth(limits, next);
}
