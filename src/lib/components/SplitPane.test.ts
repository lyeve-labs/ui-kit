import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import SplitPane from './SplitPane.svelte';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const body = createRawSnippet(() => ({ render: () => '<p>body</p>' }));
const count = createRawSnippet(() => ({ render: () => '<span>12</span>' }));

const KEY = 'test-aside';
const BOUNDS = { width: 260, min: 200, max: 500 };

type Props = Partial<{
  side: 'start' | 'end';
  breakpoint: 'md' | 'lg' | 'xl';
  below: 'stack' | 'overlay' | 'hidden';
  overlay: boolean;
  collapsible: boolean;
  open: boolean;
  class: string;
  meta: typeof count;
}>;

function setup(props: Props = {}) {
  const result = render(SplitPane, {
    props: {
      storageKey: KEY,
      label: 'Things',
      side: props.side ?? 'start',
      ...BOUNDS,
      ...props,
      children: body,
    },
  });
  const aside = result.getByTestId(`aside-${KEY}`);
  return {
    ...result,
    aside,
    widthOf: () => aside.style.getPropertyValue('--panel-w'),
    handle: () => result.queryByTestId(`aside-${KEY}-handle`),
    stored: () => JSON.parse(localStorage.getItem(KEY) ?? 'null'),
  };
}

/**
 * A pointer event with coordinates. jsdom has no PointerEvent, so the one
 * testing-library builds carries neither the button nor the position. A mouse
 * event carries both, and the handler reads nothing else.
 */
async function pointer(el: HTMLElement, type: string, init: { button?: number; clientX: number }) {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  await tick();
}

/** The classes one by one, so a case can name a class without matching its variants. */
const classesOf = (el: HTMLElement) => el.className.split(/\s+/).filter(Boolean);

describe('SplitPane', () => {
  it('opens at its default width, or at the remembered width and lock', () => {
    expect(setup().widthOf()).toBe('260px');
    cleanup();
    localStorage.setItem(KEY, JSON.stringify({ width: 400, locked: true }));
    const { widthOf, handle, getByRole } = setup();
    expect(widthOf()).toBe('400px');
    expect(handle()).toBeNull();
    expect(getByRole('button', { name: 'Unlock Things width' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('clamps a remembered width to the bounds it is given now', () => {
    localStorage.setItem(KEY, JSON.stringify({ width: 900, locked: false }));
    const { widthOf, stored } = setup();
    expect(widthOf()).toBe('500px');
    // Nothing is written until the reader moves the edge.
    expect(stored()).toEqual({ width: 900, locked: false });
  });

  it('survives storage that throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('refused');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('refused');
    });
    try {
      const { widthOf, handle } = setup();
      expect(widthOf()).toBe('260px');
      expect(() => fireEvent.keyDown(handle() as HTMLElement, { key: 'ArrowRight' })).not.toThrow();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it('drags the inner edge in the direction that grows it and remembers the width on release', async () => {
    const start = setup({ side: 'start' });
    const h = start.handle() as HTMLElement;
    await pointer(h, 'pointerdown', { button: 0, clientX: 260 });
    await pointer(h, 'pointermove', { clientX: 320 });
    expect(start.widthOf()).toBe('320px');
    expect(start.stored()).toBeNull();
    await pointer(h, 'pointerup', { clientX: 320 });
    expect(start.stored()).toEqual({ width: 320, locked: false });
    cleanup();
    localStorage.clear();

    // An end pane grows toward the start: a pointer moving left makes it wider.
    const end = setup({ side: 'end' });
    const e = end.handle() as HTMLElement;
    await pointer(e, 'pointerdown', { button: 0, clientX: 900 });
    await pointer(e, 'pointermove', { clientX: 840 });
    expect(end.widthOf()).toBe('320px');
    expect(classesOf(e)).toContain('-start-1');
  });

  it('ignores a press that is not the primary button', async () => {
    const { handle, widthOf } = setup();
    const h = handle() as HTMLElement;
    await pointer(h, 'pointerdown', { button: 2, clientX: 260 });
    await pointer(h, 'pointermove', { clientX: 400 });
    expect(widthOf()).toBe('260px');
  });

  it('clamps to the bounds and announces them', async () => {
    const { handle, widthOf } = setup();
    const h = handle() as HTMLElement;
    await pointer(h, 'pointerdown', { button: 0, clientX: 260 });
    await pointer(h, 'pointermove', { clientX: -500 });
    expect(widthOf()).toBe('200px');
    await pointer(h, 'pointermove', { clientX: 5000 });
    expect(widthOf()).toBe('500px');
    expect(h.getAttribute('aria-valuemin')).toBe('200');
    expect(h.getAttribute('aria-valuemax')).toBe('500');
    expect(h.getAttribute('role')).toBe('separator');
    expect(h.getAttribute('aria-label')).toBe('Resize Things');
  });

  it('moves by a step from the keyboard, more with Shift, and writes each step', async () => {
    const { handle, widthOf, stored } = setup();
    const h = handle() as HTMLElement;
    await fireEvent.keyDown(h, { key: 'ArrowRight' });
    expect(widthOf()).toBe('284px');
    await fireEvent.keyDown(h, { key: 'ArrowLeft', shiftKey: true });
    expect(widthOf()).toBe('204px');
    expect(stored().width).toBe(204);
    expect(h.getAttribute('aria-valuenow')).toBe('204');
    await fireEvent.keyDown(h, { key: 'ArrowUp' });
    expect(widthOf()).toBe('204px');
  });

  it('goes to the smallest width on Home and the largest on End', async () => {
    const { handle, widthOf, stored } = setup();
    const h = handle() as HTMLElement;
    await fireEvent.keyDown(h, { key: 'End' });
    expect(widthOf()).toBe('500px');
    expect(stored().width).toBe(500);
    await fireEvent.keyDown(h, { key: 'Home' });
    expect(widthOf()).toBe('200px');
    expect(h.getAttribute('aria-valuenow')).toBe('200');
  });

  it('locks the width: the handle goes and the lock is remembered', async () => {
    const { getByRole, handle, stored, aside } = setup();
    await fireEvent.click(getByRole('button', { name: 'Lock Things width' }));
    expect(handle()).toBeNull();
    expect(aside.getAttribute('data-locked')).toBe('true');
    expect(stored()).toEqual({ width: 260, locked: true });
    await fireEvent.click(getByRole('button', { name: 'Unlock Things width' }));
    expect(handle()).not.toBeNull();
    expect(stored().locked).toBe(false);
  });

  it('offers no collapse unless asked, and folds to a strip that expands again when it is', async () => {
    const plain = setup();
    expect(plain.queryByRole('button', { name: 'Collapse Things' })).toBeNull();
    expect(plain.queryByTestId(`aside-${KEY}-strip`)).toBeNull();
    cleanup();

    const { getByRole, getByTestId, aside, getByText } = setup({ collapsible: true });
    await fireEvent.click(getByRole('button', { name: 'Collapse Things' }));
    expect(aside.getAttribute('data-open')).toBe('false');
    expect(classesOf(aside)).toContain('xl:w-8');
    const strip = getByTestId(`aside-${KEY}-strip`);
    expect(strip.textContent).toContain('Things');
    expect(classesOf(strip)).toContain('xl:flex');
    await fireEvent.click(getByRole('button', { name: 'Expand Things' }));
    expect(aside.getAttribute('data-open')).toBe('true');
    expect(classesOf(aside)).not.toContain('xl:w-8');
    expect(getByText('body')).toBeTruthy();
  });

  it('stacks in the page flow under the breakpoint and docks at its width above it', () => {
    const { aside, handle } = setup({ breakpoint: 'md', class: 'max-h-2/5' });
    const list = classesOf(aside);
    expect(list).toEqual(
      expect.arrayContaining([
        'flex',
        'border-b',
        'md:border-b-0',
        'md:w-(--panel-w)',
        'md:border-e',
        'max-h-2/5',
      ]),
    );
    expect(list).not.toContain('absolute');
    // No drag below the breakpoint: the handle is hidden until md.
    expect(classesOf(handle() as HTMLElement)).toContain('md:block');
  });

  it('leaves the main column the pane minimum, whatever width is stored', () => {
    localStorage.setItem(KEY, JSON.stringify({ width: 480, locked: false }));
    const { aside } = setup({ breakpoint: 'lg' });
    expect(classesOf(aside)).toContain('lg:max-w-[calc(100%_-_var(--panel-min))]');
    expect(aside.style.getPropertyValue('--panel-min')).toBe('200px');
  });

  it('hides under the breakpoint when asked to', () => {
    const { aside } = setup({ breakpoint: 'lg', below: 'hidden', side: 'end' });
    expect(classesOf(aside)).toEqual(expect.arrayContaining(['hidden', 'lg:flex', 'lg:border-s']));
  });

  it('keeps the caller-supplied meta beside the label', () => {
    const { getByRole, getByText } = setup({ meta: count });
    const heading = getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Things');
    expect(heading.parentElement?.contains(getByText('12'))).toBe(true);
  });
});

describe('SplitPane in a right-to-left page', () => {
  afterEach(() => document.documentElement.removeAttribute('dir'));

  it('moves the edge the way the arrow points, which narrows a start pane on ArrowRight', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const getComputed = window.getComputedStyle;
    const spy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((el, pseudo) =>
        Object.assign(getComputed(el, pseudo), { direction: 'rtl' }),
      );
    try {
      const { handle, widthOf } = setup({ side: 'start' });
      const h = handle() as HTMLElement;
      await fireEvent.keyDown(h, { key: 'ArrowRight' });
      expect(widthOf()).toBe('236px');
      await pointer(h, 'pointerdown', { button: 0, clientX: 500 });
      await pointer(h, 'pointermove', { clientX: 440 });
      expect(widthOf()).toBe('296px');
    } finally {
      spy.mockRestore();
    }
  });

  it('sits a closed start overlay off the start edge, which is the right one', () => {
    expect(classesOf(setup({ below: 'overlay' }).aside)).toEqual(
      expect.arrayContaining(['-translate-x-full', 'rtl:translate-x-full', 'start-0', 'border-e']),
    );
  });
});

describe('SplitPane as an overlay', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A viewport under every breakpoint or at all of them, which can be resized. */
  function viewport(wide: boolean) {
    const listeners = new Set<() => void>();
    let now = wide;
    vi.stubGlobal('matchMedia', (media: string) => ({
      media,
      get matches() {
        return media.startsWith('(min-width') && now;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    return {
      async resize(next: boolean) {
        now = next;
        for (const fn of listeners) fn();
        await tick();
      },
    };
  }

  it('sits closed off its own edge, transparent and invisible, until the page asks for it', () => {
    expect(classesOf(setup({ below: 'overlay' }).aside)).toEqual(
      expect.arrayContaining([
        'absolute',
        'max-xl:z-dropdown',
        'invisible',
        'opacity-0',
        '-translate-x-full',
      ]),
    );
    cleanup();
    expect(classesOf(setup({ below: 'overlay', side: 'end' }).aside)).toEqual(
      expect.arrayContaining(['invisible', 'opacity-0', 'translate-x-full', 'end-0']),
    );
  });

  it('opens in place, with nothing hiding it or holding it off its edge', () => {
    const open = classesOf(setup({ below: 'overlay', overlay: true }).aside);
    expect(open).toContain('absolute');
    for (const shut of ['invisible', 'opacity-0', '-translate-x-full', 'translate-x-full'])
      expect(open).not.toContain(shut);
  });

  it('enters on the slow rung and leaves one rung faster', async () => {
    const { aside, rerender } = setup({ below: 'overlay' });
    // Visibility is in the exit's list, so the panel stays visible until it has slid out.
    expect(classesOf(aside)).toEqual(
      expect.arrayContaining([
        'transition-[translate,opacity,visibility]',
        'duration-base',
        'ease-exit',
      ]),
    );
    await rerender({ overlay: true });
    // It is not in the entrance's, so a field inside can take focus on the first frame.
    expect(classesOf(aside)).toEqual(
      expect.arrayContaining(['transition-[translate,opacity]', 'duration-slow', 'ease-enter']),
    );
    expect(classesOf(aside)).not.toContain('duration-base');
    expect(classesOf(aside)).not.toContain('ease-exit');
  });

  it('docks at the breakpoint with nothing moving or transitioning, open or closed', () => {
    for (const overlay of [false, true]) {
      expect(classesOf(setup({ below: 'overlay', overlay }).aside)).toEqual(
        expect.arrayContaining([
          'max-xl:z-dropdown',
          'xl:static',
          'xl:visible',
          'xl:translate-none',
          'xl:opacity-100',
          'xl:transition-none',
        ]),
      );
      cleanup();
    }
  });

  it('is inert while closed under the breakpoint, and never at it', async () => {
    const screen = viewport(false);
    const { aside, rerender } = setup({ below: 'overlay' });
    expect(aside.inert).toBe(true);
    await rerender({ overlay: true });
    expect(aside.inert).toBe(false);
    await rerender({ overlay: false });
    expect(aside.inert).toBe(true);
    await screen.resize(true);
    expect(aside.inert).toBe(false);
  });

  it('keeps what the reader typed through a close, a reopen and the breakpoint', async () => {
    const screen = viewport(false);
    const field = createRawSnippet(() => ({ render: () => '<input aria-label="Filter" />' }));
    const { getByTestId, getByLabelText, rerender } = render(SplitPane, {
      props: {
        storageKey: KEY,
        label: 'Things',
        side: 'start',
        ...BOUNDS,
        below: 'overlay',
        overlay: true,
        children: field,
      },
    });
    const aside = getByTestId(`aside-${KEY}`);
    const input = getByLabelText('Filter') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'http.req' } });

    await rerender({ overlay: false });
    await rerender({ overlay: true });
    await screen.resize(true);
    await screen.resize(false);

    expect(getByTestId(`aside-${KEY}`)).toBe(aside);
    expect(getByLabelText('Filter')).toBe(input);
    expect(input.value).toBe('http.req');
  });
});
