/**
 * Theme utilities - small, framework-agnostic helpers for managing the
 * `data-theme` attribute on `<html>` and persisting the user's choice.
 *
 * The `<ThemeToggle />` component uses these under the hood; you can also
 * call them directly when you need to set the theme from a layout, route
 * loader, or an inline `<script>` that runs before paint.
 *
 * Two vocabularies, and the distinction is the whole point:
 *
 *   Theme            what is painted. `dark` or `light`, and it is what
 *                    `data-theme` holds and what every palette rule keys off.
 *   ThemePreference  what the reader asked for. `dark`, `light`, or `system`,
 *                    which is a standing instruction to follow the operating
 *                    system rather than a colour.
 *
 * The kit resolved a preference in exactly one place, the pre-paint script,
 * and nothing else could read it back. A control could therefore offer two
 * states and no third, so a reader who wanted the operating system's choice
 * had to keep re-picking it by hand, and one console forked ThemeToggle rather
 * than ship that. `system` is now a value the storage key holds and every
 * helper here understands.
 */

/** What is painted. */
export type Theme = 'dark' | 'light';

/** What the reader asked for. `system` resolves against the OS at read time. */
export type ThemePreference = Theme | 'system';

/**
 * The one key every surface in the estate reads and writes.
 *
 * Not exported. A surface that needs the name has `getThemePreference` and
 * `setThemePreference`; a surface that spells the key itself is how two of
 * them ended up on different keys, with the control writing one and the
 * pre-paint script reading the other.
 */
const STORAGE_KEY = 'lyeve-theme';

/** The order a control cycles through, and the order a picker lists. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Inline-script payload that should run *before* the first paint to avoid
 * the flash-of-wrong-theme. Drop the returned string into a `<script>` tag
 * in the `<head>` of your app shell.
 *
 * Picks the theme in this order:
 *   1. `localStorage["lyeve-theme"]` when it holds `'light'` or `'dark'`
 *   2. The user's OS preference (`prefers-color-scheme`), which is also what
 *      the stored value `'system'` asks for
 *   3. Dark (the default brand palette), including when storage throws
 */
export function themeBootScript(): string {
  return `(function () {
    try {
      var stored = localStorage.getItem('${STORAGE_KEY}');
      var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      var theme = stored === 'light' || stored === 'dark' ? stored : (prefersLight ? 'light' : 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (_) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();`;
}

/**
 * What the operating system is asking for.
 *
 * Dark unless the OS says light, which is the same fallback the pre-paint
 * script uses and the same one a browser without `matchMedia` gets.
 */
export function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The theme a preference resolves to right now. */
export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference;
}

/**
 * What the reader asked for, from storage.
 *
 * `system` when nothing is stored, which is the default this kit resolves by
 * and not a guess: an unanswered question is answered by the operating system,
 * because the reader already answered it there.
 */
export function getThemePreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    // Storage may be disabled (private mode, quota). Follow the OS.
    return 'system';
  }
}

/** Read the current theme. SSR-safe; returns `'dark'` on the server. */
export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * Record a preference, apply what it resolves to, and return the applied theme.
 *
 * `system` is stored under its own name rather than by clearing the key. The
 * two are indistinguishable on the next read otherwise, and they are not the
 * same thing: one reader chose to follow the OS and the other has not chosen
 * anything yet. Both resolve identically today; only one of them is a decision
 * a later default may not override.
 */
export function setThemePreference(preference: ThemePreference): Theme {
  const theme = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage may be disabled (private mode, quota); the attribute is applied
    // either way, so the session the reader is in still honours the choice.
  }
  return theme;
}

/** Apply a theme and persist the choice to `localStorage`. */
export function setTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be disabled (private mode, quota); fall through silently.
  }
}

/**
 * The next preference in `order`, wrapping at the end.
 *
 * Takes the list so a surface that offers only two states cycles through only
 * those two. A preference that is not in the list starts the cycle at its
 * first entry rather than falling out of it.
 */
export function nextThemePreference(
  current: ThemePreference,
  order: readonly ThemePreference[] = THEME_PREFERENCES,
): ThemePreference {
  if (order.length === 0) return current;
  const at = order.indexOf(current);
  return at === -1 ? order[0] : order[(at + 1) % order.length];
}

/** Flip between dark and light. Returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Call `onChange` whenever the operating system's choice changes. Returns the
 * unsubscribe function, and a no-op one where there is no `matchMedia`.
 *
 * A page resolving `system` has to repaint when the OS flips at dusk. Without
 * this the preference is honoured once, at load, and reads as ignored for the
 * rest of the session.
 */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => onChange(query.matches ? 'light' : 'dark');
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
