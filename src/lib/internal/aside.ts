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
