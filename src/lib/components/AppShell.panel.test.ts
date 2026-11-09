import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet, flushSync, tick } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const KEY = 'test-panel';

/** Answers the shell's media queries as a window of this many pixels would. */
function viewport(width: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width: (\d+)px/.exec(query);
    const max = /max-width: (\d+)px/.exec(query);
    const matches = (!min || width >= +min[1]) && (!max || width <= +max[1]);
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}

const base = {
  section: 'API keys',
  nav: text('Nav'),
  children: text('Body'),
  panel: text('Assistant body'),
  panelLabel: 'Assistant',
  panelStorageKey: KEY,
};

beforeEach(() => {
  localStorage.clear();
  viewport(1440);
});

const dock = () => screen.getByTestId('app-panel');

/** Svelte sets inert as a property, which jsdom does not reflect to the attribute. */
const inert = (el: HTMLElement) => (el as HTMLElement & { inert?: boolean }).inert === true;

/** A width as the style attribute states it, however the renderer spaces it. */
const widthOf = (el: HTMLElement) =>
  /--panel-w:\s*(\d+)px/.exec(el.getAttribute('style') ?? '')?.[1];

/** jsdom has no PointerEvent. A MouseEvent carries the button and the position the handlers read. */
async function pointer(el: HTMLElement, type: string, init: { button?: number; clientX: number }) {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  await tick();
}

describe('AppShell panel', () => {
  it('renders nothing for a shell given no panel', () => {
    const { queryByTestId, container } = render(AppShell, {
      props: { section: 'API keys', children: text('Body') },
    });
    expect(queryByTestId('app-panel')).toBeNull();
    expect(container.querySelector('main')?.parentElement?.tagName).toBe('DIV');
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0);
  });

  it('docks open beside the main area from lg up, as a named complementary region', () => {
    const { container } = render(AppShell, { props: { ...base, panelOpen: true } });
    const panel = screen.getByRole('complementary', { name: 'Assistant' });
    expect(panel).toBe(dock());
    const main = container.querySelector('main')!;
    // Beside main in one row, never laid over it.
    expect(panel.parentElement).toBe(main.parentElement);
    expect(panel.className).not.toMatch(/\b(fixed|absolute)\b/);
    expect(panel.className).toContain('w-(--panel-w)');
    expect(widthOf(panel)).toBe('400');
    expect(panel.className).toContain('transition-[width] duration-base ease-move');
    expect(inert(panel)).toBe(false);
    expect(panel.textContent).toContain('Assistant body');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes to no width and out of reach, keeping its content mounted', () => {
    render(AppShell, { props: { ...base, panelOpen: false } });
    const panel = dock();
    expect(panel.className).toContain('w-0');
    expect(panel.className).not.toContain('w-(--panel-w) ');
    expect(inert(panel)).toBe(true);
    expect(panel.textContent).toContain('Assistant body');
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('opens and closes as the bound value changes', async () => {
    const { rerender } = render(AppShell, { props: { ...base, panelOpen: false } });
    await rerender({ ...base, panelOpen: true });
    expect(inert(dock())).toBe(false);
    await rerender({ ...base, panelOpen: false });
    expect(inert(dock())).toBe(true);
  });

  it('resizes from the keyboard between 320 and 560, and remembers the width', async () => {
    render(AppShell, { props: { ...base, panelOpen: true } });
    const grip = screen.getByRole('separator', { name: 'Resize Assistant' });
    expect(grip.getAttribute('aria-orientation')).toBe('vertical');
    expect(grip.getAttribute('aria-valuenow')).toBe('400');
    expect(grip.getAttribute('aria-valuemin')).toBe('320');
    expect(grip.getAttribute('aria-valuemax')).toBe('560');

    // The panel sits on the right, so moving its edge left widens it.
    await fireEvent.keyDown(grip, { key: 'ArrowLeft' });
    expect(grip.getAttribute('aria-valuenow')).toBe('424');
    expect(widthOf(dock())).toBe('424');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ width: 424 });

    await fireEvent.keyDown(grip, { key: 'End' });
    expect(grip.getAttribute('aria-valuenow')).toBe('560');
    await fireEvent.keyDown(grip, { key: 'ArrowLeft', shiftKey: true });
    expect(grip.getAttribute('aria-valuenow')).toBe('560');
    await fireEvent.keyDown(grip, { key: 'Home' });
    expect(grip.getAttribute('aria-valuenow')).toBe('320');
    await fireEvent.keyDown(grip, { key: 'ArrowRight' });
    expect(grip.getAttribute('aria-valuenow')).toBe('320');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ width: 320 });
  });

  it('opens at the width this viewer left it at', () => {
    localStorage.setItem(KEY, JSON.stringify({ width: 480, locked: false }));
    render(AppShell, { props: { ...base, panelOpen: true } });
    expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('480');
  });

  it('resizes by pointer, with the travel switched off while it drags', async () => {
    render(AppShell, { props: { ...base, panelOpen: true } });
    const grip = screen.getByRole('separator');
    await pointer(grip, 'pointerdown', { button: 0, clientX: 1000 });
    expect(dock().className).not.toContain('transition-[width]');
    await pointer(grip, 'pointermove', { clientX: 950 });
    expect(grip.getAttribute('aria-valuenow')).toBe('450');
    await pointer(grip, 'pointerup', { clientX: 950 });
    expect(dock().className).toContain('transition-[width]');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ width: 450 });
  });

  it('opens as a modal drawer from the right below lg, and closing it unbinds the panel', async () => {
    viewport(390);
    let open = true;
    render(AppShell, {
      props: {
        ...base,
        get panelOpen() {
          return open;
        },
        set panelOpen(v: boolean) {
          open = v;
        },
      },
    });
    flushSync();
    expect(screen.queryByTestId('app-panel')).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'Assistant' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.className).toContain('w-full');
    expect(dialog.className).toContain('border-s');
    expect(dialog.textContent).toContain('Assistant body');

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(open).toBe(false);
  });

  it('keeps the drawer shut below lg while the panel is closed', () => {
    viewport(390);
    render(AppShell, { props: { ...base, panelOpen: false } });
    flushSync();
    expect(screen.queryByRole('dialog', { name: 'Assistant' })).toBeNull();
  });
});
