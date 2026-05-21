/**
 * Theme utilities - small, framework-agnostic helpers for managing the
 * `data-theme` attribute on `<html>` and persisting the user's choice.
 *
 * The `<ThemeToggle />` component uses these under the hood; you can also
 * call them directly when you need to set the theme from a layout, route
 * loader, or an inline `<script>` that runs before paint.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'lyeve-theme';

/**
 * Inline-script payload that should run *before* the first paint to avoid
 * the flash-of-wrong-theme. Drop the returned string into a `<script>` tag
 * in the `<head>` of your app shell.
 *
 * Picks the theme in this order:
 *   1. `localStorage["lyeve-theme"]` if set
 *   2. The user's OS preference (`prefers-color-scheme`)
 *   3. Dark (the default brand palette)
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

/** Read the current theme. SSR-safe; returns `'dark'` on the server. */
export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
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

/** Flip between dark and light. Returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
