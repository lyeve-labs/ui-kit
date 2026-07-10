import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTheme, setTheme, themeBootScript, toggleTheme } from './theme.js';

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
});
