import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_PREFERENCES,
  getTheme,
  getThemePreference,
  nextThemePreference,
  resolveTheme,
  setTheme,
  setThemePreference,
  systemTheme,
  themeBootScript,
  toggleTheme,
  watchSystemTheme,
} from './theme.js';

const STORAGE_KEY = 'lyeve-theme';

describe('theme utils', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getTheme', () => {
    it('defaults to dark when no attribute is set', () => {
      expect(getTheme()).toBe('dark');
    });

    it('returns light when data-theme="light"', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      expect(getTheme()).toBe('light');
    });

    it('returns dark when data-theme="dark"', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getTheme()).toBe('dark');
    });

    it('treats any non-"light" value as dark', () => {
      document.documentElement.setAttribute('data-theme', 'sepia');
      expect(getTheme()).toBe('dark');
    });

    it('returns dark on the server (no document)', () => {
      vi.stubGlobal('document', undefined);
      expect(getTheme()).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('applies the data-theme attribute', () => {
      setTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('persists the choice to localStorage', () => {
      setTheme('light');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });

    it('still applies the attribute when localStorage throws (private mode / quota)', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() => setTheme('dark')).not.toThrow();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(spy).toHaveBeenCalledWith(STORAGE_KEY, 'dark');
    });

    it('is a no-op on the server (no document)', () => {
      vi.stubGlobal('document', undefined);
      expect(() => setTheme('light')).not.toThrow();
    });
  });

  describe('toggleTheme', () => {
    it('flips dark → light and returns the new theme', () => {
      setTheme('dark');
      expect(toggleTheme()).toBe('light');
      expect(getTheme()).toBe('light');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });

    it('flips light → dark and returns the new theme', () => {
      setTheme('light');
      expect(toggleTheme()).toBe('dark');
      expect(getTheme()).toBe('dark');
    });

    it('toggling twice returns to the original theme', () => {
      setTheme('dark');
      toggleTheme();
      expect(toggleTheme()).toBe('dark');
    });
  });

  describe('themeBootScript', () => {
    it('returns a string referencing the storage key, media query and both themes', () => {
      const script = themeBootScript();
      expect(typeof script).toBe('string');
      expect(script).toContain(STORAGE_KEY);
      expect(script).toContain('data-theme');
      expect(script).toContain('prefers-color-scheme');
      expect(script).toContain("'light'");
      expect(script).toContain("'dark'");
    });

    it('is wrapped in a self-invoking function', () => {
      const script = themeBootScript();
      expect(script.trimStart().startsWith('(function')).toBe(true);
      expect(script.trimEnd().endsWith('})();')).toBe(true);
    });
  });

  describe('the preference, which is not the theme', () => {
    /**
     * jsdom answers every media query with `matches: false`. That is a valid
     * answer - it means the OS is not asking for light - but it is the only
     * answer it gives, so the light half of every branch below goes untested
     * without a stub.
     */
    function stubSystem(prefersLight: boolean) {
      const listeners = new Set<() => void>();
      let light = prefersLight;
      // `matches` is a getter. A MediaQueryList is live: the object handed out
      // at subscribe time is the same object the listener reads back when the
      // OS changes, and a plain property would freeze it at its value on the
      // day it was created.
      vi.stubGlobal('matchMedia', (query: string) => ({
        get matches() {
          return query.includes('prefers-color-scheme: light') ? light : false;
        },
        media: query,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      }));
      return {
        flip(toLight: boolean) {
          light = toLight;
          for (const fn of listeners) fn();
        },
        get listenerCount() {
          return listeners.size;
        },
      };
    }

    it('resolves to system when nothing has been stored', () => {
      // Not dark. An unanswered question is answered by the operating system,
      // where the reader has already answered it.
      expect(getThemePreference()).toBe('system');
    });

    it('resolves to system when the stored value is not one it knows', () => {
      localStorage.setItem('lyeve-theme', 'sepia');
      expect(getThemePreference()).toBe('system');
    });

    it.each(['light', 'dark', 'system'] as const)('reads back a stored %s', (pref) => {
      localStorage.setItem('lyeve-theme', pref);
      expect(getThemePreference()).toBe(pref);
    });

    it('stores system under its own name rather than by clearing the key', () => {
      // Cleared, it is indistinguishable from never having chosen. The two
      // resolve alike today and they are not the same fact.
      setThemePreference('system');
      expect(localStorage.getItem('lyeve-theme')).toBe('system');
    });

    it('applies what system resolves to, in both directions', () => {
      const os = stubSystem(true);
      expect(setThemePreference('system')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      os.flip(false);
      expect(setThemePreference('system')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('keeps the attribute on the resolved theme and the key on the preference', () => {
      stubSystem(true);
      setThemePreference('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('lyeve-theme')).toBe('system');
      // The attribute is what the palette keys off, and 'system' is not a
      // palette. Writing the preference there would paint the default theme.
      expect(document.documentElement.getAttribute('data-theme')).not.toBe('system');
    });

    it('still applies the attribute when storage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(setThemePreference('light')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('follows the OS rather than storage when storage throws on read', () => {
      stubSystem(true);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('access denied');
      });
      expect(getThemePreference()).toBe('system');
    });

    it('falls back to dark where there is no matchMedia at all', () => {
      vi.stubGlobal('matchMedia', undefined);
      expect(systemTheme()).toBe('dark');
      expect(resolveTheme('system')).toBe('dark');
    });

    it('leaves an explicit preference alone when resolving', () => {
      stubSystem(true);
      expect(resolveTheme('dark')).toBe('dark');
      expect(resolveTheme('light')).toBe('light');
    });

    it('cycles light, dark, system and wraps', () => {
      expect(nextThemePreference('light')).toBe('dark');
      expect(nextThemePreference('dark')).toBe('system');
      expect(nextThemePreference('system')).toBe('light');
      expect(THEME_PREFERENCES).toEqual(['light', 'dark', 'system']);
    });

    it('cycles only what a shorter order offers', () => {
      expect(nextThemePreference('light', ['light', 'dark'])).toBe('dark');
      expect(nextThemePreference('dark', ['light', 'dark'])).toBe('light');
    });

    it('re-enters a shorter order rather than falling out of it', () => {
      // A surface that stops offering `system` still has readers holding it.
      // Left unfound, the index arithmetic would wrap off the end.
      expect(nextThemePreference('system', ['light', 'dark'])).toBe('light');
      expect(nextThemePreference('system', [])).toBe('system');
    });

    it('reports an OS change and stops when unsubscribed', () => {
      const os = stubSystem(false);
      const seen: string[] = [];
      const stop = watchSystemTheme((t) => seen.push(t));
      os.flip(true);
      os.flip(false);
      stop();
      os.flip(true);
      expect(seen).toEqual(['light', 'dark']);
      expect(os.listenerCount).toBe(0);
    });

    it('hands back a working unsubscribe where there is no matchMedia', () => {
      vi.stubGlobal('matchMedia', undefined);
      expect(() => watchSystemTheme(() => {})()).not.toThrow();
    });

    it('leaves the legacy two-state helpers working', () => {
      // Additive. Every consumer on setTheme and toggleTheme keeps working and
      // keeps writing the same key.
      setTheme('light');
      expect(getTheme()).toBe('light');
      expect(getThemePreference()).toBe('light');
      expect(toggleTheme()).toBe('dark');
      expect(getThemePreference()).toBe('dark');
    });
  });
});
