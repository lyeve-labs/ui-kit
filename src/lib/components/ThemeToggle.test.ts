import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from './ThemeToggle.svelte';

const STORAGE_KEY = 'lyeve-theme';

/**
 * jsdom answers every media query with `matches: false`, which reads as "the
 * OS wants dark" and never changes. A three-state control cannot be tested
 * without saying what the OS is asking for and without flipping it mid-session.
 */
function stubSystem(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  let light = prefersLight;
  // `matches` is a getter. A MediaQueryList is live: the object handed out at
  // subscribe time is the same object the listener reads back when the OS
  // changes, and a plain property would freeze it at its value on the day it
  // was created.
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

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('starts on system when nothing has been chosen', () => {
    // The control was two-state and could not express "follow the operating
    // system", which is what an unanswered question resolves to. A reader who
    // had already answered it at the OS level had to answer it again here on
    // every device, and one console forked this component rather than ship
    // that.
    stubSystem(false);
    const { getByRole } = render(ThemeToggle);
    const btn = getByRole('button');
    expect(btn.getAttribute('data-theme-preference')).toBe('system');
    expect(btn.getAttribute('aria-label')).toBe('Theme: system. Switch to light.');
  });

  it('names the state it is in as well as the state it moves to', () => {
    // With two states the action implied the state. With three it does not:
    // "Switch to light" is what both dark and system would say.
    stubSystem(false);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { getByRole } = render(ThemeToggle);
    expect(getByRole('button').getAttribute('aria-label')).toBe('Theme: dark. Switch to system.');
  });

  it('cycles light, dark, system and back', async () => {
    stubSystem(false);
    localStorage.setItem(STORAGE_KEY, 'light');
    const { getByRole } = render(ThemeToggle);
    const btn = getByRole('button');

    expect(btn.getAttribute('data-theme-preference')).toBe('light');
    await fireEvent.click(btn);
    expect(btn.getAttribute('data-theme-preference')).toBe('dark');
    await fireEvent.click(btn);
    expect(btn.getAttribute('data-theme-preference')).toBe('system');
    await fireEvent.click(btn);
    expect(btn.getAttribute('data-theme-preference')).toBe('light');
  });

  it('persists the preference and not the theme it resolved to', async () => {
    // Storing the resolved colour loses the instruction. On the next load the
    // reader is pinned to whatever the OS happened to be asking for when they
    // chose to follow it.
    stubSystem(true);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { getByRole } = render(ThemeToggle);
    await fireEvent.click(getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows the operating system while the preference is system', async () => {
    // The OS flips at dusk. Honouring the preference once, at load, reads as
    // ignoring it for the rest of the session.
    const os = stubSystem(false);
    localStorage.setItem(STORAGE_KEY, 'system');
    render(ThemeToggle);
    await Promise.resolve();
    os.flip(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('leaves the theme alone on an OS change once a colour was chosen', async () => {
    const os = stubSystem(false);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { getByRole } = render(ThemeToggle);
    getByRole('button');
    await Promise.resolve();
    document.documentElement.setAttribute('data-theme', 'dark');
    os.flip(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('gives back the two-state control to a surface that asks for one', async () => {
    // Additive. A screen with a fixed palette passes the order it offers and
    // nothing else about the component changes.
    stubSystem(false);
    localStorage.setItem(STORAGE_KEY, 'light');
    const { getByRole } = render(ThemeToggle, { props: { order: ['light', 'dark'] as const } });
    const btn = getByRole('button');
    await fireEvent.click(btn);
    expect(btn.getAttribute('data-theme-preference')).toBe('dark');
    await fireEvent.click(btn);
    expect(btn.getAttribute('data-theme-preference')).toBe('light');
  });

  it('is chrome, and prints on no page', () => {
    stubSystem(false);
    const { getByRole } = render(ThemeToggle);
    expect(getByRole('button').getAttribute('data-print')).toBe('hide');
  });
});

describe('ThemeToggle under a finger', () => {
  it('acknowledges a press', () => {
    const { container } = render(ThemeToggle, { props: {} });
    expect((container.querySelector('button') as HTMLElement).className).toMatch(/\bactive:/);
  });
});
